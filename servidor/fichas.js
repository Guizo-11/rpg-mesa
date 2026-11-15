// ficha do token: as barras são públicas, a ficha só o dono e o mestre veem
const { db, salvar } = require('./banco');
const { tem } = require('./util');
const salas = require('./salas');
const sistemas = require('./sistemas');

function sistemaDaSala(sala) {
  const c = db.campanhas[sala.campanhaId];
  return sistemas.obter(c && c.sistema);
}

function podeVer(sala, token, socket) {
  return sala.mestre === socket.data.usuario || (!!token.dono && token.dono === socket.data.usuario);
}

function ligar({ io, socket, ouvir }) {
  ouvir('sistema', (_, responder) => {
    const sala = salas.lista[socket.data.sala];
    if (!sala) return responder({ ok: false });
    responder({ ok: true, sistema: sistemaDaSala(sala), sistemas: sistemas.lista() });
  });

  // o mestre troca o sistema da campanha
  ouvir('definir-sistema', ({ id }, responder) => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    const campanha = sala ? db.campanhas[sala.campanhaId] : null;
    if (!sala || !campanha || sala.mestre !== socket.data.usuario) return responder({ ok: false });
    if (!sistemas.existe(id)) return responder({ ok: false });
    campanha.sistema = id;
    salvar();
    Object.values(sala.tokens).forEach((t) => {
      delete t.barras;
      delete t.pv;
      delete t.pvMax;
    });
    io.to(codigo).emit('sistema-mudou', { sistema: sistemas.obter(id) });
    io.to(codigo).emit('tokens', sala.tokens);
    responder({ ok: true });
  });

  ouvir('obter-ficha', ({ id }, responder) => {
    const sala = salas.lista[socket.data.sala];
    if (!sala || !tem(sala.tokens, id)) return responder({ ok: false });
    const token = sala.tokens[id];
    if (!podeVer(sala, token, socket)) {
      return responder({ ok: false, erro: 'Só o dono e o mestre veem a ficha' });
    }
    sala.fichas = sala.fichas || {};
    responder({
      ok: true,
      nome: token.nome,
      ficha: sala.fichas[id] || sistemas.fichaVazia(sistemaDaSala(sala))
    });
  });

  ouvir('salvar-ficha', ({ id, ficha }, responder) => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    if (!sala || !tem(sala.tokens, id)) return responder({ ok: false });
    const token = sala.tokens[id];
    if (!podeVer(sala, token, socket)) return responder({ ok: false, erro: 'Sem permissão' });

    const s = sistemaDaSala(sala);
    const limpa = sistemas.limpar(s, ficha);
    sala.fichas = sala.fichas || {};
    sala.fichas[id] = limpa;

    // as barras (vida, sanidade...) vão pro token, e todos veem
    token.barras = s.recursos
      .filter((r) => r.barra && limpa.recursos[r.id])
      .map((r) => ({ id: r.id, v: limpa.recursos[r.id].v, max: limpa.recursos[r.id].max, cor: r.cor }));
    io.to(codigo).emit('token-barras', { id, barras: token.barras });

    // quem mais pode ver essa ficha recebe a versão nova
    const naSala = io.sockets.adapter.rooms.get(codigo) || new Set();
    naSala.forEach((sid) => {
      const outro = io.sockets.sockets.get(sid);
      if (outro && outro.id !== socket.id && podeVer(sala, token, outro)) {
        outro.emit('ficha-atualizada', { id, nome: token.nome, ficha: limpa });
      }
    });

    responder({ ok: true, ficha: limpa });
  });
}

module.exports = { ligar };
// fim de fichas.js