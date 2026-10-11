import { creerApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { pool } from './db.js';

const server = creerApp().listen(config.port, () => {
  logger.info(`API KIIRAAY démarrée sur le port ${config.port} (${config.env})`);
});

const arret = (signal) => {
  logger.info(`${signal} reçu, arrêt propre…`);
  server.close(() => pool.end().then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', arret);
process.on('SIGINT', arret);
