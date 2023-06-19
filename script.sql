-- Criação do banco de dados 'game_db'
CREATE DATABASE game_db;

-- Seleção do banco de dados 'game_db'
USE game_db;

-- Criação da tabela 'players'
CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT,
  name VARCHAR(255)
);

-- Criação da tabela 'scores'
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT,
  player_name VARCHAR(255),
  score INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS words (
  id INT AUTO_INCREMENT PRIMARY KEY,
  word VARCHAR(255) NOT NULL
);
