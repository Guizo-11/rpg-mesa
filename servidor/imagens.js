const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { db, salvar, PASTA_IMAGENS } = require('./banco');
const { usuarioDoToken } = require('./contas');
const { tem } = require('./util');

const TIPOS = {
  token: { prefixo: 't_', ext: 'png', mime: 'image/png' },
  foto: { prefixo: 'f_', ext: 'jpg', mime: 'image/jpeg' }
};

// confere se o endereço é de uma imagem nossa, que existe e pertence a essa pessoa
function imagemValida(url, tipo, chave) {
  if (!tem(TIPOS, tipo) || typeof url !== 'string') return false;
  const cfg = TIPOS[tipo];
  const re = new RegExp('^/imagens/' + cfg.prefixo + '[0-9a-f]{16}\\.' + cfg.ext + '$');
  return re.test(url)
    && db.imagens[url] === chave
    && fs.existsSync(path.join(PASTA_IMAGENS, path.basename(url)));
}

function apagarImagem(url) {
  if (typeof url !== 'string') return;
  delete db.imagens[url];
  fs.unlink(path.join(PASTA_IMAGENS, path.basename(url)), () => {});
}

function rotas(app) {
  app.post('/upload-imagem', express.raw({ type: ['image/png', 'image/jpeg'], limit: '4mb' }), (req, res) => {
    const chave = usuarioDoToken(req.get('x-token'));
    if (!chave) return res.status(401).json({ ok: false, erro: 'Faça login de novo' });
    const tipo = req.get('x-tipo');
    const cfg = tem(TIPOS, tipo) ? TIPOS[tipo] : null;
    if (!cfg || !req.is(cfg.mime)) return res.status(400).json({ ok: false, erro: 'Tipo inválido' });
    if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
      return res.status(400).json({ ok: false, erro: 'Imagem inválida' });
    }
    const arquivo = cfg.prefixo + crypto.randomBytes(8).toString('hex') + '.' + cfg.ext;
    fs.writeFileSync(path.join(PASTA_IMAGENS, arquivo), req.body);
    const url = '/imagens/' + arquivo;
    db.imagens[url] = chave;
    salvar();
    res.json({ ok: true, url });
  });

  app.use('/imagens', express.static(PASTA_IMAGENS));
}

module.exports = { rotas, imagemValida, apagarImagem };