const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const produtosRoutes = require('./rotas/produtos');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Health check database failure:', err.message);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

// Evita erros de favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Servir os ficheiros estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/produtos', produtosRoutes);
app.use('/produtos', (req, res) => res.status(404).json({ error: 'Rota de produtos nao encontrada' }));

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

app.use((err, req, res, next) => {
  console.error('Request failure:', err.message);
  const status = Number.isInteger(err.status) && err.status >= 400 ? err.status : 500;
  res.status(status).json({ error: status === 413 ? 'Requisicao muito grande' : 'Erro interno do servidor' });
});

module.exports = app;