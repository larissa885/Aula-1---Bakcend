const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. Listar produtos
router.get('/listar', async (req, res) => {
  try {
    // Obtenção dos resultados desestruturando 'rows'
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// 2. Cadastrar produto
router.post('/cadastrar', async (req, res) => {
  const { nome, quantidade, valor, categoria, unidade_medida } = req.body;
  if (!nome || quantidade == null || valor == null || !categoria || !unidade_medida) {
    return res.status(400).json({
      error: 'Payload inválido. Campos obrigatórios: nome, quantidade, valor, categoria, unidade_medida'
    });
  }
  try {
    // Substituídos ? por $1, $2, $3, $4, $5 e adicionado RETURNING id (substituindo insertId do MySQL)
    const { rows } = await db.query(
      'INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [nome, valor, quantidade, categoria, unidade_medida]
    );
    res.status(201).json({ message: 'Produto cadastrado com sucesso', id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar produto' });
  }
});

// 3. Entrada de produto
router.post('/entrada', async (req, res) => {
  const { id, quantidade } = req.body;
  if (!id || quantidade == null) {
    return res.status(400).json({ error: 'Informe id e quantidade' });
  }
  try {
    // Substituídos ? por $1 e $2
    const result = await db.query(
      'UPDATE produtos SET quantidade = quantidade + $1 WHERE id = $2',
      [quantidade, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.status(200).json({ message: 'Entrada de produto registrada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar entrada de produto' });
  }
});

// 4. Valor total por categoria
router.get('/valor-total', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT categoria, SUM(quantidade * valor)::float AS valor_total FROM produtos GROUP BY categoria'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar valor total por categoria' });
  }
});

// 5. Saídas (Exemplo de consulta utilizando CURRENT_DATE para saídas de hoje caso não especificado)
router.get('/saidas', async (req, res) => {
  const { hoje } = req.query;
  try {
    let querySQL = "SELECT * FROM movimentacoes WHERE tipo = 'saida'";
    const queryParams = [];

    if (hoje === 'true') {
      // Ajustada função de data de CURDATE() para CURRENT_DATE no PostgreSQL
      querySQL += " AND datas = CURRENT_DATE";
    }

    querySQL += " ORDER BY datas DESC";

    const { rows } = await db.query(querySQL, queryParams);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar saídas de produtos' });
  }
});

// 6. Limites (qtd <= 0 ou >= 100)
router.get('/limites', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, quantidade, valor, categoria,
              (quantidade::numeric / 100) * 100 AS percentual
       FROM produtos
       WHERE quantidade <= 0 OR quantidade >= 100`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos com limites atingidos' });
  }
});

// 7. Movimentações no período (com suporte ao padrão CURRENT_DATE se não informadas as datas)
router.get('/movimentacoes', async (req, res) => {
  const { data_inicial, data_final } = req.query;

  try {
    let querySQL;
    let queryParams = [];

    if (data_inicial && data_final) {
      querySQL = `
        SELECT
          p.nome AS nome_do_produto,
          p.unidade_medida,
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)::int AS total_de_entradas,
          COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0)::int AS total_de_saidas,
          COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0)::int AS saida_no_periodo,
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade * p.valor ELSE 0 END), 0)::float AS valor_total_financeiro_das_entradas,
          COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade * p.valor ELSE 0 END), 0)::float AS valor_financeiro_das_saidas
        FROM produtos p
        INNER JOIN movimentacoes m ON p.id = m.produtos_id
        WHERE m.datas BETWEEN $1 AND $2
        GROUP BY p.id, p.nome, p.unidade_medida
      `;
      queryParams = [data_inicial, data_final];
    } else {
      // Uso do CURRENT_DATE (PostgreSQL) caso o período não seja informado
      querySQL = `
        SELECT
          p.nome AS nome_do_produto,
          p.unidade_medida,
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END), 0)::int AS total_de_entradas,
          COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0)::int AS total_de_saidas,
          COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0)::int AS saida_no_periodo,
          COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade * p.valor ELSE 0 END), 0)::float AS valor_total_financeiro_das_entradas,
          COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade * p.valor ELSE 0 END), 0)::float AS valor_financeiro_das_saidas
        FROM produtos p
        INNER JOIN movimentacoes m ON p.id = m.produtos_id
        WHERE m.datas = CURRENT_DATE
        GROUP BY p.id, p.nome, p.unidade_medida
      `;
    }

    const { rows } = await db.query(querySQL, queryParams);
    res.json(rows);
  } catch (err) {
    console.error('Erro no SQL:', err);
    res.status(500).json({ error: 'Erro ao buscar movimentações no período' });
  }
});

// 8. Maiores saídas
router.get('/maiores-saidas', async (req, res) => {
  const { data_inicial, data_final } = req.query;

  try {
    let querySQL;
    let queryParams = [];

    if (data_inicial && data_final) {
      querySQL = `
        SELECT
          p.nome AS nome_do_produto,
          SUM(m.quantidade)::int AS quantidade_total_de_saidas,
          SUM(m.quantidade * p.valor)::float AS valor_total_financeiro_das_saidas
        FROM produtos p
        INNER JOIN movimentacoes m ON p.id = m.produtos_id
        WHERE m.tipo = 'saida' AND m.datas BETWEEN $1 AND $2
        GROUP BY p.id, p.nome
        ORDER BY quantidade_total_de_saidas DESC
      `;
      queryParams = [data_inicial, data_final];
    } else {
      // Uso do CURRENT_DATE para o dia atual caso não sejam informadas as datas
      querySQL = `
        SELECT
          p.nome AS nome_do_produto,
          SUM(m.quantidade)::int AS quantidade_total_de_saidas,
          SUM(m.quantidade * p.valor)::float AS valor_total_financeiro_das_saidas
        FROM produtos p
        INNER JOIN movimentacoes m ON p.id = m.produtos_id
        WHERE m.tipo = 'saida' AND m.datas = CURRENT_DATE
        GROUP BY p.id, p.nome
        ORDER BY quantidade_total_de_saidas DESC
      `;
    }

    const { rows } = await db.query(querySQL, queryParams);
    res.json(rows);
  } catch (err) {
    console.error('ERRO NO BANCO ->', err);
    res.status(500).json({ error: 'Erro ao buscar produtos com maiores saídas' });
  }
});

module.exports = router;