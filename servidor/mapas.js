const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { db, salvar, PASTA_MAPAS } = require('./banco');
const { usuarioDoToken } = require('./contas');
const { exigirLogin } = require('./util');
const salas = require('./salas');

function mapasDoUsuario(chave) {
  return Object.values(db.mapas)
    .filter((m) => m.dono === chave)
    .sort((a, b) => b.criadoEm - a.criadoEm)
    .map((m) => ({ id: m.id, nome: m.nome, url: '/mapas/' + m.arquivo }));
}

function rotas(app) {
  app.post('/upload', express.raw({ type: 'image/jpeg', limit: '12mb' }), (req, res) => {
    const chave = usuarioDoToken(req.get('x-token'));
    if (!chave) return res.status(401).json({ ok: false, erro: 'Faça login de novo' });
    if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
      return res.status(400).json({ ok: false, erro: 'Imagem inválida' });
    }
    let nome = 'Mapa';
    try { nome = decodeURIComponent(req.get('x-nome') || 'Mapa'); } catch (e) {}
    nome = nome.trim().slice(0, 40) || 'Mapa';
    const id = crypto.randomBytes(8).toString('hex');
    const arquivo = id + '.jpg';
    fs.writeFileSync(path.join(PASTA_MAPAS, arquivo), req.body);
    db.mapas[id] = { id, nome, arquivo, dono: chave, criadoEm: Date.now() };
    salvar();
    res.json({ ok: true, id });
  });

  app.use('/mapas', express.static(PASTA_MAPAS));
}

function ligar({ io, socket, ouvir }) {
  ouvir('listar-mapas', (_, responder) => {
    if (!exigirLogin(socket, responder)) return;
    responder({ ok: true, mapas: mapasDoUsuario(socket.data.usuario) });
  });

  ouvir('usar-mapa', ({ id }) => {
    const sala = salas.salaDoMestre(socket);
    const mapa = db.mapas[id];
    if (!sala || !mapa || mapa.dono !== socket.data.usuario) return;
    sala.mapa = '/mapas/' + mapa.arquivo;
    io.to(socket.data.sala).emit('mapa', sala.mapa);
  });

  ouvir('apagar-mapa', ({ id }, responder) => {
    if (!exigirLogin(socket, responder)) return;
    const mapa = db.mapas[id];
    if (!mapa || mapa.dono !== socket.data.usuario) return responder({ ok: false });
    const url = '/mapas/' + mapa.arquivo;
    delete db.mapas[id];
    salvar();
    fs.unlink(path.join(PASTA_MAPAS, mapa.arquivo), () => {});
    for (const codigo in salas.lista) {
      if (salas.lista[codigo].mapa === url) {
        salas.lista[codigo].mapa = null;
        io.to(codigo).emit('mapa', null);
      }
    }
    responder({ ok: true, mapas: mapasDoUsuario(socket.data.usuario) });
  });
}

module.exports = { rotas, ligar };