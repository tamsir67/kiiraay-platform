// Génère des secrets forts pour le fichier .env (à conserver hors du dépôt, sauvegardés à part)
import crypto from 'node:crypto';
const k = () => crypto.randomBytes(32).toString('base64');
console.log(`JWT_SECRET=${crypto.randomBytes(48).toString('base64url')}`);
console.log(`DATA_ENCRYPTION_KEY=${k()}`);
console.log(`DATA_INDEX_KEY=${k()}`);
console.error('\n⚠  La perte de DATA_ENCRYPTION_KEY rend les téléphones chiffrés illisibles : sauvegardez-la dans un coffre-fort.');
