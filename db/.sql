DROP TABLE IF EXISTS movimentacoes;
DROP TABLE IF EXISTS produtos;

CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  quantidade INT NOT NULL,
  categoria VARCHAR(255) NOT NULL,
  unidade_medida VARCHAR(50) NOT NULL
);

CREATE TABLE movimentacoes (
  id SERIAL PRIMARY KEY,
  datas DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  quantidade INT NOT NULL,
  produtos_id INT NOT NULL,
  CONSTRAINT fk_movimentacoes_produtos
    FOREIGN KEY (produtos_id) REFERENCES produtos (id)
);

INSERT INTO produtos (nome, quantidade, valor, categoria, unidade_medida) VALUES
('Bodysplash', 12, 20.00, 'Produto de beleza', 'Litro'),
('Moletom', 10, 50.00, 'Roupa', 'Unidade'),
('Batom', 20, 10.00, 'Produto de beleza', 'Unidade');

INSERT INTO movimentacoes (datas, tipo, quantidade, produtos_id) VALUES
('2026-05-10', 'entrada', 10, 1),
('2026-05-12', 'saida', 5, 1),
('2026-05-15', 'entrada', 20, 2),
('2026-05-20', 'saida', 10, 2),
('2026-05-22', 'saida', 4, 3);