// Remplace les limites territoriales par un GeoJSON officiel validé.
// Usage : npm run geo:import -- chemin/limites.geojson
// Chaque feature doit avoir properties.niveau (commune|quartier|secteur) et properties.code.
import fs from 'node:fs';
import { importerGeometries } from '../src/routes/territoires.js';
import { pool } from '../src/db.js';

const fichier = process.argv[2];
if (!fichier) { console.error('Usage : npm run geo:import -- fichier.geojson'); process.exit(1); }
const r = await importerGeometries(JSON.parse(fs.readFileSync(fichier, 'utf8')));
console.log(`Communes : ${r.communes} · Quartiers : ${r.quartiers} · Secteurs : ${r.secteurs}`);
if (r.inconnus.length) console.warn(`Codes inconnus ignorés : ${r.inconnus.join(', ')}`);
await pool.end();
