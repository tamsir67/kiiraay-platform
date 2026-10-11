// Import Excel/CSV (avec simulation et rapport d'erreurs) et exports sécurisés (CDC §5.5)
import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import crypto from 'node:crypto';
import { query, transaction } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger, verifierAccesQuartier } from '../auth.js';
import { filtresMilitants, schemaFiltres } from '../filtres.js';
import { colonnesTelephone, dechiffrer } from '../crypto.js';
import { journaliser } from '../audit.js';
import { config } from '../config.js';
import { schemaMilitant } from './militants.js';
import { can, normaliserTelephone, normaliserTexte, formaterTelephone, STATUTS } from '../../../shared/referentiel.js';

export const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /\.(xlsx|csv)$/i.test(file.originalname)),
});

export const COLONNES_IMPORT = [
  ['nom', 'Nom', true], ['prenoms', 'Prénom(s)', true], ['sexe', 'Sexe (M/F)', true],
  ['date_naissance', 'Date de naissance (JJ/MM/AAAA)', false], ['telephone', 'Téléphone', false], ['telephone2', 'Téléphone 2', false],
  ['email', 'Email', false], ['adresse', 'Adresse', false], ['repere', 'Repère', false],
  ['commune', 'Commune', true], ['quartier', 'Quartier', true], ['secteur', 'Secteur', false],
  ['latitude', 'Latitude', false], ['longitude', 'Longitude', false], ['source', 'Source (code)', false],
  ['observations', 'Observations', false], ['information_personne', 'Personne informée (oui/non)', false],
  ['date_enregistrement', "Date d'enregistrement (JJ/MM/AAAA)", false],
];

