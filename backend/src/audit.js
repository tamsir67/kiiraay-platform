import { query } from './db.js';
import { logger } from './logger.js';

/** Enregistre une opération dans le journal d'audit (ajout seul, chaîné). */
export async function journaliser(req, action, { entite = null, entiteId = null, succes = true, details = null, user = null } = {}) {
  const u = user || req?.user || null;
  try {
    await query(
      `INSERT INTO journal_audit (utilisateur_id, identifiant, role, action, entite, entite_id, succes, ip, user_agent, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [u?.id ?? null, u?.identifiant ?? details?.identifiant ?? null, u?.role ?? null, action, entite,
       entiteId == null ? null : String(entiteId), succes, req?.ip || null,
       req?.get?.('user-agent')?.slice(0, 300) || null, details ? JSON.stringify(details) : null],
    );
  } catch (e) {
    // L'échec de journalisation ne doit jamais passer inaperçu
    logger.error({ err: e, action }, 'Échec écriture journal audit');
  }
}
