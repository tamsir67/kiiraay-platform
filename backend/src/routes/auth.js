import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { authentifier, signerAcces, chargerUtilisateur } from '../auth.js';
import { journaliser } from '../audit.js';
import { jetonAleatoire, sha256 } from '../crypto.js';
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

// Hash factice : temps de réponse identique que le compte existe ou non
const HASH_FACTICE = bcrypt.hashSync('compte-inexistant-kiiraay', 12);

export const politiqueMotDePasse = z.string()
  .min(12, 'Au moins 12 caractères')
  .max(128)
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/\d/, 'Au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial');

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
