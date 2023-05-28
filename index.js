const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuração do banco de dados MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "pam",
    password: "123",
    database: "game_db"
  });
  
  db.connect((err) => {
    if (err) {
      console.error("Erro ao conectar ao banco de dados: " + err.message);
    } else {
      console.log("Conexão bem-sucedida ao banco de dados.");
    }
  });
  
  // Configuração do servidor e conexão com Socket.io
  server.listen(3003, () => {
    console.log("Server running on port 3003");
  });
  
  // Configuração de rota para servir arquivos estáticos
  app.use(express.static(__dirname + "/client"));
  
  // Lógica do jogo e eventos Socket.io

  
    // ...

// Lógica do jogo e eventos Socket.io
const players = {}; // Objeto para armazenar os jogadores conectados
let wordList = ["Bola", "OpenAI", "Chatbot", "IA", "cadeira", "cahorro"];
let scoreBoard = {}; // Objeto para armazenar a pontuação dos jogadores

// Função para escolher uma palavra aleatória da lista
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}


io.on("connection", (socket) => {
    console.log(`Novo jogador ${socket.id} conectado`);
  
    // Lógica do jogo, pontuação, ranking, etc.
    players[socket.id] = {
      score: 0,
    };
  
    // Enviar a palavra inicial para o jogador
    socket.emit("newWord", getRandomWord());
  
    // Eventos de digitação de palavras
    socket.on("typedWord", (word) => {
      console.log(`Palavra digitada pelo jogador ${socket.id}: ${word}`);
  
      // Verificar se a palavra digitada está correta
      const currentWord = wordList[0];
      if (word === currentWord) {
        // Atualizar a pontuação do jogador
        players[socket.id].score += currentWord.length;
        io.emit("updateScores", players); // Enviar a nova pontuação para todos os jogadores
  
        // Remover a palavra correta da lista
        wordList.shift();
  
        // Enviar uma nova palavra para o jogador
        socket.emit("newWord", getRandomWord());
      }
    });
  
    // Evento de desconexão do jogador
    socket.on("disconnect", () => {
      console.log(`Jogador ${socket.id} desconectado`);
  
      // Remover o jogador da lista de jogadores e atualizar o ranking
      delete players[socket.id];
      io.emit("updateScores", players);
    });
  });