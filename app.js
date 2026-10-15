const express = require('express');
const path = require('path');
const cors = require('cors');

const produtosRoutes = require('./rotas/produtos');

const app = express();

app.use(cors());
app.use(express.json());

// Evita erros de favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Servir os ficheiros estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/produtos', produtosRoutes);

// Rota de captura global usando Expressão Regular (compatível com Express 4 e Express 5)
app.get(/.*/, (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Erro ao servir index.html:', err);
      res.status(500).json({ error: 'Erro ao carregar a interface da aplicação.' });
    }
  });
});

module.exports = app;