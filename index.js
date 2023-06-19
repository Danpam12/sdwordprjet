const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuração do banco de dados MySQL
const dbConfig = {
  host: "localhost",
  user: "pam",
  password: "123",
  database: "game_db",
};

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados: " + err.message);
  } else {
    console.log("Conexão bem-sucedida ao banco de dados.");
    loadWordList(); // Carrega a lista de palavras do banco de dados após a conexão ser estabelecida
  }
});

// Configuração do servidor e conexão com Socket.io
server.listen(3004, () => {
  console.log("Server running on port 3004");
});

// Configuração de rota para servir arquivos estáticos
app.use(express.static(__dirname + "/client"));

const players = {}; // Objeto para armazenar os jogadores conectados
let wordList = [];
let scoreBoard = {}; // Objeto para armazenar a pontuação dos jogadores
let gameStarted = false; // Variável para controlar se o jogo foi iniciado
let currentWord = ""; // Palavra atual para digitação
let readyToStart = false; // Variável para controlar se o jogo está pronto para começar

// Função para escolher uma palavra aleatória da lista
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}

// Função para carregar a lista de palavras do banco de dados
function loadWordList() {
  const selectQuery = "SELECT word FROM words";
  db.query(selectQuery, (err, results) => {
    if (err) {
      console.error("Erro ao carregar a lista de palavras do banco de dados: " + err.message);
    } else {
      wordList = results.map((row) => row.word.toLowerCase());
      console.log("Lista de palavras carregada do banco de dados: ", wordList);

      // Verifica se o jogo está em andamento e atualiza a palavra atual
      if (gameStarted) {
        updateCurrentWord();
      }
    }
  });
}

// Função para atualizar a palavra atual do jogo
function updateCurrentWord() {
  currentWord = getRandomWord();
  io.emit("newWord", currentWord); // Enviar a nova palavra para todos os jogadores
}

// Função para gerar um valor hash para o player_id
function generatePlayerId(socketId) {
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    const char = socketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Converter para inteiro de 32 bits
  }
  return hash;
}

io.on("connection", (socket) => {
  console.log(`Novo jogador ${socket.id} conectado`);

  // Lógica do jogo, pontuação, ranking, etc.
  const playerId = generatePlayerId(socket.id);

  players[playerId] = {
    id: playerId,
    score: 0,
  };

  socket.on("setPlayerName", (playerName) => {
    players[playerId].name = playerName;
    console.log(`Jogador ${players[playerId].id} definido como ${playerName}`);

    // Inserir o jogador no banco de dados
    const insertQuery = `INSERT INTO scores (player_id, score) VALUES (${playerId}, ${players[playerId].score})`;

    // Verificar se há dois jogadores conectados para iniciar o jogo
    if (Object.keys(players).length >= 2 && !gameStarted) {
      readyToStart = true; // Ponto 2: O jogo está pronto para começar
      io.emit("readyToStart", true); // Envia um evento para todos os jogadores indicando que o jogo está pronto para começar

      // Iniciar a contagem regressiva
      let countdown = 3; // Definir o tempo de contagem regressiva em segundos
      io.emit("countdown", countdown); // Enviar o valor inicial do contador para todos os jogadores

      const countdownInterval = setInterval(() => {
        countdown--;
        io.emit("countdown", countdown); // Enviar o novo valor do contador para todos os jogadores

        if (countdown === 0) {
          clearInterval(countdownInterval);
          startGame(); // Iniciar o jogo após a contagem regressiva
        }
      }, 1000);
    }
  });

  // Eventos de digitação de palavras
  socket.on("typedWord", (typedWord) => {
    if (gameStarted && typedWord === currentWord) {
      // Atualizar a pontuação do jogador
      players[playerId].score += 1;
      io.emit("updateScores", players); // Enviar a nova pontuação para todos os jogadores

      // Inserir os dados do jogador e pontuação no banco de dados
      const playerName = players[playerId].name;
      const score = players[playerId].score;

      const insertQuery = `INSERT INTO scores (player_id, player_name, score) VALUES (${playerId}, '${playerName}', ${score})`;
      db.query(insertQuery, (err, result) => {
        if (err) {
          console.error("Erro ao inserir dados no banco de dados: " + err.message);
        } else {
          console.log("Dados do jogador inseridos no banco de dados.");
        }
      });

      // Escolher uma nova palavra aleatória
      currentWord = getRandomWord();
      io.emit("newWord", currentWord); // Enviar a nova palavra para todos os jogadores
    }
  });

  // Evento de desconexão do jogador
  socket.on("disconnect", () => {
    console.log(`Jogador ${socket.id} desconectado`);

    // Remover o jogador da lista de jogadores e atualizar o ranking
    delete players[playerId];
    io.emit("updateScores", players);

    // Verificar se o jogo precisa ser interrompido por falta de jogadores
    if (Object.keys(players).length < 2 && gameStarted) {
      gameStarted = false;
      io.emit("stopGame"); // Envia um evento para parar o jogo para todos os jogadores
    }
  });
});

function startGame() {
  if (readyToStart) {
    gameStarted = true;
    readyToStart = false;

    // Escolher a primeira palavra aleatória
    currentWord = getRandomWord();
    io.emit("startGame", currentWord); // Enviar o sinal de início do jogo e a primeira palavra para todos os jogadores

    // Iniciar o envio de palavras a cada segundo
    const wordInterval = setInterval(() => {
      currentWord = getRandomWord();
      io.emit("newWord", currentWord); // Enviar a nova palavra para todos os jogadores
    }, 1000);

    // Definir a duração do jogo em segundos (por exemplo, 60 segundos)
    const gameDuration = 60;
    setTimeout(() => {
      clearInterval(wordInterval);
      gameStarted = false;
      io.emit("stopGame"); // Enviar o sinal para parar o jogo para todos os jogadores
    }, gameDuration * 1000);
  }
}
