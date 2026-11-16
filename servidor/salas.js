const { db, salvar } = require('./banco');
const escala = require('./escala');

if (!db.campanhas) db.campanhas = {};

const salas = {};

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

function salaDoMestre(socket) {
  const sala = salas[socket.data.sala];
  if (!sala || sala.mestre !== socket.data.usuario) return null;
  return sala;
}

// o que a campanha guarda: mapa, grade, tokens e as marcações de cada mapa
function estadoSalvavel(sala) {
  return JSON.stringify({
    mapaId: sala.mapaId,
    grade: sala.grade,
    tokens: sala.tokens,
    proximo: sala.proximo,
    marcasPorMapa: sala.marcasPorMapa || {},
    fichas: sala.fichas || {},
    nevoaPorMapa: sala.nevoaPorMapa || {}
  });
}

// cria (ou devolve) a sala ao vivo de uma campanha salva
function abrirDaCampanha(campanha) {
  campanha.ultimoAcesso = Date.now();
  salvar();
  const codigo = campanha.codigo;
  if (!salas[codigo]) {
    const mapa = campanha.mapaId && db.mapas[campanha.mapaId] ? db.mapas[campanha.mapaId] : null;
    const sala = {
      campanhaId: campanha.id,
      mestre: campanha.mestre,
      jogadores: {},
      mapa: mapa ? '/mapas/' + mapa.arquivo : null,
      mapaId: mapa ? campanha.mapaId : null,
      grade: escala.validar(campanha.grade, escala.padrao()),
      tokens: JSON.parse(JSON.stringify(campanha.tokens || {})),
      proximo: campanha.proximo || 1,
      marcasPorMapa: JSON.parse(JSON.stringify(campanha.marcasPorMapa || {})),
      nevoaPorMapa: JSON.parse(JSON.stringify(campanha.nevoaPorMapa || {})),
      fichas: JSON.parse(JSON.stringify(campanha.fichas || {})),
      vazioDesde: null,
      ultimoSalvo: ''
    };
    sala.ultimoSalvo = estadoSalvavel(sala);
    salas[codigo] = sala;
  }
  return salas[codigo];
}

// guarda no disco o que mudou nas salas ao vivo
function salvarSalas() {
  let mudou = false;
  for (const codigo in salas) {
    const sala = salas[codigo];
    const campanha = db.campanhas[sala.campanhaId];
    if (!campanha) continue;
    const atual = estadoSalvavel(sala);
    if (atual === sala.ultimoSalvo) continue;
    const e = JSON.parse(atual);
    campanha.mapaId = e.mapaId;
    campanha.grade = e.grade;
    campanha.tokens = e.tokens;
    campanha.proximo = e.proximo;
    campanha.nevoaPorMapa = e.nevoaPorMapa;
    campanha.marcasPorMapa = e.marcasPorMapa;
    campanha.fichas = e.fichas;
    sala.ultimoSalvo = atual;
    mudou = true;
  }
  if (mudou) salvar();
}

setInterval(salvarSalas, 5000);
process.on('SIGTERM', () => { salvarSalas(); process.exit(0); });
process.on('SIGINT', () => { salvarSalas(); process.exit(0); });

// limpa salas vazias há mais de 30 minutos (o progresso já está salvo)
setInterval(() => {
  salvarSalas();
  const agora = Date.now();
  for (const codigo in salas) {
    const v = salas[codigo].vazioDesde;
    if (v && agora - v > 30 * 60 * 1000) delete salas[codigo];
  }
}, 60 * 1000);

function sairDaSala(io, socket) {
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

function entrarNaSala(io, socket, codigo) {
  if (socket.data.sala && socket.data.sala !== codigo) sairDaSala(io, socket);
  const sala = salas[codigo];
  sala.vazioDesde = null;
  sala.jogadores[socket.id] = { chave: socket.data.usuario };
  socket.join(codigo);
  socket.data.sala = codigo;
  io.to(codigo).emit('jogadores', listaJogadores(sala));
  socket.emit('estado', {
    mapa: sala.mapa,
    grade: sala.grade,
    tokens: sala.tokens,
    voce: socket.data.usuario,
    mestre: sala.mestre === socket.data.usuario
  });
}

// campanha apagada: avisa quem está dentro e fecha a sala
function encerrar(io, codigo) {
  if (!salas[codigo]) return;
  io.to(codigo).emit('campanha-encerrada', {});
  delete salas[codigo];
}

function ligar({ io, socket, ouvir }) {
  // grade e escala: o mestre define, e o mapa em uso lembra
  ouvir('definir-grade', (dados) => {
    const sala = salaDoMestre(socket);
    if (!sala) return;
    sala.grade = escala.validar(dados, sala.grade);
    if (sala.mapaId && db.mapas[sala.mapaId]) {
      db.mapas[sala.mapaId].grade = sala.grade;
      salvar();
    }
    io.to(socket.data.sala).emit('grade', sala.grade);
  });

  socket.on('disconnect', () => sairDaSala(io, socket));
}

module.exports = {
  ligar,
  lista: salas,
  salaDoMestre,
  atualizarJogadores,
  abrirDaCampanha,
  entrar: entrarNaSala,
  encerrar
};