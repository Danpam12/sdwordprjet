-- Criação do banco de dados 'game_db'
CREATE DATABASE game_db;

-- Seleção do banco de dados 'game_db'
USE game_db;

-- Criação da tabela 'players'
CREATE TABLE players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Criação da tabela 'scores'
CREATE TABLE scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  score INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

