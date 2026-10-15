const express = require('express');
const router = express.Router();
const db = require('../db');
router.get('/listar', (req, res) => {
db.query('SELECT * FROM produtos', (err, results) => {
if (err) {
return res.status(500).json({ error: 'Erro ao buscar produtos' });
}
res.json(results);
});
});

router.post('/cadastrar', (req, res) => {
const { nome, quantidade, valor, categoria } = req.bod
y;
if (!nome || quantidade == null || valor == null || !categoria) {
return res.status(400).json({ error: 'Payload inválido. Campos obrigatórios: nome, quantidade, valor, categoria' });
}
db.query(
'INSERT INTO produtos (nome, valor, quantidade, categoria) VALUES (?, ?, ?, ?)',
[nome, valor, quantidade, categoria],
(err, results) => {
if (err) {
return res.status(500).json({ error: 'Erroao cadastrar produto' });
}
return res.status(201).json({ message: 'Produto cadastrado com sucesso', id: results.insertId });
}
);
});

router.post('/entrada', (req, res) => {
const { id, quantidade } = req.body;
if (!id || quantidade == null) {
return res.status(400).json({ error: 'Deu erro' });
}
db.query('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?',
[quantidade, id],
(err, results) => {
if (err) {
return res.status(500).json({ error: 'Erro ao registrar entrada de produto' });
}
if (results.affectedRows === 0) {
return res.status(404).json({ error: 'Produto não encontrado' });
}
return res.status(200).json({ message: 'Entrada de produto registrada com sucesso' });
}
);
});

router.get('/valor-total', (req, res) => {
db.query('SELECT categoria, SUM(quantidade * valor) as valor_total FROM produtos GROUP BY categoria', (err, results) => {
if (err) {
return res.status(500).json({ error: 'Erro ao buscar valor total por categoria' });
}
res.json(results);
});
});

router.get('/saidas', (req, res) => {
// Trocado de `date` para `datas`
db.query('SELECT * FROM movimentacoes WHERE tipo = "saida" ORDER BY datas DESC', (err, results) => {
if (err) {
console.error(err); // Deixei isso para você ver erros futuros no terminal
return res.status(500).json({ error: 'Erro ao buscar saídas de produtos' });
}
res.json(results);
});
});

router.get('/limites', (req, res) => {
db.query('SELECT id, nome, quantidade, valor, categoria, (quantidade / 100) * 100 AS percentual FROM produtos WHERE quantidade <= 0 OR quantidade >= 100', (err, results) => {
if (err) {
return res.status(500).json({ error: 'Erro ao buscar produtos com limites atingidos' });
}
res.json(results);
});
});

router.get('/movimentacoes', (req, res) => {
const { data_inicial, data_final } = req.query;
if (!data_inicial || !data_final) {
return res.status(400).json({ error: 'Deu erro' });
}
db.query('SELECT * FROM movimentacoes WHERE `date` BETWEEN ? AND ?', [data_inicial, data_final], (err, results) =>
{
if (err) {
return res.status(500).json({ error: 'Erro ao buscar movimentações' });
}
res.json(results);
});
});
// 12- Listar movimentações de entrada e saída no período i
nformado
router.get('/movimentacoes', (req, res) => {
const { data_inicial, data_final } = req.query;
if (!data_inicial || !data_final) {
return res.status(400).json({ error: 'Por favor, informe a data_inicial e data_final na URL.' });
}
// Query robusta para trazer exatamente os 7 campos obrigatórios na ordem solicitada
const querySQL = `
SELECT
p.nome AS nome_do_produto,
p.unidade_medida,
SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantid
ade ELSE 0 END) AS total_de_entradas,
SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidad
e ELSE 0 END) AS total_de_saidas,
SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidad
e ELSE 0 END) AS saida_no_periodo,
SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantid
ade * p.valor ELSE 0 END) AS valor_total_financeiro_das_ent
radas,
SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidad
e * p.valor ELSE 0 END) AS valor_financeiro_das_saidas
FROM produtos p
INNER JOIN movimentacoes m ON p.id = m.produtos_id
WHERE m.datas BETWEEN ? AND ?
GROUP BY p.id, p.nome, p.unidade_medida;
`;
db.query(querySQL, [data_inicial, data_final], (err, results) => {
if (err) {
console.error('Erro no SQL:', err); // Ajuda você a debugar se algo falhar
return res.status(500).json({ error: 'Erro ao buscar movimentações no período' });
}
res.json(results);
});
});

router.get('/maiores-saidas', (req, res) => {
const { data_inicial, data_final } = req.query;
if (!data_inicial || !data_final) {
return res.status(400).json({ error: 'Deu erro' });
}
db.query('SELECT * FROM movimentacoes WHERE `date` BETWEEN ? AND ?', [data_inicial, data_final], (err, results) =>
{
if (err) {
return res.status(500).json({ error: 'Erro ao buscar movimentações' });
}
res.json(results);
});
});
router.get('/maiores-saidas', (req, res) => {
const { data_inicial, data_final } = req.query;
// Validação para garantir que as datas foram enviadasna URL
if (!data_inicial || !data_final) {
return res.status(400).json({ error: 'Por favor, informe data_inicial e data_final na URL.' });
}
// Query SQL estruturada para trazer os 3 campos obrigatórios na ordem exata
const querySQL = `
SELECT
p.nome AS nome_do_produto,
-- [Campo 1]
SUM(m.quantidade) AS quantidade_total_de_saida
s, -- [Campo 2]
SUM(m.quantidade * p.valor) AS valor_total_fina
nceiro_das_saidas -- [Campo 3]
FROM produtos p
INNER JOIN movimentacoes m ON p.id = m.produtos_id
WHERE m.tipo = 'saida' AND m.datas BETWEEN ? AND ?
-- Filtra apenas as SAÍDAS dentro do período
GROUP BY p.id, p.nome
ORDER BY quantidade_total_de_saidas DESC;
-- Garante os de maior volume primeiro
`;
db.query(querySQL, [data_inicial, data_final], (err, results) => {
if (err) {
console.error("ERRO NO BANCO (ROTA 13) ->", err); // Printa o erro real no terminal do VS Code
return res.status(500).json({ error: 'Erro ao buscar produtos com maiores saídas' });
}
res.json(results); // Retorna a lista ordenada para o Postman
});
});


module.exports = router;
