module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'app_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    maxPool: Number(process.env.DB_POOL_MAX) || 10,
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  dbTableMate: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_TABLE_MATE_NAME || 'table_mate',
    user: process.env.DB_USER || 'compney',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    maxPool: Number(process.env.DB_POOL_MAX) || 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'compney-api',
    audience: process.env.JWT_AUDIENCE || 'compney-client',
  },
  cookie: {
    name: process.env.JWT_COOKIE_NAME || 'access_token',
    maxAgeMs:
      Number(process.env.JWT_COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: process.env.COOKIE_PATH || '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
};
