import { Router } from 'express';
import { query } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger } from '../auth.js';
import { dechiffrer } from '../crypto.js';

export const router = Router();

router.get('/mon-espace', exiger('espace:personnel'), asyncH(async (req, res) => {
  if (!req.user.militant_id) throw new HttpError(403, 'Aucune fiche militante liée à ce compte');
  const { rows } = await query(
    `SELECT m.id, m.numero, m.nom, m.prenoms, m.sexe, m.date_naissance, m.telephone_chiffre,
            m.email, m.adresse, m.statut, m.date_enregistrement, c.nom AS commune, q.nom AS quartier
     FROM militants m JOIN communes c ON c.id = m.commune_id JOIN quartiers q ON q.id = m.quartier_id
     WHERE m.id = $1`, [req.user.militant_id]);
  if (!rows[0]) throw new HttpError(404, 'Fiche militante introuvable');
  const { telephone_chiffre, ...fiche } = rows[0];
  res.json({ ...fiche, telephone: dechiffrer(telephone_chiffre) });
}));