// marcações do mapa: desenho, texto, seta fixa, ping e a seta "ao vivo"
const crypto = require('crypto');
const salas = require('./salas');

const MAX_POR_PESSOA = 60;

function num(n) {
  n = Number(n);
  if (!isFinite(n)) return 0.5;
  return Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;
}

// aceita só cores no formato #rrggbb
function corValida(c) {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : null;
}

function publica(m) {
  return Object.assign({ id: m.id, tipo: m.tipo, dono: m.dono }, m.dados);
}

// as marcações ficam guardadas por mapa: cada mapa lembra os seus desenhos e textos
function marcasDe(sala) {
  sala.marcasPorMapa = sala.marcasPorMapa || {};
  const chave = sala.mapaId || 'sem-mapa';
  if (!sala.marcasPorMapa[chave]) sala.marcasPorMapa[chave] = {};
  return sala.marcasPorMapa[chave];
}

function removerMarca(io, codigo, id) {
  const sala = salas.lista[codigo];
  if (!sala) return;
  const marcas = marcasDe(sala);
  if (!marcas[id]) return;
  delete marcas[id];
  io.to(codigo).emit('marca-removida', { id });
}

function adicionar(io, codigo, sala, dono, tipo, dados) {
  const marcas = marcasDe(sala);
  sala.seqMarcas = Math.max(Date.now(), (sala.seqMarcas || 0) + 1);
  const minhas = Object.values(marcas)
    .filter((m) => m.dono === dono)
    .sort((a, b) => a.seq - b.seq);
  while (minhas.length >= MAX_POR_PESSOA) removerMarca(io, codigo, minhas.shift().id);
  const id = crypto.randomBytes(4).toString('hex');
  const marca = { id, tipo, dono, dados, seq: sala.seqMarcas };
  marcas[id] = marca;
  io.to(codigo).emit('marca', publica(marca));
}

function ligar({ io, socket, ouvir }) {
  ouvir('nova-marca', (d) => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    if (!sala) return;
    const dono = socket.data.usuario;
    const cor = corValida(d.cor);

    if (d.tipo === 'seta') {
      adicionar(io, codigo, sala, dono, 'seta', {
        x1: num(d.x1), y1: num(d.y1), x2: num(d.x2), y2: num(d.y2), cor
      });
    } else if (d.tipo === 'texto') {
      const texto = String(d.texto || '').trim().slice(0, 40);
      if (!texto) return;
      adicionar(io, codigo, sala, dono, 'texto', { x: num(d.x), y: num(d.y), texto, cor });
    } else if (d.tipo === 'desenho') {
      if (!Array.isArray(d.pontos) || d.pontos.length < 2) return;
      const pontos = d.pontos.slice(0, 800).map((p) => [num(p[0]), num(p[1])]);
      adicionar(io, codigo, sala, dono, 'desenho', { pontos, cor });
    }
  });

  // ping: só aparece e some, nada fica guardado
  ouvir('ping', ({ x, y, cor, puxar }) => {
    const codigo = socket.data.sala;
    if (!salas.lista[codigo]) return;
    const agora = Date.now();
    if (agora - (socket.data.ultimoPing || 0) < 400) return;
    socket.data.ultimoPing = agora;
    io.to(codigo).emit('ping', {
        x: num(x), y: num(y), dono: socket.data.usuario, cor: corValida(cor), puxar: !!puxar && salas.lista[codigo].mestre === socket.data.usuario
    });
  });

  // seta "ao vivo": os outros veem enquanto você arrasta
  ouvir('seta-viva', ({ x1, y1, x2, y2, cor }) => {
    const codigo = socket.data.sala;
    if (!salas.lista[codigo]) return;
    socket.to(codigo).emit('seta-viva', {
      dono: socket.data.usuario,
      x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2),
      cor: corValida(cor)
    });
  });

  ouvir('seta-viva-fim', () => {
    const codigo = socket.data.sala;
    if (!codigo) return;
    socket.to(codigo).emit('seta-viva-fim', { dono: socket.data.usuario });
  });

  // se a pessoa sair no meio do arrasto, a seta dela some
  socket.on('disconnecting', () => {
    for (const sala of socket.rooms) {
      if (sala !== socket.id) socket.to(sala).emit('seta-viva-fim', { dono: socket.data.usuario });
    }
  });

  ouvir('desfazer', () => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    if (!sala) return;
    const minhas = Object.values(marcasDe(sala))
      .filter((m) => m.dono === socket.data.usuario)
      .sort((a, b) => b.seq - a.seq);
    if (minhas[0]) removerMarca(io, codigo, minhas[0].id);
  });

  // cada um limpa as suas; o mestre limpa todas (só do mapa atual)
  ouvir('limpar-marcas', () => {
    const codigo = socket.data.sala;
    const sala = salas.lista[codigo];
    if (!sala) return;
    const mestre = sala.mestre === socket.data.usuario;
    Object.values(marcasDe(sala)).forEach((m) => {
      if (mestre || m.dono === socket.data.usuario) removerMarca(io, codigo, m.id);
    });
  });

  ouvir('listar-marcas', (_, responder) => {
    const sala = salas.lista[socket.data.sala];
    responder({ ok: true, marcas: sala ? Object.values(marcasDe(sala)).map(publica) : [] });
  });
}

module.exports = { ligar };