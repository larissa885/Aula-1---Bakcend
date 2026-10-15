const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar produtos
router.get('/listar', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM produtos ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Cadastrar produto
router.post('/cadastrar', async (req, res) => {
  const { nome, quantidade, valor, categoria, unidade_medida } = req.body;
  if (!nome || quantidade == null || valor == null || !categoria || !unidade_medida) {
    return res.status(400).json({
      error: 'Payload inválido. Campos obrigatórios: nome, quantidade, valor, categoria, unidade_medida'
    });
  }
  try {
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

// Entrada de produto
router.post('/entrada', async (req, res) => {
  const { id, quantidade } = req.body;
  if (!id || quantidade == null) {
    return res.status(400).json({ error: 'Informe id e quantidade' });
  }
  try {
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

// Valor total por categoria
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

// Saídas
router.get('/saidas', async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM movimentacoes WHERE tipo = 'saida' ORDER BY datas DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar saídas de produtos' });
  }
});

// Limites (qtd <= 0 ou >= 100)
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

// 12 - Movimentações no período
router.get('/movimentacoes', async (req, res) => {
  const { data_inicial, data_final } = req.query;
  if (!data_inicial || !data_final) {
    return res.status(400).json({ error: 'Por favor, informe a data_inicial e data_final na URL.' });
  }
  const querySQL = `
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
  try {
    const { rows } = await db.query(querySQL, [data_inicial, data_final]);
    res.json(rows);
  } catch (err) {
    console.error('Erro no SQL:', err);
    res.status(500).json({ error: 'Erro ao buscar movimentações no período' });
  }
});

// 13 - Maiores saídas
router.get('/maiores-saidas', async (req, res) => {
  const { data_inicial, data_final } = req.query;
  if (!data_inicial || !data_final) {
    return res.status(400).json({ error: 'Por favor, informe data_inicial e data_final na URL.' });
  }
  const querySQL = `
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
  try {
    const { rows } = await db.query(querySQL, [data_inicial, data_final]);
    res.json(rows);
  } catch (err) {
    console.error('ERRO NO BANCO (ROTA 13) ->', err);
    res.status(500).json({ error: 'Erro ao buscar produtos com maiores saídas' });
  }
});

module.exports = router;