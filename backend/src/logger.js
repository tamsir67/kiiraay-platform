import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Ne jamais journaliser de secrets ou de données personnelles
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.mot_de_passe', '*.telephone'],
});
