const crypto = require('crypto');
const salas = require('./salas');

const DURACOES = [5000, 30000, 120000];

function limitar(n) {
  n = Number(n);
  if (!isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function publica(s) {
  return { id: s.id, dono: s.dono, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 };
}

function remover(io, codigo, id) {
  const sala = salas.lista[codigo];
  if (!sala || !sala.setas || !sala.setas[id]) return;
  clearTimeout(sala.setas[id].timer);
  delete sala.setas[id];
  io.to(codigo).emit('seta-removida', { id });
}

function ligar({ io, socket, ouvir }) {
  ouvir('nova-seta', ({ x1, y1, x2, y2, duracao }) => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    if (!sala) return;
    sala.setas = sala.setas || {};
    const dono = socket.data.usuario;

    // no máximo 10 setas por pessoa: a mais antiga sai
    const minhas = Object.values(sala.setas)
      .filter((s) => s.dono === dono)
      .sort((a, b) => a.criadoEm - b.criadoEm);
    while (minhas.length >= 10) remover(io, codigo, minhas.shift().id);

    const d = Number(duracao);
    const ms = d === 0 ? 0 : (DURACOES.includes(d) ? d : 5000);   // 0 = fixa
    const id = crypto.randomBytes(4).toString('hex');
    const seta = {
      id,
      dono,
      x1: limitar(x1),
      y1: limitar(y1),
      x2: limitar(x2),
      y2: limitar(y2),
      criadoEm: Date.now()
    };
    sala.setas[id] = seta;
    if (ms) seta.timer = setTimeout(() => remover(io, codigo, id), ms);
    io.to(codigo).emit('seta', publica(seta));
  });

  // quem desenhou limpa as suas; o mestre limpa todas
  ouvir('limpar-setas', () => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    if (!sala || !sala.setas) return;
    const mestre = sala.mestre === socket.data.usuario;
    Object.values(sala.setas).forEach((s) => {
      if (mestre || s.dono === socket.data.usuario) remover(io, codigo, s.id);
    });
  });

  ouvir('listar-setas', (_, responder) => {
    const sala = salas.lista[socket.data.sala];
    responder({ ok: true, setas: sala && sala.setas ? Object.values(sala.setas).map(publica) : [] });
  });
}

module.exports = { ligar };