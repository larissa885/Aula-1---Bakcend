
const express = require('express');
const router = express.Router();
const db = require('../db');

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}


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

// Excluir produto e seu historico de movimentacoes de forma atomica
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Informe um ID valido' });
  }
  try {
    const result = await db.transaction(async (client) => {
      await client.query('DELETE FROM movimentacoes WHERE produtos_id = $1', [id]);
      return client.query('DELETE FROM produtos WHERE id = $1 RETURNING id', [id]);
    });
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto nao encontrado' });
    }
    res.status(200).json({ message: 'Produto e movimentacoes excluidos com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// 2. Cadastrar produto
router.post('/cadastrar', async (req, res) => {
  const { nome, quantidade, valor, categoria, unidade_medida } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim() || typeof categoria !== 'string' || !categoria.trim() || typeof unidade_medida !== 'string' || !unidade_medida.trim() || typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 0 || typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    return res.status(400).json({
      error: 'Payload inválido. Campos obrigatórios: nome, quantidade, valor, categoria, unidade_medida'
    });
  }
  try {
    // Substituídos ? por $1, $2, $3, $4, $5 e adicionado RETURNING id (substituindo insertId do MySQL)
    const { rows } = await db.query(
      `WITH novo_produto AS (
        INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, quantidade
      ), registro_entrada AS (
        INSERT INTO movimentacoes (produtos_id, tipo, quantidade, datas)
        SELECT id, 'entrada', quantidade, CURRENT_DATE FROM novo_produto WHERE quantidade > 0
      )
      SELECT id FROM novo_produto`,
      [nome.trim(), Number(valor), Number(quantidade), categoria.trim(), unidade_medida.trim()]
    );
    res.status(201).json({ message: 'Produto cadastrado com sucesso', id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar produto' });
  }
});

// 3. Entrada de produto
router.post('/entrada', async (req, res) => {
  const { id, quantidade } = req.body || {};
  if (!Number.isInteger(Number(id)) || Number(id) <= 0 || !Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
    return res.status(400).json({ error: 'Informe um ID valido e uma quantidade inteira maior que zero' });
  }
  try {
    const result = await db.query(
      `WITH produto_atualizado AS (
        UPDATE produtos SET quantidade = quantidade + $1 WHERE id = $2 RETURNING id
      )
      INSERT INTO movimentacoes (produtos_id, tipo, quantidade, datas)
      SELECT id, 'entrada', $1, CURRENT_DATE FROM produto_atualizado RETURNING produtos_id`,
      [Number(quantidade), Number(id)]
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

// Registrar sa?da de estoque, impedindo saldo negativo e gravando a movimenta??o atomicamente
router.post('/saida', async (req, res) => {
  const body = req.body || {};
  const id = Number(body.id);
  const quantidade = Number(body.quantidade);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ error: 'Informe um ID valido e uma quantidade inteira maior que zero' });
  }
  try {
    const result = await db.query(
      `WITH produto_atualizado AS (
        UPDATE produtos SET quantidade = quantidade - $1
        WHERE id = $2 AND quantidade >= $1 RETURNING id
      )
      INSERT INTO movimentacoes (produtos_id, tipo, quantidade, datas)
      SELECT id, 'saida', $1, CURRENT_DATE FROM produto_atualizado RETURNING produtos_id`,
      [quantidade, id]
    );
    if (result.rowCount === 0) {
      const produto = await db.query('SELECT quantidade FROM produtos WHERE id = $1', [id]);
      if (produto.rowCount === 0) return res.status(404).json({ error: 'Produto nao encontrado' });
      return res.status(409).json({ error: 'Estoque insuficiente para essa saida' });
    }
    res.status(200).json({ message: 'Saida registrada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar saida de produto' });
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
  if (Boolean(data_inicial) !== Boolean(data_final) || (data_inicial && (!isIsoDate(data_inicial) || !isIsoDate(data_final) || data_inicial > data_final))) {
    return res.status(400).json({ error: 'Informe duas datas validas no formato AAAA-MM-DD' });
  }


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
  if (Boolean(data_inicial) !== Boolean(data_final) || (data_inicial && (!isIsoDate(data_inicial) || !isIsoDate(data_final)))) {
    return res.status(400).json({ error: 'Informe duas datas validas no formato AAAA-MM-DD' });
  }


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
