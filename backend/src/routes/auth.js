import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rootCertificates } from 'node:tls';
import { z } from 'zod';
import { config } from '../config.js';
import { query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { authentifier, signerAcces, chargerUtilisateur } from '../auth.js';
import { journaliser } from '../audit.js';
import { colonnesTelephone, jetonAleatoire, sha256 } from '../crypto.js';
import { normaliserTelephone } from '../../../shared/referentiel.js';
import { PERMISSIONS } from '../../../shared/referentiel.js';

export const router = Router();

const COOKIE = 'kry_refresh';
const cookieOpts = () => ({
  httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api/auth',
  maxAge: config.refreshTokenDays * 86400000,
});

const limiteur = rateLimit({
  windowMs: 15 * 60 * 1000, limit: Number(process.env.LOGIN_RATE_LIMIT || 20), standardHeaders: 'draft-7', legacyHeaders: false,
  message: { erreur: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

const limiteurRecuperation = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { erreur: 'Trop de demandes. Réessayez dans quelques minutes.' },
});

const transportMail = config.smtpHost && config.smtpFrom
  ? nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
      tls: config.smtpCaCertFile
        ? { ca: [...rootCertificates, readFileSync(config.smtpCaCertFile)] }
        : undefined,
    })
  : null;

// Hash factice : temps de réponse identique que le compte existe ou non
const HASH_FACTICE = bcrypt.hashSync('compte-inexistant-kiiraay', 12);

export const politiqueMotDePasse = z.string()
  .min(12, 'Au moins 12 caractères')
  .max(128)
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/\d/, 'Au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial');

router.post('/inscription', limiteur, asyncH(async (req, res) => {
  const d = z.object({
    identifiant: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,60}$/),
    nom: z.string().trim().min(1).max(80),
    prenoms: z.string().trim().min(1).max(120),
    numero: z.string().trim().toUpperCase().min(1).max(20),
    date_naissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => {
      const date = new Date(`${d}T00:00:00.000Z`);
      return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === d;
    }, 'Date invalide'),
    telephone: z.string().trim().max(30).refine((t) => normaliserTelephone(t), 'Numéro de téléphone invalide'),
    email: z.string().trim().email().max(160),
    motDePasse: politiqueMotDePasse,
  }).parse(req.body);
  const tel = colonnesTelephone(d.telephone);
  const { rows } = await query(
    `SELECT m.id FROM militants m
     WHERE m.numero = $1 AND m.date_naissance = $2::date AND m.telephone_index = $3
       AND m.identite_norm = f_norm($4 || ' ' || $5) AND m.statut = 'ACTIF'`,
    [d.numero, d.date_naissance, tel.index, d.nom, d.prenoms]);
  if (!rows[0]) throw new HttpError(400, 'Les informations ne correspondent pas à une fiche militante active');
  try {
    const { rows: comptes } = await query(
      `INSERT INTO utilisateurs (identifiant, email, nom, prenoms, role, militant_id, mot_de_passe_hash, doit_changer_mdp, actif)
       VALUES ($1,$2,$3,$4,'MILITANT',$5,$6,false,false) RETURNING id`,
      [d.identifiant, d.email || null, d.nom, d.prenoms, rows[0].id, await bcrypt.hash(d.motDePasse, 12)]);
    await journaliser(req, 'INSCRIPTION_MILITANT', { entite: 'utilisateur', entiteId: comptes[0].id });
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Une demande de compte existe déjà pour cette fiche ou cet identifiant');
    throw e;
  }
  res.status(202).json({ message: 'Demande transmise. L’administrateur doit activer le compte avant la première connexion.' });
}));

