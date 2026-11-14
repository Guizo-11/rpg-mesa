const fs = require('fs');
const path = require('path');

const PASTA_DADOS = path.join(__dirname, '..', 'dados');
const PASTA_MAPAS = path.join(PASTA_DADOS, 'mapas');
const PASTA_IMAGENS = path.join(PASTA_DADOS, 'imagens');
const ARQ_DB = path.join(PASTA_DADOS, 'db.json');
fs.mkdirSync(PASTA_MAPAS, { recursive: true });
fs.mkdirSync(PASTA_IMAGENS, { recursive: true });

let db = { usuarios: {}, sessoes: {}, mapas: {}, tokens: {}, imagens: {} };
try {
  db = Object.assign(db, JSON.parse(fs.readFileSync(ARQ_DB, 'utf8')));
} catch (e) {}

function salvar() {
  fs.writeFileSync(ARQ_DB, JSON.stringify(db));
}

module.exports = { db, salvar, PASTA_MAPAS, PASTA_IMAGENS };