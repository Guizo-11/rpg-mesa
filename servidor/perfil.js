const crypto = require('crypto');
const { db, salvar } = require('./banco');
const { exigirLogin } = require('./util');
const { hashSenha, senhaCorreta, nomeValido } = require('./contas');
const { imagemValida, apagarImagem } = require('./imagens');
const salas = require('./salas');

function dadosDoPerfil(chave) {
  const u = db.usuarios[chave];
  return { nome: u.nome, login: chave.slice(2), foto: u.foto || null };
}

function ligar({ io, socket, ouvir }) {
  ouvir('perfil', (_, responder) => {
    if (!exigirLogin(socket, responder)) return;
    responder({ ok: true, ...dadosDoPerfil(socket.data.usuario) });
  });

  // aceita { nome } e/ou { foto } (foto: null remove)
  ouvir('salvar-perfil', (dados, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const chave = socket.data.usuario;
    const u = db.usuarios[chave];

    let novoNome = null;
    if (typeof dados.nome === 'string') {
      if (!nomeValido(dados.nome)) {
        return responder({ ok: false, erro: 'O nome precisa ter de 2 a 16 letras' });
      }
      novoNome = dados.nome.trim();
    }

    let mudarFoto = false;
    if ('foto' in dados) {
      if (dados.foto !== null && !imagemValida(dados.foto, 'foto', chave)) {
        return responder({ ok: false, erro: 'Foto inválida' });
      }
      mudarFoto = true;
    }

    if (novoNome) u.nome = novoNome;
    if (mudarFoto) {
      if (u.foto && u.foto !== dados.foto) apagarImagem(u.foto);
      u.foto = dados.foto;
    }
    salvar();
    salas.atualizarJogadores(io, chave);
    responder({ ok: true, ...dadosDoPerfil(chave) });
  });

  ouvir('trocar-senha', ({ atual, nova }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const u = db.usuarios[socket.data.usuario];
    if (typeof atual !== 'string' || atual.length > 100 || !senhaCorreta(atual, u)) {
      return responder({ ok: false, erro: 'Senha atual incorreta' });
    }
    if (typeof nova !== 'string' || nova.length < 4 || nova.length > 100) {
      return responder({ ok: false, erro: 'A nova senha precisa ter pelo menos 4 caracteres' });
    }
    u.sal = crypto.randomBytes(16).toString('hex');
    u.hash = hashSenha(nova, u.sal);
    salvar();
    responder({ ok: true });
  });
}

module.exports = { ligar };