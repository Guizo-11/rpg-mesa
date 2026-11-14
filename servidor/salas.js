const { db } = require('./banco');
const { exigirLogin } = require('./util');

const salas = {};

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) {
    c += letras[Math.floor(Math.random() * letras.length)];
  }
  return c;
}

// nome e foto vêm sempre da conta, então mudanças no perfil aparecem na hora
function listaJogadores(sala) {
  const vistos = {};
  Object.values(sala.jogadores).forEach((j) => { vistos[j.chave] = true; });
  return Object.keys(vistos).map((chave) => {
    const u = db.usuarios[chave];
    return { chave, nome: u.nome, foto: u.foto || null };
  });
}

function atualizarJogadores(io, chave) {
  for (const codigo in salas) {
    const sala = salas[codigo];
    if (Object.values(sala.jogadores).some((j) => j.chave === chave)) {
      io.to(codigo).emit('jogadores', listaJogadores(sala));
    }
  }
}

// limpa salas vazias há mais de 30 minutos
setInterval(() => {
  const agora = Date.now();
  for (const codigo in salas) {
    const v = salas[codigo].vazioDesde;
    if (v && agora - v > 30 * 60 * 1000) delete salas[codigo];
  }
}, 60 * 1000);

function salaDoMestre(socket) {
  const sala = salas[socket.data.sala];
  if (!sala || sala.mestre !== socket.data.usuario) return null;
  return sala;
}

function ligar({ io, socket, ouvir }) {
  function sairDaSala() {
    const codigo = socket.data.sala;
    const sala = salas[codigo];
    socket.data.sala = null;
    if (!sala) return;
    socket.leave(codigo);
    delete sala.jogadores[socket.id];
    if (Object.keys(sala.jogadores).length === 0) {
      sala.vazioDesde = Date.now();
    } else {
      io.to(codigo).emit('jogadores', listaJogadores(sala));
    }
  }

  function entrarNaSala(codigo) {
    if (socket.data.sala && socket.data.sala !== codigo) sairDaSala();
    const sala = salas[codigo];
    sala.vazioDesde = null;
    sala.jogadores[socket.id] = { chave: socket.data.usuario };
    socket.join(codigo);
    socket.data.sala = codigo;
    io.to(codigo).emit('jogadores', listaJogadores(sala));
    socket.emit('estado', {
      mapa: sala.mapa,
      tokens: sala.tokens,
      voce: socket.data.usuario,
      mestre: sala.mestre === socket.data.usuario
    });
  }

  ouvir('criar-sala', (_, responder) => {
    if (!exigirLogin(socket, responder)) return;
    let codigo;
    do { codigo = gerarCodigo(); } while (salas[codigo]);
    salas[codigo] = {
      mestre: socket.data.usuario,
      jogadores: {},
      mapa: null,
      tokens: {},
      proximo: 1,
      vazioDesde: null
    };
    entrarNaSala(codigo);
    responder({ ok: true, codigo, mestre: true });
  });

  ouvir('entrar-sala', ({ codigo }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    codigo = String(codigo || '').trim().toUpperCase();
    const sala = salas[codigo];
    if (!sala) return responder({ ok: false, erro: 'Sala não encontrada' });
    entrarNaSala(codigo);
    responder({ ok: true, codigo, mestre: sala.mestre === socket.data.usuario });
  });

  socket.on('disconnect', sairDaSala);
}

module.exports = { ligar, lista: salas, salaDoMestre, atualizarJogadores };