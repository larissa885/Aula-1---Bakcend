-- 1. Apaga o banco antigo se ele existir para começarmos d
o zero absoluto
DROP DATABASE IF EXISTS `mydb`;
-- 2. Cria o banco de dados limpo
CREATE DATABASE `mydb` DEFAULT CHARACTER SET utf8;
USE `mydb`;
-- 3. Cria a tabela de produtos (repare que adicionei a unidade_medida aqui)
CREATE TABLE `produtos` (
`id` INT NOT NULL AUTO_INCREMENT,
`nome` VARCHAR(255) NOT NULL,
`valor` DECIMAL(10,2) NOT NULL,
`quantidade` INT NOT NULL,
`categoria` VARCHAR(255) NOT NULL,
`unidade_medida` VARCHAR(50) NOT NULL, -- Coluna essencia
l para o seu exercício 12
PRIMARY KEY (`id`)
) ENGINE = InnoDB;
-- 4. Cria a tabela de movimentações (repare que a coluna se chama 'datas')
CREATE TABLE `movimentacoes` (
`id` INT NOT NULL AUTO_INCREMENT,
`datas` DATE NOT NULL,
`tipo` VARCHAR(10) NOT NULL, -- Onde vai entrar 'entrada'ou 'saida'
`quantidade` INT NOT NULL,
`produtos_id` INT NOT NULL,
PRIMARY KEY (`id`),
CONSTRAINT `fk_movimentacoes_produtos`
FOREIGN KEY (`produtos_id`)
REFERENCES `produtos` (`id`)
) ENGINE = InnoDB;
-- 5. Inserindo dados de teste válidos para o ano de 2026
INSERT INTO produtos (nome, quantidade, valor, categoria, unidade_medida) VALUES
("Bodysplash", 12, 20.00, "Produto de beleza", "Litro"),
("Moletom", 10, 50.00, "Roupa", "Unidade"),
("Batom", 20, 10.00, "Produto de beleza", "Unidade");
INSERT INTO movimentacoes (datas, tipo, quantidade, produtos_id) VALUES
('2026-05-10', 'entrada', 10, 1), -- 10 Bodysplash entrando
('2026-05-12', 'saida', 5, 1), -- 5 Bodysplash saindo
('2026-05-15', 'entrada', 20, 2), -- 20 Moletons entrando
('2026-05-20', 'saida', 10, 2), -- 10 Moletons saindo
('2026-05-22', 'saida', 4, 3); -- 4 Batons saindo