router.post('/mot-de-passe-oublie', limiteurRecuperation, asyncH(async (req, res) => {
  const { identifiant, email } = z.object({
    identifiant: z.string().trim().toLowerCase().min(3).max(60),
    email: z.string().trim().toLowerCase().email().max(160),
  }).parse(req.body);
  if (!transportMail) throw new HttpError(503, 'La récupération par email n’est pas configurée sur cette plateforme');

  const message = 'Si un compte militant actif correspond à ces informations, un code a été envoyé à son adresse email.';
  const { rows } = await query(
    `SELECT id, email FROM utilisateurs
     WHERE identifiant = $1 AND lower(email) = $2 AND role = 'MILITANT' AND actif`, [identifiant, email]);
  if (!rows[0]) return res.status(202).json({ message });

  const utilisateurId = rows[0].id;
  const { rows: recent } = await query(
    `SELECT id FROM codes_reinitialisation WHERE utilisateur_id = $1
     AND cree_le > now() - interval '60 seconds' AND utilise_le IS NULL`, [utilisateurId]);
  if (recent[0]) return res.status(202).json({ message });

  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const codeHash = sha256(Buffer.from(`${utilisateurId}:${code}:${config.jwtSecret}`));
  await query('UPDATE codes_reinitialisation SET utilise_le = now() WHERE utilisateur_id = $1 AND utilise_le IS NULL', [utilisateurId]);
  const { rows: codes } = await query(
    `INSERT INTO codes_reinitialisation (utilisateur_id, code_hash, expire_le)
     VALUES ($1,$2,now() + interval '10 minutes') RETURNING id`, [utilisateurId, codeHash]);
  try {
    await transportMail.sendMail({
      from: config.smtpFrom,
      to: rows[0].email,
      subject: 'KIIRAAY — Code de réinitialisation',
      text: `Votre code de réinitialisation KIIRAAY est ${code}. Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    });
  } catch (error) {
    await query('UPDATE codes_reinitialisation SET utilise_le = now() WHERE id = $1', [codes[0].id]);
    throw error;
  }
  res.status(202).json({ message });
}));

router.post('/reinitialiser-mot-de-passe', limiteurRecuperation, asyncH(async (req, res) => {
  const d = z.object({
    identifiant: z.string().trim().toLowerCase().min(3).max(60),
    email: z.string().trim().toLowerCase().email().max(160),
    code: z.string().regex(/^\d{6}$/),
    nouveau: politiqueMotDePasse,
  }).parse(req.body);
  const reinitialise = await transaction(null, async (client) => {
    const { rows } = await client.query(
      `SELECT c.id, c.utilisateur_id, c.code_hash
       FROM codes_reinitialisation c JOIN utilisateurs u ON u.id = c.utilisateur_id
       WHERE u.identifiant = $1 AND lower(u.email) = $2 AND u.role = 'MILITANT' AND u.actif
         AND c.utilise_le IS NULL AND c.expire_le > now() AND c.tentatives < 5
       ORDER BY c.cree_le DESC LIMIT 1 FOR UPDATE OF c`, [d.identifiant, d.email]);
    if (!rows[0]) return null;
    const codeHash = sha256(Buffer.from(`${rows[0].utilisateur_id}:${d.code}:${config.jwtSecret}`));
    if (!timingSafeEqual(rows[0].code_hash, codeHash)) {
      await client.query(
        `UPDATE codes_reinitialisation SET tentatives = tentatives + 1,
           utilise_le = CASE WHEN tentatives + 1 >= 5 THEN now() ELSE utilise_le END WHERE id = $1`, [rows[0].id]);
      return null;
    }
    await client.query(
      `UPDATE utilisateurs SET mot_de_passe_hash = $2, doit_changer_mdp = false,
         echecs_connexion = 0, verrouille_jusqua = NULL, updated_at = now() WHERE id = $1`,
      [rows[0].utilisateur_id, await bcrypt.hash(d.nouveau, 12)]);
    await client.query('UPDATE sessions SET revoque_le = now() WHERE utilisateur_id = $1 AND revoque_le IS NULL', [rows[0].utilisateur_id]);
    await client.query('UPDATE codes_reinitialisation SET utilise_le = now() WHERE id = $1', [rows[0].id]);
    return rows[0].utilisateur_id;
  });
  if (!reinitialise) throw new HttpError(400, 'Code invalide, expiré ou déjà utilisé');
  await journaliser(req, 'REINITIALISATION_MDP_MILITANT', { entite: 'utilisateur', entiteId: reinitialise });
  res.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
}));

async function ouvrirSession(req, res, user) {
  const jeton = jetonAleatoire();
  await query(
    `INSERT INTO sessions (utilisateur_id, jeton_hash, ip, user_agent, expire_le)
     VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))`,
    [user.id, sha256(jeton), req.ip || null, req.get('user-agent')?.slice(0, 300) || null, config.refreshTokenDays]);
  res.cookie(COOKIE, jeton, cookieOpts());
  const complet = await chargerUtilisateur(user.id);
  return {
    accessToken: signerAcces(user),
    utilisateur: { ...complet, permissions: PERMISSIONS[complet.role] },
  };
}

router.post('/login', limiteur, asyncH(async (req, res) => {
  const { identifiant, motDePasse } = z.object({
    identifiant: z.string().trim().toLowerCase().min(1).max(60),
    motDePasse: z.string().min(1).max(128),
  }).parse(req.body);

  const { rows } = await query('SELECT * FROM utilisateurs WHERE identifiant = $1', [identifiant]);
  const u = rows[0];
  const ok = await bcrypt.compare(motDePasse, u?.mot_de_passe_hash || HASH_FACTICE);

  if (u && u.verrouille_jusqua && new Date(u.verrouille_jusqua) > new Date()) {
    await journaliser(req, 'CONNEXION_REFUSEE', { succes: false, user: u, details: { motif: 'compte verrouillé' } });
    throw new HttpError(423, 'Compte temporairement verrouillé suite à plusieurs échecs. Réessayez plus tard.');
  }
  if (!u || !ok || !u.actif) {
    if (u) {
      const echecs = u.echecs_connexion + 1;
      const verrou = echecs >= config.maxLoginAttempts;
      await query(
        `UPDATE utilisateurs SET echecs_connexion = $2,
           verrouille_jusqua = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE verrouille_jusqua END
         WHERE id = $1`, [u.id, verrou ? 0 : echecs, verrou, config.lockMinutes]);
    }
    await journaliser(req, 'CONNEXION_ECHEC', { succes: false, user: u || null, details: { identifiant } });
    throw new HttpError(401, 'Identifiant ou mot de passe incorrect');
  }
  await query('UPDATE utilisateurs SET echecs_connexion = 0, verrouille_jusqua = NULL, derniere_connexion = now() WHERE id = $1', [u.id]);
  await journaliser(req, 'CONNEXION', { user: u });
  res.json(await ouvrirSession(req, res, u));
}));

router.post('/refresh', asyncH(async (req, res) => {
  const jeton = req.cookies?.[COOKIE];
  if (!jeton) throw new HttpError(401, 'Session absente');
  const { rows } = await query(
    `UPDATE sessions SET revoque_le = now()
     WHERE jeton_hash = $1 AND revoque_le IS NULL AND expire_le > now()
     RETURNING utilisateur_id`, [sha256(jeton)]);
  if (!rows[0]) {
    res.clearCookie(COOKIE, { path: '/api/auth' });
    throw new HttpError(401, 'Session expirée');
  }
  const u = await chargerUtilisateur(rows[0].utilisateur_id);
  if (!u?.actif) throw new HttpError(401, 'Compte inactif');
  res.json(await ouvrirSession(req, res, u)); // rotation du jeton
}));

router.post('/logout', asyncH(async (req, res) => {
  const jeton = req.cookies?.[COOKIE];
  if (jeton) await query('UPDATE sessions SET revoque_le = now() WHERE jeton_hash = $1', [sha256(jeton)]);
  res.clearCookie(COOKIE, { path: '/api/auth' });
  res.status(204).end();
}));

router.get('/me', authentifier, asyncH(async (req, res) => {
  res.json({ ...req.user, permissions: PERMISSIONS[req.user.role] });
}));

router.post('/mot-de-passe', authentifier, limiteur, asyncH(async (req, res) => {
  const { actuel, nouveau } = z.object({ actuel: z.string().min(1), nouveau: politiqueMotDePasse }).parse(req.body);
  const { rows } = await query('SELECT mot_de_passe_hash FROM utilisateurs WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(actuel, rows[0].mot_de_passe_hash))) throw new HttpError(400, 'Mot de passe actuel incorrect');
  if (actuel === nouveau) throw new HttpError(400, 'Le nouveau mot de passe doit être différent');
  await query('UPDATE utilisateurs SET mot_de_passe_hash = $2, doit_changer_mdp = false, updated_at = now() WHERE id = $1',
    [req.user.id, await bcrypt.hash(nouveau, 12)]);
  // Révoque toutes les autres sessions
  await query('UPDATE sessions SET revoque_le = now() WHERE utilisateur_id = $1 AND revoque_le IS NULL', [req.user.id]);
  await journaliser(req, 'CHANGEMENT_MOT_DE_PASSE', { entite: 'utilisateur', entiteId: req.user.id });
  res.json(await ouvrirSession(req, res, req.user));
}));
