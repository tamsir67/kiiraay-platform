import { ZodError } from 'zod';
import { logger } from './logger.js';

export class HttpError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
export function gestionErreurs(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      erreur: 'Données invalides',
      champs: err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erreur: err.message, code: err.code, details: err.details });
  }
  if (err?.code === '23505') return res.status(409).json({ erreur: 'Cet enregistrement existe déjà' });
  if (err?.code === '23514' || err?.code === '23503') return res.status(400).json({ erreur: err.message.replace(/^.*?:\s*/, '') || 'Contrainte non respectée' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ erreur: 'Requête trop volumineuse' });
  logger.error({ err, url: req.originalUrl }, 'Erreur serveur');
  return res.status(500).json({ erreur: 'Erreur interne du serveur' });
}
