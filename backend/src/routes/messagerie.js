import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncH, HttpError } from '../errors.js';
import { exiger } from '../auth.js';

export const router = Router();

router.get('/contacts', exiger('messagerie'), asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT id, nom, prenoms, role FROM utilisateurs
     WHERE actif AND id <> $1 ORDER BY nom, prenoms`, [req.user.id]);
  res.json(rows);
}));

router.get('/conversations', exiger('messagerie'), asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, u.id AS interlocuteur_id, u.nom, u.prenoms, u.role, c.updated_at,
            (SELECT contenu FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS dernier_message,
            (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS dernier_message_le,
            (SELECT count(*)::int FROM messages WHERE conversation_id = c.id AND auteur_id <> $1 AND lu_le IS NULL) AS non_lus
     FROM conversations c
     JOIN utilisateurs u ON u.id = CASE WHEN c.participant_a = $1 THEN c.participant_b ELSE c.participant_a END
     WHERE c.participant_a = $1 OR c.participant_b = $1
     ORDER BY c.updated_at DESC`, [req.user.id]);
  res.json(rows);
}));

router.post('/conversations', exiger('messagerie'), asyncH(async (req, res) => {
  const { utilisateur_id } = z.object({ utilisateur_id: z.coerce.number().int().positive() }).parse(req.body);
  if (utilisateur_id === req.user.id) throw new HttpError(400, 'Vous ne pouvez pas ouvrir une conversation avec vous-même');
  const { rows: destinataire } = await query('SELECT id FROM utilisateurs WHERE id = $1 AND actif', [utilisateur_id]);
  if (!destinataire[0]) throw new HttpError(404, 'Utilisateur introuvable');
  const a = Math.min(req.user.id, utilisateur_id), b = Math.max(req.user.id, utilisateur_id);
  const { rows } = await query(
    `INSERT INTO conversations (participant_a, participant_b) VALUES ($1,$2)
     ON CONFLICT (participant_a, participant_b) DO UPDATE SET updated_at = conversations.updated_at
     RETURNING id`, [a, b]);
  res.status(200).json({ id: rows[0].id });
}));

router.get('/conversations/:id/messages', exiger('messagerie'), asyncH(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { rows: conversation } = await query(
    'SELECT id FROM conversations WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)', [id, req.user.id]);
  if (!conversation[0]) throw new HttpError(404, 'Conversation introuvable');
  await query('UPDATE messages SET lu_le = now() WHERE conversation_id = $1 AND auteur_id <> $2 AND lu_le IS NULL', [id, req.user.id]);
  const { rows } = await query(
    `SELECT m.id, m.auteur_id, u.prenoms, u.nom, m.contenu, m.created_at, m.lu_le
     FROM messages m JOIN utilisateurs u ON u.id = m.auteur_id
     WHERE m.conversation_id = $1 ORDER BY m.id DESC LIMIT 200`, [id]);
  res.json(rows.reverse());
}));

router.post('/conversations/:id/messages', exiger('messagerie'), asyncH(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const { contenu } = z.object({ contenu: z.string().trim().min(1).max(4000) }).parse(req.body);
  const { rows: conversation } = await query(
    `SELECT id FROM conversations WHERE id = $1 AND (participant_a = $2 OR participant_b = $2)
       AND EXISTS (SELECT 1 FROM utilisateurs WHERE id <> $2 AND actif AND id IN (participant_a, participant_b))`,
    [id, req.user.id]);
  if (!conversation[0]) throw new HttpError(404, 'Conversation introuvable');
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, auteur_id, contenu) VALUES ($1,$2,$3)
     RETURNING id, auteur_id, contenu, created_at, lu_le`, [id, req.user.id, contenu]);
  await query('UPDATE conversations SET updated_at = now() WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
}));