// --------------------------- Modèle d'import ---------------------------
router.get('/imports/modele.xlsx', exiger('import'), asyncH(async (_req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KIIRAAY';
  const ws = wb.addWorksheet('Militants');
  ws.columns = COLONNES_IMPORT.map(([key, header]) => ({ header, key, width: Math.max(14, header.length + 2) }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14365E' } };
  ws.addRow({ nom: 'DIOP', prenoms: 'Awa', sexe: 'F', date_naissance: '12/04/1992', telephone: '77 123 45 67', adresse: 'Villa 12', repere: 'Près de la mosquée',
    commune: 'Golf Sud', quartier: 'Hamo 1', source: 'TERRAIN', information_personne: 'oui', date_enregistrement: '05/10/2026' });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const ref = wb.addWorksheet('Référentiel');
  ref.columns = [{ header: 'Commune', key: 'c', width: 26 }, { header: 'Quartier', key: 'q', width: 30 }, { header: 'Secteurs', key: 's', width: 30 }];
  ref.getRow(1).font = { bold: true };
  const { rows } = await query(`SELECT c.nom AS c, q.nom AS q, (SELECT string_agg(s.nom, ', ' ORDER BY s.nom) FROM secteurs s WHERE s.quartier_id = q.id) AS s
                                FROM quartiers q JOIN communes c ON c.id = q.commune_id WHERE q.actif ORDER BY 1, 2`);
  rows.forEach((r) => ref.addRow(r));
  const srcs = wb.addWorksheet('Sources');
  srcs.columns = [{ header: 'Code', key: 'code', width: 14 }, { header: 'Libellé', key: 'libelle', width: 40 }];
  (await query('SELECT code, libelle FROM sources_collecte WHERE actif ORDER BY code')).rows.forEach((r) => srcs.addRow(r));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="modele_import_militants_kiiraay.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}));

// --------------------------- Lecture fichier ---------------------------
const ALIAS = Object.fromEntries(COLONNES_IMPORT.flatMap(([k, h]) => [[normaliserTexte(k), k], [normaliserTexte(h), k], [normaliserTexte(h.replace(/\s*\(.*\)$/, '')), k]]));
Object.assign(ALIAS, { prenom: 'prenoms', 'prenom s': 'prenoms', tel: 'telephone', 'telephone 1': 'telephone', lat: 'latitude', lon: 'longitude', lng: 'longitude', 'date de naissance': 'date_naissance' });

function valeurCellule(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') return v.text ?? v.result ?? (v.richText ? v.richText.map((t) => t.text).join('') : '');
  return String(v);
}

async function lireFichier(file) {
  let lignes;
  if (/\.xlsx$/i.test(file.originalname)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new HttpError(400, 'Classeur vide');
    lignes = [];
    ws.eachRow({ includeEmpty: false }, (row) => lignes.push(row.values.slice(1).map(valeurCellule)));
  } else {
    const txt = file.buffer.toString('utf8').replace(/^﻿/, '');
    const delim = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    lignes = parseCsv(txt, { delimiter: delim, relax_column_count: true, skip_empty_lines: true, trim: true });
  }
  if (lignes.length < 2) throw new HttpError(400, 'Le fichier ne contient aucune ligne de données');
  const entetes = lignes[0].map((h) => ALIAS[normaliserTexte(h)] || null);
  const manquantes = COLONNES_IMPORT.filter(([k, , req]) => req && !entetes.includes(k)).map(([, h]) => h);
  if (manquantes.length) throw new HttpError(400, `Colonnes obligatoires absentes : ${manquantes.join(', ')}`);
  if (lignes.length - 1 > config.importMaxRows) throw new HttpError(400, `Maximum ${config.importMaxRows} lignes par import`);
  return lignes.slice(1).map((cells, i) => {
    const o = { _ligne: i + 2 };
    entetes.forEach((k, j) => { if (k) o[k] = String(cells[j] ?? '').trim(); });
    return o;
  }).filter((o) => Object.entries(o).some(([k, v]) => k !== '_ligne' && v));
}

function dateIso(v) {
  if (!v) return null;
  let m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return 'invalide';
}

// --------------------------- Analyse / import ---------------------------
async function analyser(lignes, user) {
  const { rows: qs } = await query(`SELECT q.id, q.nom, q.code, q.commune_id, c.nom AS commune, c.code AS commune_code
                                    FROM quartiers q JOIN communes c ON c.id = q.commune_id WHERE q.actif`);
  const { rows: ss } = await query('SELECT id, nom, code, quartier_id FROM secteurs WHERE actif');
  const sources = new Set((await query('SELECT code FROM sources_collecte WHERE actif')).rows.map((r) => r.code));
  const parCommune = {};
  for (const q of qs) {
    for (const ck of [normaliserTexte(q.commune), normaliserTexte(q.commune_code)]) {
      parCommune[ck] = parCommune[ck] || {};
      parCommune[ck][normaliserTexte(q.nom)] = q;
      parCommune[ck][normaliserTexte(q.code)] = q;
    }
  }
  const vus = new Map();
  const rapport = [];
  const valides = [];
  for (const l of lignes) {
    const erreurs = [];
    const q = parCommune[normaliserTexte(l.commune)]?.[normaliserTexte(l.quartier)];
    if (!parCommune[normaliserTexte(l.commune)]) erreurs.push(`Commune inconnue : « ${l.commune || ''} »`);
    else if (!q) erreurs.push(`Quartier inconnu dans ${l.commune} : « ${l.quartier || ''} »`);
    else if (!(await verifierAccesQuartier(user, q.id))) erreurs.push('Quartier hors de votre périmètre');
    const secteur = q && l.secteur ? ss.find((s) => s.quartier_id === q.id && [normaliserTexte(s.nom), normaliserTexte(s.code)].includes(normaliserTexte(l.secteur))) : null;
    if (l.secteur && q && !secteur) erreurs.push(`Secteur inconnu : « ${l.secteur} »`);
    const source = (l.source || 'IMPORT').toUpperCase();
    if (!sources.has(source)) erreurs.push(`Source inconnue : « ${l.source} »`);
    const dn = dateIso(l.date_naissance), de = dateIso(l.date_enregistrement);
    if (dn === 'invalide') erreurs.push('Date de naissance invalide');
    if (de === 'invalide') erreurs.push("Date d'enregistrement invalide");
    const candidat = {
      nom: l.nom, prenoms: l.prenoms, sexe: (l.sexe || '').toUpperCase().replace(/^H(OMME)?$/, 'M').replace(/^FEMME$/, 'F').slice(0, 1),
      date_naissance: dn === 'invalide' ? null : dn, telephone: l.telephone || null, telephone2: l.telephone2 || null,
      email: l.email || null, adresse: l.adresse || null, repere: l.repere || null,
      quartier_id: q?.id ?? 0, secteur_id: secteur?.id ?? null,
      latitude: l.latitude ? Number(String(l.latitude).replace(',', '.')) : null,
      longitude: l.longitude ? Number(String(l.longitude).replace(',', '.')) : null,
      source, observations: l.observations || null,
      information_personne: /^(oui|o|yes|y|1|vrai|true|x)$/i.test(l.information_personne || ''),
      date_enregistrement: de === 'invalide' ? null : de,
    };
    const v = schemaMilitant.safeParse(candidat);
    if (!v.success) for (const i of v.error.issues) if (!(i.path[0] === 'quartier_id' && !q)) erreurs.push(`${i.path.join('.') || 'fiche'} : ${i.message}`);
    // Doublons internes au fichier
    const tel = normaliserTelephone(candidat.telephone);
    const cleId = `${normaliserTexte(candidat.nom + ' ' + candidat.prenoms)}|${q?.id}`;
    let doublon = null;
    for (const k of [tel && `t:${tel}`, `i:${cleId}`].filter(Boolean)) {
      if (vus.has(k)) doublon = `Doublon de la ligne ${vus.get(k)} du fichier`;
      else vus.set(k, l._ligne);
    }
    const entree = { ligne: l._ligne, nom: `${l.prenoms || ''} ${l.nom || ''}`.trim(), erreurs, doublon };
    rapport.push(entree);
    if (!erreurs.length) valides.push({ entree, d: { ...v.data, commune_id: q.commune_id }, tel, cleId });
  }
  // Doublons avec la base (téléphone ou identité exacte dans le même quartier)
  if (valides.length) {
    const idx = valides.map((x) => colonnesTelephone(x.tel).index).filter(Boolean);
    const { rows: telsBase } = await query(
      `SELECT encode(telephone_index, 'hex') AS h, numero FROM militants WHERE statut <> 'INACTIF' AND telephone_index = ANY($1::bytea[])`, [idx]);
    const telMap = new Map(telsBase.map((r) => [r.h, r.numero]));
    const { rows: idsBase } = await query(
      `SELECT identite_norm || '|' || quartier_id AS k, numero FROM militants WHERE statut <> 'INACTIF' AND (identite_norm, quartier_id) IN
         (SELECT f_norm(x.n), x.q FROM unnest($1::text[], $2::int[]) AS x(n, q))`,
      [valides.map((x) => `${x.d.nom} ${x.d.prenoms}`), valides.map((x) => x.d.quartier_id)]);
    const idMap = new Map(idsBase.map((r) => [r.k, r.numero]));
    for (const x of valides) {
      const h = x.tel ? colonnesTelephone(x.tel).index.toString('hex') : null;
      const kId = `${normaliserTexte(x.d.nom + ' ' + x.d.prenoms)}|${x.d.quartier_id}`;
      if (h && telMap.has(h)) x.entree.doublon = `Téléphone déjà enregistré (${telMap.get(h)})`;
      else if (idMap.has(kId)) x.entree.doublon = `Identité déjà enregistrée dans ce quartier (${idMap.get(kId)})`;
    }
  }
  return { rapport, valides };
}

router.post('/imports', exiger('import'), upload.single('fichier'), asyncH(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Fichier .xlsx ou .csv requis (champ « fichier »)');
  const simulation = req.query.simulation !== 'false';
  const inclureDoublons = req.query.inclure_doublons === 'true';
  const lignes = await lireFichier(req.file);
  const { rapport, valides } = await analyser(lignes, req.user);
  const aInserer = valides.filter((x) => inclureDoublons || !x.entree.doublon);
  const synthese = {
    fichier: req.file.originalname, lignes: rapport.length,
    valides: valides.length, rejetees: rapport.filter((r) => r.erreurs.length).length,
    doublons: rapport.filter((r) => r.doublon).length, a_inserer: aInserer.length, simulation,
  };
  if (simulation) {
    await journaliser(req, 'IMPORT_SIMULATION', { details: synthese });
    return res.json({ synthese, rapport: rapport.filter((r) => r.erreurs.length || r.doublon).slice(0, 1000) });
  }
  const statut = can(req.user.role, 'militants:valider') ? 'ACTIF' : 'EN_ATTENTE';
  const importId = await transaction(req.user, async (client) => {
    const { rows: [imp] } = await client.query(
      `INSERT INTO imports (utilisateur_id, fichier, empreinte_sha256, lignes_total, lignes_inserees, lignes_rejetees, doublons, rapport)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.user.id, req.file.originalname.slice(0, 255), crypto.createHash('sha256').update(req.file.buffer).digest('hex'),
       rapport.length, aInserer.length, synthese.rejetees, synthese.doublons,
       JSON.stringify(rapport.filter((r) => r.erreurs.length || r.doublon).slice(0, 2000))]);
    for (const x of aInserer) {
      const d = x.d;
      const t1 = colonnesTelephone(d.telephone), t2 = colonnesTelephone(d.telephone2);
      await client.query(`
        INSERT INTO militants (nom, prenoms, sexe, date_naissance, telephone_chiffre, telephone_index, telephone_suffixe,
          telephone2_chiffre, telephone2_index, email, adresse, repere, commune_id, quartier_id, secteur_id, latitude, longitude,
          coordonnateur_id, superviseur_id, commissaire_id, statut, date_enregistrement, source, observations,
          information_personne, information_date, import_id, created_by, updated_by, valide_par, valide_le)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
          (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id=r.id WHERE r.actif AND r.fonction='COORDONNATEUR' AND p.commune_id=$13 ORDER BY r.id LIMIT 1),
          (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id=r.id WHERE r.actif AND r.fonction='SUPERVISEUR' AND p.quartier_id=$14 ORDER BY r.id LIMIT 1),
          (SELECT r.id FROM responsables r JOIN responsable_perimetres p ON p.responsable_id=r.id WHERE r.actif AND r.fonction='COMMISSAIRE' AND p.quartier_id=$14 ORDER BY r.id LIMIT 1),
          $18::statut_militant, coalesce($19::date, current_date), $20, $21, $22, CASE WHEN $22 THEN current_date END, $23, $24::int, $24::int,
          CASE WHEN $18 = 'ACTIF' THEN $24::int END, CASE WHEN $18 = 'ACTIF' THEN now() END`,
      [d.nom.toUpperCase(), d.prenoms, d.sexe, d.date_naissance, t1.chiffre, t1.index, t1.suffixe, t2.chiffre, t2.index,
       d.email?.toLowerCase() || null, d.adresse, d.repere, d.commune_id, d.quartier_id, d.secteur_id, d.latitude ?? null, d.longitude ?? null,
       statut, d.date_enregistrement, d.source, d.observations, d.information_personne, imp.id, req.user.id]);
    }
    return imp.id;
  });
  await journaliser(req, 'IMPORT', { entite: 'import', entiteId: importId, details: synthese });
  res.status(201).json({ id: importId, synthese, rapport: rapport.filter((r) => r.erreurs.length || r.doublon).slice(0, 1000) });
}));

router.get('/imports', exiger('import'), asyncH(async (req, res) => {
  const { rows } = await query(`
    SELECT i.id, i.fichier, i.lignes_total, i.lignes_inserees, i.lignes_rejetees, i.doublons, i.created_at,
           (u.prenoms || ' ' || u.nom) AS auteur
    FROM imports i JOIN utilisateurs u ON u.id = i.utilisateur_id
    ${req.user.role === 'ADMIN' ? '' : 'WHERE i.utilisateur_id = $1'} ORDER BY i.id DESC LIMIT 50`,
  req.user.role === 'ADMIN' ? [] : [req.user.id]);
  res.json(rows);
}));

// --------------------------- Exports sécurisés ---------------------------
router.get('/exports/militants.:format(csv|xlsx)', exiger('export'), asyncH(async (req, res) => {
  const f = schemaFiltres.parse(req.query);
  const w = filtresMilitants(f, req.user, { statutParDefaut: 'TOUS' });
  const pii = can(req.user.role, 'export:pii');
  const { rows } = await query(`
    SELECT m.numero, m.nom, m.prenoms, m.sexe, m.date_naissance, date_part('year', age(m.date_naissance))::int AS age,
           m.telephone_chiffre, m.telephone_suffixe, m.email, m.adresse, m.repere, c.nom AS commune, q.nom AS quartier, s.nom AS secteur,
           m.latitude, m.longitude,
           (co.prenoms || ' ' || co.nom) AS coordonnateur, (su.prenoms || ' ' || su.nom) AS superviseur, (cm.prenoms || ' ' || cm.nom) AS commissaire,
           m.statut, m.date_enregistrement, m.source, m.information_personne, m.updated_at
    FROM militants m JOIN communes c ON c.id = m.commune_id JOIN quartiers q ON q.id = m.quartier_id
    LEFT JOIN secteurs s ON s.id = m.secteur_id
    LEFT JOIN responsables co ON co.id = m.coordonnateur_id LEFT JOIN responsables su ON su.id = m.superviseur_id
    LEFT JOIN responsables cm ON cm.id = m.commissaire_id
    ${w} ORDER BY c.nom, q.nom, m.nom, m.prenoms LIMIT ${config.exportMaxRows + 1}`, w.params);
  if (rows.length > config.exportMaxRows) throw new HttpError(400, `Export limité à ${config.exportMaxRows} lignes : affinez les filtres`);

  const colonnes = [
    ['numero', 'N° militant'], ['nom', 'Nom'], ['prenoms', 'Prénom(s)'], ['sexe', 'Sexe'], ['date_naissance', 'Date de naissance'], ['age', 'Âge'],
    ['telephone', 'Téléphone'], ...(pii ? [['email', 'Email'], ['adresse', 'Adresse'], ['repere', 'Repère'], ['latitude', 'Latitude'], ['longitude', 'Longitude']] : []),
    ['commune', 'Commune'], ['quartier', 'Quartier'], ['secteur', 'Secteur'],
    ['coordonnateur', 'Coordonnateur'], ['superviseur', 'Superviseur'], ['commissaire', 'Commissaire'],
    ['statut', 'Statut'], ['date_enregistrement', "Date d'enregistrement"], ['source', 'Source'], ['information_personne', 'Personne informée'],
  ];
  const data = rows.map((r) => ({
    ...r,
    telephone: pii ? formaterTelephone(dechiffrer(r.telephone_chiffre)) : (r.telephone_suffixe ? `•• ••• ${r.telephone_suffixe.slice(0, 2)} ${r.telephone_suffixe.slice(2)}` : ''),
    statut: STATUTS[r.statut]?.libelle || r.statut,
    information_personne: r.information_personne ? 'Oui' : 'Non',
  }));
  const horodatage = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const nomFichier = `kiiraay_militants_${horodatage}.${req.params.format}`;
  await journaliser(req, 'EXPORT', { details: { format: req.params.format, lignes: rows.length, filtres: f, donnees_completes: pii } });

  res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
  res.setHeader('Cache-Control', 'no-store');
  if (req.params.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    // Neutralise l'injection de formules dans les tableurs (=, +, -, @)
    const sur = data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v])));
    return res.send('﻿' + stringify(sur, { header: true, delimiter: ';', columns: colonnes.map(([key, header]) => ({ key, header })) }));
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = `KIIRAAY — ${req.user.identifiant}`;
  const ws = wb.addWorksheet('Militants');
  ws.addRow([`KIIRAAY — Export confidentiel — ${rows.length} fiches — généré par ${req.user.prenoms} ${req.user.nom} (${req.user.identifiant}) le ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}`]).font = { bold: true, color: { argb: 'FFB42318' } };
  ws.addRow([]);
  const header = ws.addRow(colonnes.map(([, h]) => h));
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14365E' } };
  data.forEach((r) => ws.addRow(colonnes.map(([k]) => r[k] ?? '')));
  ws.columns.forEach((c) => { c.width = 18; });
  ws.views = [{ state: 'frozen', ySplit: 3 }];
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: colonnes.length } };
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await wb.xlsx.write(res);
  res.end();
}));
