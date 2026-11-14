const crypto = require('crypto');
const { db, salvar } = require('./banco');

function hashSenha(senha, sal) {
  return crypto.scryptSync(senha, sal, 32).toString('hex');
}

function senhaCorreta(senha, usuario) {
  const a = Buffer.from(hashSenha(senha, usuario.sal), 'hex');
  const b = Buffer.from(usuario.hash, 'hex');
  return crypto.timingSafeEqual(a, b);
}

function novaSessao(chave) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessoes[token] = chave;
  salvar();
  return token;
}

function usuarioDoToken(token) {
  const chave = typeof token === 'string' ? db.sessoes[token] : null;
  return (typeof chave === 'string' && db.usuarios[chave]) ? chave : null;
}

function nomeValido(nome) {
  return typeof nome === 'string' && nome.trim().length >= 2 && nome.trim().length <= 16;
}

function ligar({ socket, ouvir }) {
  ouvir('registrar', ({ nome, senha }, responder) => {
    if (!nomeValido(nome)) return responder({ ok: false, erro: 'O nome precisa ter de 2 a 16 letras' });
    if (typeof senha !== 'string' || senha.length < 4 || senha.length > 100) {
      return responder({ ok: false, erro: 'A senha precisa ter pelo menos 4 caracteres' });
    }
    nome = nome.trim();
    const chave = 'u:' + nome.toLowerCase();
    if (db.usuarios[chave]) return responder({ ok: false, erro: 'Esse nome já existe' });
    const sal = crypto.randomBytes(16).toString('hex');
    db.usuarios[chave] = { nome, sal, hash: hashSenha(senha, sal) };
    const token = novaSessao(chave);
    socket.data.usuario = chave;
    responder({ ok: true, token, nome });
  });

  ouvir('login', ({ nome, senha }, responder) => {
    const chave = 'u:' + String(nome || '').trim().toLowerCase();
    const usuario = db.usuarios[chave];
    if (!usuario || typeof senha !== 'string' || senha.length > 100 || !senhaCorreta(senha, usuario)) {
      return responder({ ok: false, erro: 'Nome ou senha incorretos' });
    }
    const token = novaSessao(chave);
    socket.data.usuario = chave;
    responder({ ok: true, token, nome: usuario.nome });
  });

  ouvir('retomar', ({ token }, responder) => {
    const chave = usuarioDoToken(token);
    if (!chave) return responder({ ok: false });
    socket.data.usuario = chave;
    responder({ ok: true, nome: db.usuarios[chave].nome });
  });
}

module.exports = { ligar, usuarioDoToken, hashSenha, senhaCorreta, nomeValido };