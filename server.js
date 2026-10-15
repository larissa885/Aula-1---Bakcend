const app = require('./app');
const port = process.env.PORT || 3000;

// Vercel treats this exported Express app as the serverless request handler.
module.exports = app;

// Keep `npm start` working for local development.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}