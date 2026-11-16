// névoa de guerra: o mestre cobre o mapa e revela aos poucos; fica guardada por mapa
const salas = require('./salas');

const MAX_TRACOS = 500;
const MAX_PONTOS = 300;

function num(n) {
  n = Number(n);
  if (!isFinite(n)) return 0.5;
  return Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;
}

// cada mapa tem a sua névoa: ligada ou não, como começa (coberto/aberto) e os traços do pincel
function nevoaDe(sala) {
  sala.nevoaPorMapa = sala.nevoaPorMapa || {};
  const chave = sala.mapaId || 'sem-mapa';
  if (!sala.nevoaPorMapa[chave]) {
    sala.nevoaPorMapa[chave] = { ativa: false, base: 'coberto', tracos: [] };
  }
  return sala.nevoaPorMapa[chave];
}

function publica(n) {
  return { ativa: n.ativa, base: n.base, tracos: n.tracos };
}

function ligar({ io, socket, ouvir }) {
  ouvir('nevoa-obter', (_, responder) => {
    const sala = salas.lista[socket.data.sala];
    if (!sala) return responder({ ok: false });
    responder({ ok: true, nevoa: publica(nevoaDe(sala)) });
  });

  // daqui pra baixo, só o mestre
  ouvir('nevoa-ativar', ({ ativa }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala) return;
    const n = nevoaDe(sala);
    n.ativa = !!ativa;
    io.to(socket.data.sala).emit('nevoa', publica(n));
  });

  ouvir('nevoa-traco', (d) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala) return;
    const n = nevoaDe(sala);
    if (!n.ativa || !Array.isArray(d.pontos) || d.pontos.length < 1) return;
    if (n.tracos.length >= MAX_TRACOS) {
      socket.emit('nevoa-aviso', {
        texto: 'A névoa deste mapa tem traços demais. Use "Cobrir tudo" ou "Revelar tudo" pra recomeçar.'
      });
      return;
    }
    const r = Math.min(0.2, Math.max(0.003, Number(d.r) || 0.05));
    const traco = {
      m: d.m === 'c' ? 'c' : 'r',
      r: Math.round(r * 10000) / 10000,
      pontos: d.pontos.slice(0, MAX_PONTOS).map((p) => (Array.isArray(p) ? [num(p[0]), num(p[1])] : [0.5, 0.5]))
    };
    n.tracos.push(traco);
    io.to(socket.data.sala).emit('nevoa-traco', traco);
  });

  // cobre ou revela o mapa inteiro e apaga os traços
  ouvir('nevoa-tudo', ({ base }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala) return;
    const n = nevoaDe(sala);
    n.base = base === 'aberto' ? 'aberto' : 'coberto';
    n.tracos = [];
    io.to(socket.data.sala).emit('nevoa', publica(n));
  });

  ouvir('nevoa-desfazer', () => {
    const sala = salas.salaDoMestre(socket);
    if (!sala) return;
    const n = nevoaDe(sala);
    n.tracos.pop();
    io.to(socket.data.sala).emit('nevoa', publica(n));
  });
}

module.exports = { ligar };
// fim de nevoa.js