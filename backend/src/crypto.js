// Chiffrement applicatif des données sensibles (téléphones) — AES-256-GCM
// + index aveugle HMAC-SHA256 pour la recherche exacte sans déchiffrer.
import crypto from 'node:crypto';
import { config } from './config.js';
import { normaliserTelephone } from '../../shared/referentiel.js';

const VERSION = 1;

export function chiffrer(texte) {
  if (texte == null || texte === '') return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', config.dataKey, iv);
  const enc = Buffer.concat([c.update(String(texte), 'utf8'), c.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, c.getAuthTag(), enc]);
}

export function dechiffrer(buf) {
  if (!buf) return null;
  if (buf[0] !== VERSION) throw new Error('Version de chiffrement inconnue');
  const iv = buf.subarray(1, 13), tag = buf.subarray(13, 29), enc = buf.subarray(29);
  const d = crypto.createDecipheriv('aes-256-gcm', config.dataKey, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

export function indexAveugle(valeur) {
  if (!valeur) return null;
  return crypto.createHmac('sha256', config.indexKey).update(String(valeur)).digest();
}

/** Prépare les colonnes chiffrées pour un numéro brut. */
export function colonnesTelephone(raw) {
  const e164 = normaliserTelephone(raw);
  if (!e164) return { chiffre: null, index: null, suffixe: null, e164: null };
  return { chiffre: chiffrer(e164), index: indexAveugle(e164), suffixe: e164.slice(-4), e164 };
}

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest();
export const jetonAleatoire = () => crypto.randomBytes(48).toString('base64url');
