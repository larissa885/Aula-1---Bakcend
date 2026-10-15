const express = require('express');
const path = require('path');
const cors = require('cors');

const produtosRoutes = require('./rotas/produtos');

const app = express();

app.use(cors());
app.use(express.json());

// Trata o favicon para evitar erros de servidor
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve os ficheiros estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/produtos', produtosRoutes);

// Rota padrão para servir o index.html da pasta public
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;