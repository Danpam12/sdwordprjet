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

const playerNames = {}; // Objeto para mapear o ID do jogador ao nome dele

io.on("connection", (socket) => {
  console.log(`Novo jogador ${socket.id} conectado`);

  //Lógica do jogo, pontuação, ranking, etc.
  players[socket.id] = {
  score: 0,
  };

  // Lógica para associar o nome ao socket.id
  socket.on("setPlayerName", (playerName) => {
   players[socket.id].name = playerName;
   console.log(`Jogador ${socket.id} definido como ${playerName}`);



    // Inserir o jogador no banco de dados
    const insertQuery = `INSERT INTO scores (player_id, score) VALUES ('${socket.id}', ${players[socket.id].score})`;
    // Executar a consulta SQL para inserir o jogador na tabela de pontuações

    // Verificar se há dois jogadores conectados para iniciar o jogo
    if (Object.keys(players).length === 2 && !gameStarted) {
      gameStarted = true;
      currentWord = getRandomWord();
      io.emit("startGame", currentWord); // Envia um evento para iniciar o jogo para todos os jogadores
    }
  });


    // Enviar a palavra atual para o jogador
    socket.emit("newWord", currentWord);

    // Eventos de digitação de palavras
    socket.on("typedWord", (typedWord) => {
    if (gameStarted && typedWord === currentWord) {
      // Atualizar a pontuação do jogador
       players[socket.id].score += 1;
      io.emit("updateScores", players); // Enviar a nova pontuação para todos os jogadores

      // Inserir os dados do jogador e pontuação no banco de dados
      const playerName = socket.id; // Use o ID do socket como nome do jogador neste exemplo
      const score = players[socket.id].score;
      const insertQuery = `INSERT INTO scores (player_id, score) VALUES ('${socket.id}', ${score})`;
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
    delete players[socket.id];
    io.emit("updateScores", players);

    // Verificar se o jogo precisa ser interrompido por falta de jogadores
    if (Object.keys(players).length < 2 && gameStarted) {
      gameStarted = false;
      io.emit("stopGame"); // Envia um evento para parar o jogo para todos os jogadores
    }
  });
});



