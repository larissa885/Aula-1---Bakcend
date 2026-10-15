const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT 1')
  .then(() => console.log('Conexão com o banco de dados estabelecida com sucesso!'))
  .catch((err) => console.error('Erro ao conectar ao banco de dados:', err));

module.exports = pool;