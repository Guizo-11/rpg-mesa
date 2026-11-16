const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const { criarOuvinte } = require('./servidor/util');
const contas = require('./servidor/contas');
const perfil = require('./servidor/perfil');
const salas = require('./servidor/salas');
const campanhas = require('./servidor/campanhas');
const mapas = require('./servidor/mapas');
const imagens = require('./servidor/imagens');
const tokens = require('./servidor/tokens');
const setas = require('./servidor/setas');
const nevoa = require('./servidor/nevoa');
const fichas = require('./servidor/fichas');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

mapas.rotas(app);
imagens.rotas(app);
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  const ctx = { io, socket, ouvir: criarOuvinte(socket) };
  contas.ligar(ctx);
  perfil.ligar(ctx);
  salas.ligar(ctx);
  campanhas.ligar(ctx);
  mapas.ligar(ctx);
  tokens.ligar(ctx);
  nevoa.ligar(ctx);
  setas.ligar(ctx);
  fichas.ligar(ctx);
});

const PORTA = process.env.PORT || 3000;
server.listen(PORTA, () => console.log('Servidor rodando na porta ' + PORTA));