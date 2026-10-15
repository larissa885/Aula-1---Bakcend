const mysql = require('mysql2');
const dotenv = require('dotenv');
const { connect } = require('node:http2');
dotenv.config();
const connection = mysql.createPool({
host:process.env.DB_HOST,
 host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

connection.getConnection((err) => {
if (err) {
console.error('Erro ao conectar ao banco de dados:', err);
return
} else {
console.log('Conexão com o banco de dados estabelecida com sucesso!');
}
});
module.exports = connection;