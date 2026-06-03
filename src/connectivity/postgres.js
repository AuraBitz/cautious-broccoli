const { Pool } = require('pg');
const config = require('../config/Development');
const logger = require('../logger');

let pool = null;

const connect = async () => {
  if (pool) return pool;

  pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    max: config.db.maxPool,
  });

  pool.on('error', (err) => {
    logger.error('Database pool error', { message: err.message });
  });

  const client = await pool.connect();
  client.release();
  logger.info('Database connected', {
    host: config.db.host,
    database: config.db.database,
  });

  return pool;
};

const query = async (text, params) => {
  if (!pool) await connect();
  return pool.query(text, params);
};

const disconnect = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database disconnected');
  }
};

const getPool = () => pool;

module.exports = {
  connect,
  query,
  disconnect,
  getPool,
};
