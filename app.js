const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const path = require('path');
require('./db');

const app = express();
app.use(express.json());

const produtosRoutes = require('./rotas/produtos');
app.use('/produtos', produtosRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

module.exports = app;