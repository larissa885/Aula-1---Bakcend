# SAEP Estoque

## Banco Neon

1. No Neon SQL Editor, execute uma vez o conteudo de [database/schema.sql](database/schema.sql). O script cria as tabelas usadas pelas rotas: produtos e movimentacoes.
2. Mantenha a connection string pooled do Neon na variavel DATABASE_URL. O host deve conter -pooler e a URL deve exigir TLS (sslmode=require).
3. Localmente, coloque DATABASE_URL no arquivo .env (ja ignorado pelo Git).
4. Na Vercel, configure DATABASE_URL em Project Settings > Environment Variables para Production e Preview, depois publique um novo deploy.
5. Valide a aplicacao em /health; a resposta deve indicar status ok e database connected.

A interface chama a API no mesmo dominio. Os endpoints ficam sob /produtos.
