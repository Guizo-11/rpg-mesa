const crypto = require('crypto');
const { db, salvar } = require('./banco');
const { exigirLogin, tem } = require('./util');
const { imagemValida } = require('./imagens');
const salas = require('./salas');

const CORES = ['#e63946', '#2a9d8f', '#f4a261', '#457b9d', '#9b5de5', '#06b6d4', '#d4a017', '#ef476f'];

// condições que dá pra marcar no token (os emojis e nomes ficam no extras-token.js)
const CONDICOES = ['sangrando', 'envenenado', 'atordoado', 'caido', 'inconsciente', 'chamas',
  'congelado', 'medo', 'preso', 'invisivel', 'protegido', 'morto'];

function limitar(n) {
  n = Number(n);
  if (isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function corValida(cor, indice) {
  if (typeof cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cor)) return cor;
  return CORES[indice % CORES.length];
}

function tokensSalvos(chave) {
  return Object.values(db.tokens)
    .filter((t) => t.dono === chave)
    .sort((a, b) => b.criadoEm - a.criadoEm)
    .map((t) => ({ id: t.id, nome: t.nome, cor: t.cor, imagem: t.imagem || null }));
}

// o mestre controla todos; o jogador, só os tokens atribuídos a ele
function podeControlar(sala, token, socket) {
  return sala.mestre === socket.data.usuario || (!!token.dono && token.dono === socket.data.usuario);
}

// põe o token no ponto pedido (o meio da tela de quem colocou) ou no meio do mapa
function colocar(sala, salvo, x, y) {
  const id = 't' + sala.proximo;
  sala.proximo++;
  sala.tokens[id] = {
    nome: salvo.nome,
    cor: salvo.cor,
    imagem: salvo.imagem || null,
    x: limitar(x),
    y: limitar(y),
    rot: 0,
    tamanho: 1,
    dono: null
  };
}

// "Goblin" vira "Goblin 2", depois "Goblin 3"... (até 12 letras)
function nomeDaCopia(sala, nome) {
  const base = nome.replace(/\s*\d+$/, '') || nome;
  let maior = 1;
  Object.values(sala.tokens).forEach((t) => {
    const m = String(t.nome).match(/^(.*?)\s*(\d+)$/);
    if (m && m[1] === base) maior = Math.max(maior, Number(m[2]));
  });
  const fim = ' ' + (maior + 1);
  return base.slice(0, 12 - fim.length).trim() + fim;
}

// lugar livre na mesma linha: um quadrado à direita, dois, três... (depois tenta à esquerda)
function lugarAoLado(sala, t) {
  const passo = (t.tamanho || 1) / sala.grade.colunas;
  const ocupado = (x) => Object.values(sala.tokens)
    .some((o) => Math.abs(o.x - x) < passo / 2 && Math.abs(o.y - t.y) < passo / 2);
  for (const lado of [1, -1]) {
    for (let k = 1; k <= 10; k++) {
      const x = t.x + lado * k * passo;
      if (x >= 0 && x <= 1 && !ocupado(x)) return x;
    }
  }
  return limitar(t.x + passo);
}

function ligar({ io, socket, ouvir }) {
  // --- biblioteca do mestre ---
  ouvir('listar-tokens', (_, responder) => {
    if (!exigirLogin(socket, responder)) return;
    responder({ ok: true, tokens: tokensSalvos(socket.data.usuario) });
  });

  // cria o token na biblioteca e já coloca na mesa
  ouvir('criar-token', ({ nome, cor, imagem, x, y }, responder) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala) return responder({ ok: false });
    const id = crypto.randomBytes(6).toString('hex');
    const salvo = {
      id,
      nome: String(nome || 'Token').trim().slice(0, 12) || 'Token',
      cor: corValida(cor, sala.proximo),
      imagem: imagemValida(imagem, 'token', socket.data.usuario) ? imagem : null,
      dono: socket.data.usuario,
      criadoEm: Date.now()
    };
    db.tokens[id] = salvo;
    salvar();
    colocar(sala, salvo, x, y);
    io.to(socket.data.sala).emit('tokens', sala.tokens);
    responder({ ok: true, tokens: tokensSalvos(socket.data.usuario) });
  });

  // puxa um token da biblioteca para a mesa
  ouvir('colocar-token', ({ id, x, y }) => {
    const sala = salas.salaDoMestre(socket);
    const salvo = db.tokens[id];
    if (!sala || !salvo || salvo.dono !== socket.data.usuario) return;
    colocar(sala, salvo, x, y);
    io.to(socket.data.sala).emit('tokens', sala.tokens);
  });

  ouvir('apagar-token-salvo', ({ id }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const salvo = db.tokens[id];
    if (!salvo || salvo.dono !== socket.data.usuario) return responder({ ok: false });
    delete db.tokens[id];
    salvar();
    responder({ ok: true, tokens: tokensSalvos(socket.data.usuario) });
  });

  // --- tokens na mesa ---
  ouvir('mover-token', ({ id, x, y }) => {
    const sala = salas.lista[socket.data.sala];
    if (!sala || !tem(sala.tokens, id)) return;
    const t = sala.tokens[id];
    if (!podeControlar(sala, t, socket)) return;
    t.x = limitar(x);
    t.y = limitar(y);
    socket.to(socket.data.sala).emit('token-movido', { id, x: t.x, y: t.y });
  });

  ouvir('girar-token', ({ id, rot }) => {
    const sala = salas.lista[socket.data.sala];
    if (!sala || !tem(sala.tokens, id)) return;
    const t = sala.tokens[id];
    if (!podeControlar(sala, t, socket)) return;
    let r = Math.round(Number(rot));
    if (!isFinite(r)) r = 0;
    t.rot = ((r % 360) + 360) % 360;
    socket.to(socket.data.sala).emit('token-girado', { id, rot: t.rot });
  });

  ouvir('atribuir-token', ({ id, usuario }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala || !tem(sala.tokens, id)) return;
    if (usuario && !tem(db.usuarios, usuario)) return;
    sala.tokens[id].dono = usuario || null;
    io.to(socket.data.sala).emit('tokens', sala.tokens);
  });

  // tamanho livre, arrastando os cantos (só o mestre)
  ouvir('tamanho-token', ({ id, tamanho }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala || !tem(sala.tokens, id)) return;
    const n = Number(tamanho);
    if (!isFinite(n)) return;
    const t = sala.tokens[id];
    t.tamanho = Math.min(12, Math.max(0.25, n));
    socket.to(socket.data.sala).emit('token-redimensionado', { id, tamanho: t.tamanho });
  });

  // o mestre troca o nome ou esconde o token dos jogadores
  ouvir('editar-token', ({ id, nome, oculto }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala || !tem(sala.tokens, id)) return;
    const t = sala.tokens[id];
    if (typeof nome === 'string') t.nome = nome.trim().slice(0, 12) || t.nome;
    if (typeof oculto === 'boolean') t.oculto = oculto;
    io.to(socket.data.sala).emit('tokens', sala.tokens);
  });

  // cópia do token (com a ficha), um quadrado ao lado
  ouvir('duplicar-token', ({ id }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala || !tem(sala.tokens, id)) return;
    const t = sala.tokens[id];
    const copia = JSON.parse(JSON.stringify(t));
    copia.nome = nomeDaCopia(sala, t.nome);
    copia.x = lugarAoLado(sala, t);
    copia.dono = null;
    delete copia.cond;
    const novo = 't' + sala.proximo;
    sala.proximo++;
    sala.tokens[novo] = copia;
    if (sala.fichas && sala.fichas[id]) sala.fichas[novo] = JSON.parse(JSON.stringify(sala.fichas[id]));
    io.to(socket.data.sala).emit('tokens', sala.tokens);
  });

  // condições (envenenado, caído...): o mestre e o dono do token marcam
  ouvir('condicoes-token', ({ id, cond }) => {
    const sala = salas.lista[socket.data.sala];
    if (!sala || !tem(sala.tokens, id)) return;
    const t = sala.tokens[id];
    if (!podeControlar(sala, t, socket)) return;
    t.cond = Array.isArray(cond) ? CONDICOES.filter((c) => cond.includes(c)) : [];
    io.to(socket.data.sala).emit('token-condicoes', { id, cond: t.cond });
  });

  ouvir('remover-token', ({ id }) => {
    const sala = salas.salaDoMestre(socket);
    if (!sala || !tem(sala.tokens, id)) return;
    delete sala.tokens[id];
    if (sala.fichas) delete sala.fichas[id];
    io.to(socket.data.sala).emit('tokens', sala.tokens);
  });
}

module.exports = { ligar };
// fim de tokens.js