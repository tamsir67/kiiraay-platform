// Applique les migrations SQL de database/migrations dans l'ordre (idempotent)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../database/migrations');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const existe = (await client.query("SELECT to_regclass('schema_migrations') AS t")).rows[0].t;
const faites = new Set(existe ? (await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version) : []);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const version = f.replace(/\.sql$/, '');
  if (faites.has(version)) { console.log(`= ${version} (déjà appliquée)`); continue; }
  console.log(`+ ${version}`);
  await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
  await client.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [version]);
}
await client.end();
console.log('Migrations à jour.');
