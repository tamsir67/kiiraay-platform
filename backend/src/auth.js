import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';
import { can } from '../../shared/referentiel.js';
import { HttpError } from './errors.js';

const ROLES_PERIMETRE_OBLIGATOIRE = new Set(['COORDONNATEUR', 'SUPERVISEUR', 'COMMISSAIRE']);

export function signerAcces(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.accessTokenTtl, issuer: 'kiiraay-api', audience: 'kiiraay-web', algorithm: 'HS256',
  });
}

export async function chargerUtilisateur(id) {
  const { rows } = await query(
    `SELECT u.id, u.identifiant, u.nom, u.prenoms, u.email, u.role, u.actif, u.doit_changer_mdp, u.responsable_id,
            coalesce(json_agg(json_build_object('commune_id', p.commune_id, 'quartier_id', p.quartier_id))
                     FILTER (WHERE p.commune_id IS NOT NULL), '[]') AS perimetres
     FROM utilisateurs u LEFT JOIN utilisateur_perimetres p ON p.utilisateur_id = u.id
     WHERE u.id = $1 GROUP BY u.id`, [id]);
  return rows[0] || null;
}

/** Middleware : vérifie le jeton d'accès et recharge l'utilisateur (désactivation immédiate). */
export async function authentifier(req, _res, next) {
  try {
    const h = req.get('authorization') || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentification requise');
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { issuer: 'kiiraay-api', audience: 'kiiraay-web', algorithms: ['HS256'] });
    } catch {
      throw new HttpError(401, 'Session expirée ou invalide');
    }
    const user = await chargerUtilisateur(Number(payload.sub));
    if (!user || !user.actif) throw new HttpError(401, 'Compte inactif');
    user.communes = user.perimetres.filter((p) => p.quartier_id == null).map((p) => p.commune_id);
    user.quartiers = user.perimetres.filter((p) => p.quartier_id != null).map((p) => p.quartier_id);
    user.global = user.perimetres.length === 0 && !ROLES_PERIMETRE_OBLIGATOIRE.has(user.role);
    req.user = user;
    next();
  } catch (e) { next(e); }
}

/** Middleware : exige une permission de la matrice des droits. */
export const exiger = (...perms) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Authentification requise'));
  if (req.user.doit_changer_mdp && !req.path.startsWith('/auth')) {
    return next(new HttpError(403, 'Vous devez changer votre mot de passe', 'MDP_A_CHANGER'));
  }
  const ok = perms.every((p) => can(req.user.role, p));
  return ok ? next() : next(new HttpError(403, 'Droits insuffisants pour cette opération'));
};

/**
 * Ajoute à `where` la restriction au périmètre territorial de l'utilisateur.
 * alias : alias SQL de la table portant commune_id / quartier_id.
 */
export function restreindrePerimetre(where, user, alias = 'm', { quartierCol = 'quartier_id', communeCol = 'commune_id' } = {}) {
  if (user.global) return where;
  if (!user.communes.length && !user.quartiers.length) return where.raw('false');
  return where.add(`${alias}.${communeCol} = ANY(?::smallint[]) OR ${alias}.${quartierCol} = ANY(?::int[])`, user.communes, user.quartiers);
}

export async function verifierAccesQuartier(user, quartierId) {
  if (user.global) return true;
  const { rows } = await query('SELECT commune_id FROM quartiers WHERE id = $1', [quartierId]);
  if (!rows[0]) return false;
  return user.quartiers.includes(Number(quartierId)) || user.communes.includes(rows[0].commune_id);
}
