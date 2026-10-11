import 'dotenv/config';

function requis(nom, { minLength = 1 } = {}) {
  const v = process.env[nom];
  if (!v || v.length < minLength) {
    throw new Error(`Variable d'environnement ${nom} manquante ou trop courte (voir backend/.env.example)`);
  }
  return v;
}

const env = process.env.NODE_ENV || 'development';

export const config = {
  env,
  production: env === 'production',
  port: Number(process.env.PORT || 4000),
  databaseUrl: requis('DATABASE_URL'),
  // Secrets : 32 octets minimum encodés en base64 (npm run keys:generate)
  jwtSecret: requis('JWT_SECRET', { minLength: 32 }),
  dataKey: Buffer.from(requis('DATA_ENCRYPTION_KEY'), 'base64'),
  indexKey: Buffer.from(requis('DATA_INDEX_KEY'), 'base64'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  trustProxy: process.env.TRUST_PROXY === 'true',
  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
  lockMinutes: Number(process.env.LOCK_MINUTES || 15),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  smtpCaCertFile: process.env.SMTP_CA_CERT_FILE || '',
  exportMaxRows: Number(process.env.EXPORT_MAX_ROWS || 50000),
  importMaxRows: Number(process.env.IMPORT_MAX_ROWS || 20000),
};

if (config.dataKey.length !== 32) throw new Error('DATA_ENCRYPTION_KEY doit faire 32 octets (base64)');
if (config.indexKey.length < 32) throw new Error('DATA_INDEX_KEY doit faire au moins 32 octets (base64)');
