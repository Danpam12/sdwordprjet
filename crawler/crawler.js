const axios = require('axios');
const cheerio = require('cheerio');
const mysql = require('mysql2/promise');

async function crawler() {
  try {
    const response = await axios.get('https://pt.wikipedia.org');
    const html = response.data;

    // Carrega o conteúdo HTML usando o cheerio
    const $ = cheerio.load(html);

    // Extrai as palavras das tags <p>
    const words = [];
    $('p').each((index, element) => {
      const texto = $(element).text().trim();
      if (texto) {
        const cleanedWords = texto.match(/[a-zA-ZÀ-ÖØ-öø-ÿ]+/g); // Extrai apenas palavras sem pontuação, números e aspas
        if (cleanedWords) {
          words.push(...cleanedWords.map(word => word.toLowerCase())); // Converte as palavras para minúsculas e adiciona ao array
        }
      }
    });

    // Conecta-se ao banco de dados
    const connection = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "root",
      database: "game_db",
      port: 3307
    });

    // Insere as palavras no banco de dados
    for (const word of words) {
      await connection.query('INSERT INTO words (word) VALUES (?)', [word]);
    }

    // Fecha a conexão com o banco de dados
    await connection.end();

    console.log('Crawler concluído!');
    console.log(words);
  } catch (error) {
    console.error('Ocorreu um erro:', error);
  }
}

crawler();




