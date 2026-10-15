require('dotenv').config();

const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('Erro inesperado no pool PostgreSQL:', err.message);
  });
}

module.exports = {
  isConfigured: Boolean(pool),
  query(text, params) {
    if (!pool) return Promise.reject(new Error('DATABASE_URL nao configurada'));
    return pool.query(text, params);
  }
};
