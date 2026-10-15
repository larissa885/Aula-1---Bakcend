const express = require('express');
const path = require('path');
const cors = require('cors');

// Importa suas rotas (sua pasta se chama 'rotas' no VS Code)
const produtosRoutes = require('./rotas/produtos');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS) da RAIZ do projeto
app.use(express.static(__dirname));

// Rotas da aplicação
app.use('/produtos', produtosRoutes);

// Rota principal para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;