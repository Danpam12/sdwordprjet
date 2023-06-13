const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mysql = require("mysql2");
const puppeteer = require('puppeteer');

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

// Função para escolher uma palavra aleatória da lista
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}

// Função para realizar o crawling das palavras
async function runCrawler() {
  // Inicializa o navegador Puppeteer
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Acessa a página web alvo
  await page.goto('https://g1.globo.com/');

  // Extrai os títulos dos artigos
  const articleTitles = await page.evaluate(() => {
    const titles = [];
    const articleElements = document.querySelectorAll('a.feed-post-link');


    for (let i = 0; i < articleElements.length; i++) {
      const titleWords = articleElements[i].textContent.split(' ');
      titles.push(...titleWords);

    }

    return titles;
  });

  // Fecha o navegador Puppeteer
  await browser.close();

  // Atualiza a lista de palavras com os títulos obtidos pelo crawler
  wordList = articleTitles;
  console.log("Lista de palavras atualizada: ", wordList);

  // Verifica se o jogo está em andamento e atualiza a palavra atual
  if (gameStarted) {
    updateCurrentWord();
  }
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
      gameStarted = true;
      runCrawler(); // Iniciar o crawler para obter as palavras atualizadas
      setTimeout(() => {
        updateCurrentWord(); // Atualizar a palavra atual após um pequeno atraso
      }, 1000); // Tempo em milissegundos antes de atualizar a palavra 
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