const crypto = require('crypto');
const { db, salvar } = require('./banco');
const { exigirLogin, tem } = require('./util');
const salas = require('./salas');

if (!db.campanhas) db.campanhas = {};

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += letras[Math.floor(Math.random() * letras.length)];
    if (!Object.values(db.campanhas).some((x) => x.codigo === c)) return c;
  }
}

function resumo(c, chave) {
  const sala = salas.lista[c.codigo];
  const mapa = c.mapaId && db.mapas[c.mapaId] ? db.mapas[c.mapaId] : null;
  const participantes = [c.mestre].concat(c.membros)
    .filter((k) => db.usuarios[k])
    .map((k) => ({ nome: db.usuarios[k].nome, foto: db.usuarios[k].foto || null }));
  return {
    id: c.id,
    nome: c.nome,
    codigo: c.mestre === chave ? c.codigo : null,
    souMestre: c.mestre === chave,
    mestreNome: db.usuarios[c.mestre] ? db.usuarios[c.mestre].nome : '?',
    participantes,
    capa: mapa ? '/mapas/' + mapa.arquivo : null,
    ultimoAcesso: c.ultimoAcesso || null,
    aoVivo: !!sala && Object.keys(sala.jogadores).length > 0
  };
}

function minhas(chave) {
  return Object.values(db.campanhas)
    .filter((c) => c.mestre === chave || c.membros.includes(chave))
    .sort((a, b) => (b.ultimoAcesso || b.criadoEm) - (a.ultimoAcesso || a.criadoEm))
    .map((c) => resumo(c, chave));
}

function buscar(id) {
  return tem(db.campanhas, id) ? db.campanhas[id] : null;
}

function ligar({ io, socket, ouvir }) {
  ouvir('minhas-campanhas', (_, responder) => {
    if (!exigirLogin(socket, responder)) return;
    responder({ ok: true, campanhas: minhas(socket.data.usuario) });
  });

  ouvir('criar-campanha', ({ nome }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const chave = socket.data.usuario;
    const titulo = String(nome || '').trim().slice(0, 30);
    if (titulo.length < 2) {
      return responder({ ok: false, erro: 'Dê um nome pra campanha (de 2 a 30 letras)' });
    }
    if (Object.values(db.campanhas).filter((c) => c.mestre === chave).length >= 20) {
      return responder({ ok: false, erro: 'Limite de 20 campanhas como mestre' });
    }
    const id = crypto.randomBytes(6).toString('hex');
    db.campanhas[id] = {
      id,
      nome: titulo,
      mestre: chave,
      codigo: gerarCodigo(),
      membros: [],
      mapaId: null,
      grade: null,
      tokens: {},
      proximo: 1,
      criadoEm: Date.now()
    };
    salvar();
    responder({ ok: true, campanhas: minhas(chave) });
  });

  // abre uma campanha da sua lista
  ouvir('abrir-campanha', ({ id }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const chave = socket.data.usuario;
    const c = buscar(id);
    if (!c || (c.mestre !== chave && !c.membros.includes(chave))) {
      return responder({ ok: false, erro: 'Campanha não encontrada' });
    }
    salas.abrirDaCampanha(c);
    salas.entrar(io, socket, c.codigo);
    responder({ ok: true, codigo: c.codigo, mestre: c.mestre === chave });
  });

  // entrar com o código: vira membro da campanha e ela entra na sua lista
  ouvir('entrar-sala', ({ codigo }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const chave = socket.data.usuario;
    const cod = String(codigo || '').trim().toUpperCase();
    const c = Object.values(db.campanhas).find((x) => x.codigo === cod);
    if (!c) return responder({ ok: false, erro: 'Campanha não encontrada' });
    if (c.mestre !== chave && !c.membros.includes(chave)) {
      c.membros.push(chave);
      salvar();
    }
    salas.abrirDaCampanha(c);
    salas.entrar(io, socket, c.codigo);
    responder({ ok: true, codigo: c.codigo, mestre: c.mestre === chave });
  });

  ouvir('apagar-campanha', ({ id }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const c = buscar(id);
    if (!c || c.mestre !== socket.data.usuario) {
      return responder({ ok: false, erro: 'Só o mestre pode apagar a campanha' });
    }
    salas.encerrar(io, c.codigo);
    delete db.campanhas[id];
    salvar();
    responder({ ok: true, campanhas: minhas(socket.data.usuario) });
  });

  ouvir('sair-campanha', ({ id }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const chave = socket.data.usuario;
    const c = buscar(id);
    if (!c || c.mestre === chave) return responder({ ok: false, erro: 'Não foi possível sair' });
    c.membros = c.membros.filter((m) => m !== chave);
    salvar();
    responder({ ok: true, campanhas: minhas(chave) });
  });
}

module.exports = { ligar };