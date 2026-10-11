import pg from 'pg';
import { config } from './config.js';

// DATE -> chaîne ISO (évite les décalages de fuseau) ; NUMERIC -> nombre
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.DB_POOL_MAX || 15),
  statement_timeout: 15000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_STRICT !== 'false' } : undefined,
});

export const query = (text, params) => pool.query(text, params);

/**
 * Exécute fn dans une transaction. L'identifiant de l'utilisateur est
 * transmis à PostgreSQL (SET LOCAL app.user_id) pour l'historisation.
 */
export async function transaction(user, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (user?.id) await client.query("SELECT set_config('app.user_id', $1, true)", [String(user.id)]);
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
