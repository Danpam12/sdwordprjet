const express = require("express");
const http = require("http");
const cors = require("cors");
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
  database: "game_db",
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados: " + err.message);
  } else {
    console.log("Conexão bem-sucedida ao banco de dados.");
  }
});

//Configuração do servidor e conexão com Socket.io
server.listen(3004, () => {
  console.log("Server running on port 3004");
});

//Configuração de rota para servir arquivos estáticos
app.use(express.static(__dirname + "/client"));

const players = {}; // Objeto para armazenar os jogadores conectados
let wordList = ["Bola", "OpenAI", "Chatbot", "IA", "cadeira", "cahorro"];
let scoreBoard = {}; // Objeto para armazenar a pontuação dos jogadores
let gameStarted = false; // Variável para controlar se o jogo foi iniciado
let currentWord = ""; // Palavra atual para digitação

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

  // Verificar se há dois jogadores conectados para iniciar o jogo
  if (Object.keys(players).length === 2 && !gameStarted) {
    gameStarted = true;
    currentWord = getRandomWord();
    io.emit("startGame", currentWord); // Envia um evento para iniciar o jogo para todos os jogadores
  }

  // Enviar a palavra atual para o jogador
  socket.emit("newWord", currentWord);

  // Eventos de digitação de palavras
  socket.on("typedWord", (typedWord) => {
    if (gameStarted && typedWord === currentWord) {
      // Atualizar a pontuação do jogador
      players[socket.id].score += 1;
      io.emit("updateScores", players); // Enviar a nova pontuação para todos os jogadores

      // Escolher uma nova palavra aleatória
      currentWord = getRandomWord();
      io.emit("newWord", currentWord); // Enviar a nova palavra para todos os jogadores
    }
  });

  // Evento de desconexão do jogador
  socket.on("disconnect", () => {
    console.log(`Jogador ${socket.id} desconectado`);

    // Remover o jogador da lista de jogadores e atualizar o ranking
    delete players[socket.id];
    io.emit("updateScores", players);

    // Verificar se o jogo precisa ser interrompido por falta de jogadores
    if (Object.keys(players).length < 2 && gameStarted) {
      gameStarted = false;
      io.emit("stopGame"); // Envia um evento para parar o jogo para todos os jogadores
    }
  });
});



