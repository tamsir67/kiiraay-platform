import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { logger } from './logger.js';
import { query } from './db.js';
import { authentifier } from './auth.js';
import { gestionErreurs, HttpError } from './errors.js';
import { router as auth } from './routes/auth.js';
import { router as militants } from './routes/militants.js';
import { router as dashboard } from './routes/dashboard.js';
import { router as carte } from './routes/carte.js';
import { router as territoires } from './routes/territoires.js';
import { router as responsables } from './routes/responsables.js';
import { router as administration } from './routes/administration.js';
import { router as qualite } from './routes/qualite.js';
import { router as echanges } from './routes/echanges.js';
import { router as espace } from './routes/espace.js';
import { router as messagerie } from './routes/messagerie.js';

export function creerApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/sante' } }));
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
        'connect-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false }));
  // Les réponses de l'API contiennent des données personnelles : jamais en cache
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  app.get('/api/sante', async (_req, res) => {
    const { rows } = await query("SELECT now() AS heure, (SELECT max(version) FROM schema_migrations) AS schema");
    res.json({ statut: 'ok', ...rows[0] });
  });

  app.use('/api/auth', auth);

  // Toutes les routes suivantes exigent une session valide
  app.use('/api', authentifier, (req, _res, next) => {
    if (req.user.doit_changer_mdp) return next(new HttpError(403, 'Vous devez changer votre mot de passe', 'MDP_A_CHANGER'));
    next();
  });
  app.use('/api/militants', militants);
  app.use('/api/espace', espace);
  app.use('/api/messagerie', messagerie);
  app.use('/api/dashboard', dashboard);
  app.use('/api/carte', carte);
  app.use('/api/territoires', territoires);
  app.use('/api/responsables', responsables);
  app.use('/api/qualite', qualite);
  app.use('/api', echanges);
  app.use('/api', administration);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ressource inconnue')));

  // En production, l'API sert aussi le frontend compilé (frontend/dist)
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(gestionErreurs);
  return app;
}
