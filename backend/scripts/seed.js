// =====================================================================
// Initialisation des référentiels + données de DÉMONSTRATION (fictives).
//   npm run db:seed                 -> référentiels + comptes + 12 450 militants fictifs
//   npm run db:seed -- --referentiels-seulement   (PRODUCTION : aucun militant fictif)
//   npm run db:seed -- --militants=50000          (test de charge, CDC §10)
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pool } from '../src/db.js';
import { colonnesTelephone } from '../src/crypto.js';
import { SOURCES, MOTIFS_DESACTIVATION } from '../../shared/referentiel.js';
import { construireTerritoires, construireResponsables, construireUtilisateurs, construireMilitants } from '../../shared/generator.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const refSeulement = !!args['referentiels-seulement'];
const nbMilitants = Number(args.militants || 12450);
const prod = process.env.NODE_ENV === 'production';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const geo = JSON.parse(fs.readFileSync(path.join(racine, 'shared/geo/guediawaye.json'), 'utf8'));
const terr = construireTerritoires(geo);

const client = await pool.connect();
const t0 = Date.now();
try {
  await client.query('BEGIN');
  const deja = (await client.query('SELECT count(*)::int AS n FROM communes')).rows[0].n;
  if (deja && !args.force) {
    console.error('La base contient déjà des données. Relancez avec --force pour TOUT réinitialiser (destructif).');
    process.exit(1);
  }
  if (deja) {
    // Le journal d'audit est protégé : on le vide en désactivant temporairement son trigger
    await client.query('ALTER TABLE journal_audit DISABLE TRIGGER journal_immuable');
    await client.query(`TRUNCATE journal_audit, militants_historique, doublons_ecartes, militants, imports, sessions,
      utilisateur_perimetres, utilisateurs, responsable_perimetres, responsables, secteurs, quartiers, communes,
      sources_collecte, motifs_desactivation RESTART IDENTITY CASCADE`);
    await client.query('ALTER TABLE journal_audit ENABLE TRIGGER journal_immuable');
    await client.query("SELECT setval('militant_numero_seq', 1, false)");
  }

  // --- Référentiels ---
  for (const s of SOURCES) await client.query('INSERT INTO sources_collecte (code, libelle) VALUES ($1,$2)', [s.code, s.libelle]);
  for (const m of MOTIFS_DESACTIVATION) await client.query('INSERT INTO motifs_desactivation (code, libelle) VALUES ($1,$2)', [m.code, m.libelle]);
  const communeId = {}, quartierId = {}, secteurId = {};
  for (const c of terr.communes) {
    const { rows } = await client.query(
      `INSERT INTO communes (code, nom, nom_court, objectif_militants, geom)
       VALUES ($1,$2,$3,$4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)) RETURNING id`,
      [c.code, c.nom, c.court, c.objectif, JSON.stringify(c.geometry)]);
    communeId[c.code] = rows[0].id;
  }
  for (const q of terr.quartiers) {
    const { rows } = await client.query(
      `INSERT INTO quartiers (commune_id, code, nom, objectif_militants, geom)
       VALUES ($1,$2,$3,$4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)) RETURNING id`,
      [communeId[q.commune], q.code, q.nom, q.objectif, JSON.stringify(q.geometry)]);
    quartierId[q.code] = rows[0].id;
  }
  for (const s of terr.secteurs) {
    const { rows } = await client.query('INSERT INTO secteurs (quartier_id, code, nom) VALUES ($1,$2,$3) RETURNING id', [quartierId[s.quartier], s.code, s.nom]);
    secteurId[s.code] = rows[0].id;
  }
  console.log(`✓ ${terr.communes.length} communes, ${terr.quartiers.length} quartiers, ${terr.secteurs.length} secteurs`);

  // --- Compte administrateur (toujours) ---
  const motDePasseDemo = process.env.SEED_PASSWORD || 'Kiiraay@2027!';
  const motDePasseAdmin = prod ? crypto.randomBytes(12).toString('base64url') + 'K9!' : motDePasseDemo;
  const hashDemo = await bcrypt.hash(motDePasseDemo, 12);

  if (refSeulement) {
    await client.query(
      `INSERT INTO utilisateurs (identifiant, nom, prenoms, role, mot_de_passe_hash, doit_changer_mdp) VALUES ('admin','Administrateur','Central','ADMIN',$1,true)`,
      [await bcrypt.hash(motDePasseAdmin, 12)]);
    await client.query('COMMIT');
    console.log(`✓ Compte « admin » créé. Mot de passe initial (à changer à la 1re connexion) : ${motDePasseAdmin}`);
    process.exit(0);
  }
  if (prod) throw new Error('Refus de charger des militants fictifs en production (utilisez --referentiels-seulement)');

  // --- Chaîne de responsabilité ---
  const responsables = construireResponsables(terr);
  const respId = {};
  for (const r of responsables) {
    const t = colonnesTelephone(r.telephone);
    const { rows } = await client.query(
      `INSERT INTO responsables (fonction, nom, prenoms, sexe, telephone_chiffre, telephone_index, parent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [r.fonction, r.nom.toUpperCase(), r.prenoms, r.sexe, t.chiffre, t.index, r.parent ? respId[r.parent] : null]);
    respId[r.key] = rows[0].id;
    for (const p of r.perimetres) {
      await client.query('INSERT INTO responsable_perimetres (responsable_id, commune_id, quartier_id) VALUES ($1,$2,$3)',
        [rows[0].id, communeId[p.commune], p.quartier ? quartierId[p.quartier] : null]);
    }
  }
  console.log(`✓ ${responsables.length} responsables`);

  // --- Comptes de démonstration ---
  const userId = {};
  for (const u of construireUtilisateurs(responsables)) {
    const { rows } = await client.query(
      `INSERT INTO utilisateurs (identifiant, nom, prenoms, role, responsable_id, mot_de_passe_hash, doit_changer_mdp)
       VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING id`,
      [u.identifiant, u.nom.toUpperCase(), u.prenoms, u.role, u.responsable ? respId[u.responsable] : null, hashDemo]);
    userId[u.identifiant] = rows[0].id;
    for (const p of u.perimetres) {
      await client.query('INSERT INTO utilisateur_perimetres (utilisateur_id, commune_id, quartier_id) VALUES ($1,$2,$3)',
        [rows[0].id, communeId[p.commune], p.quartier ? quartierId[p.quartier] : null]);
    }
  }
  console.log(`✓ ${Object.keys(userId).length} comptes de démonstration (mot de passe : ${motDePasseDemo})`);

  // --- Militants fictifs ---
  await client.query('ALTER TABLE militants DISABLE TRIGGER militants_historique');
  const militants = construireMilitants(terr, responsables, { total: nbMilitants });
  militants.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const COLS = ['nom', 'prenoms', 'sexe', 'date_naissance', 'telephone_chiffre', 'telephone_index', 'telephone_suffixe', 'telephone2_chiffre', 'telephone2_index',
    'email', 'adresse', 'repere', 'commune_id', 'quartier_id', 'secteur_id', 'latitude', 'longitude', 'coordonnateur_id', 'superviseur_id', 'commissaire_id',
    'statut', 'date_enregistrement', 'motif_desactivation', 'source', 'observations', 'information_personne', 'information_date',
    'created_by', 'updated_by', 'valide_par', 'valide_le', 'created_at', 'updated_at'];
  const admin = userId.admin, saisie = userId.saisie;
  for (let i = 0; i < militants.length; i += 500) {
    const lot = militants.slice(i, i + 500);
    const values = [], params = [];
    for (const m of lot) {
      const t1 = colonnesTelephone(m.telephone), t2 = colonnesTelephone(m.telephone2);
      const auteur = m.statut === 'EN_ATTENTE' ? saisie : admin;
      const row = [m.nom.toUpperCase(), m.prenoms, m.sexe, m.date_naissance, t1.chiffre, t1.index, t1.suffixe, t2.chiffre, t2.index,
        m.email, m.adresse, m.repere, communeId[m.commune], quartierId[m.quartier], m.secteur ? secteurId[m.secteur] : null, m.lat, m.lon,
        m.coordonnateur ? respId[m.coordonnateur] : null, m.superviseur ? respId[m.superviseur] : null, m.commissaire ? respId[m.commissaire] : null,
        m.statut, m.created_at.slice(0, 10), m.motif_desactivation, m.source, m.observations, m.information_personne,
        m.information_personne ? m.created_at.slice(0, 10) : null, auteur, auteur,
        m.statut === 'ACTIF' ? admin : null, m.statut === 'ACTIF' ? m.created_at : null, m.created_at, m.updated_at];
      values.push(`(${row.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`);
    }
    await client.query(`INSERT INTO militants (${COLS.join(',')}) VALUES ${values.join(',')}`, params);
  }
  // Historique initial (création) en une seule requête
  await client.query(`INSERT INTO militants_historique (militant_id, operation, utilisateur_id, modifie_le)
                      SELECT id, 'CREATION', created_by, created_at FROM militants`);
  await client.query('ALTER TABLE militants ENABLE TRIGGER militants_historique');
  await client.query('COMMIT');
  console.log(`✓ ${militants.length} militants fictifs en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await client.query('ANALYZE');
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Échec du seed :', e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
