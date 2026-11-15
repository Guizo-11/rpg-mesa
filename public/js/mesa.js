let tokens = {};
let selecionado = null;
let euChave = null;
let souMestre = false;

function podeMover(t) {
  return souMestre || (!!t.dono && t.dono === euChave);
}

function aplicarMapa(src) {
  const img = $('mapa');
  if (src) {
    img.onload = () => {
      $('mesa').style.setProperty('--ar', img.naturalWidth / img.naturalHeight);
      ajustarCamera();
    };
    img.src = src;
    img.style.display = 'block';
    $('aviso').style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    $('aviso').style.display = 'block';
  }
}

// gira a setinha e também a imagem do token
function aplicarRotacao(el, rot) {
  const giro = el.querySelector('.giro');
  const foto = el.querySelector('.foto');
  if (giro) giro.style.transform = 'rotate(' + rot + 'deg)';
  if (foto) foto.style.transform = 'rotate(' + rot + 'deg)';
}

function desenhar() {
  if (selecionado && (!tokens[selecionado] || !podeMover(tokens[selecionado]))) selecionado = null;
  const mesa = $('mesa');
  mesa.querySelectorAll('.token').forEach((e) => e.remove());
  for (const id in tokens) {
    const t = tokens[id];
    const el = document.createElement('div');
    el.className = 'token';
    if (t.dono && t.dono === euChave) el.classList.add('meu');
    if (id === selecionado) el.classList.add('sel');
    el.id = id;
    el.style.background = t.cor;
    el.style.setProperty('--p', (((t.tamanho || 1) * 100) / grade.colunas).toFixed(3));
    el.style.left = (t.x * 100) + '%';
    el.style.top = (t.y * 100) + '%';

    if (t.imagem) {
      const foto = document.createElement('div');
      foto.className = 'foto';
      foto.style.backgroundImage = 'url("' + t.imagem + '")';
      el.appendChild(foto);
    }

    const giro = document.createElement('div');
    giro.className = 'giro';
    const seta = document.createElement('div');
    seta.className = 'seta';
    giro.appendChild(seta);
    el.appendChild(giro);

    if (!t.imagem) el.appendChild(document.createTextNode(t.nome.slice(0, 2).toUpperCase()));
    const rotulo = document.createElement('span');
    rotulo.textContent = t.nome;
    el.appendChild(rotulo);
    barraDeVida(el, t);

    aplicarRotacao(el, t.rot || 0);
    ligarArraste(el, id);
    mesa.appendChild(el);
  }
  atualizarMoldura();
  atualizarPainelToken();
}

function selecionar(id) {
  selecionado = id;
  document.querySelectorAll('#mesa .token').forEach((e) => {
    e.classList.toggle('sel', e.id === id);
  });
  atualizarPainelToken();
  atualizarMoldura();
}

function atualizarPainelToken() {
  const painel = $('painel-token');
  const t = selecionado ? tokens[selecionado] : null;
  if (!t || !podeMover(t) || !souMestre) {
    painel.style.display = 'none';
    return;
  }
  painel.style.display = 'block';
  $('sel-nome').textContent = t.nome;
  $('sel-mestre').style.display = souMestre ? 'block' : 'none';
  if (!souMestre) return;

  const sel = $('sel-dono');
  sel.textContent = '';
  const nenhum = document.createElement('option');
  nenhum.value = '';
  nenhum.textContent = 'Só o mestre';
  sel.appendChild(nenhum);
  jogadoresNaSala.forEach((j) => {
    const o = document.createElement('option');
    o.value = j.chave;
    o.textContent = j.nome;
    sel.appendChild(o);
  });
  if (t.dono && !jogadoresNaSala.some((j) => j.chave === t.dono)) {
    const o = document.createElement('option');
    o.value = t.dono;
    o.textContent = t.dono.slice(2) + ' (fora da mesa)';
    sel.appendChild(o);
  }
  sel.value = t.dono || '';
}

function girar(graus) {
  const t = selecionado ? tokens[selecionado] : null;
  if (!t) return;
  const nova = ((((t.rot || 0) + graus) % 360) + 360) % 360;
  socket.emit('girar-token', { id: selecionado, rot: nova });
}

function atribuirDono() {
  if (!selecionado) return;
  socket.emit('atribuir-token', { id: selecionado, usuario: $('sel-dono').value || null });
}

function tirarDaMesa() {
  const t = selecionado ? tokens[selecionado] : null;
  if (!t) return;
  if (!confirm('Tirar "' + t.nome + '" da mesa?')) return;
  socket.emit('remover-token', { id: selecionado });
  selecionado = null;
}

function ligarArraste(el, id) {
  el.addEventListener('pointerdown', (e) => {
    const t = tokens[id];
    if (!t || !podeMover(t)) return;
    selecionar(id);
    el.setPointerCapture(e.pointerId);
    el.dataset.arrastando = '1';
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.dataset.arrastando) return;
    const r = $('mesa').getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.left = (x * 100) + '%';
    el.style.top = (y * 100) + '%';
    tokens[id].x = x;
    tokens[id].y = y;
    socket.emit('mover-token', { id, x, y });
  });
  const soltar = () => { delete el.dataset.arrastando; };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
}

socket.on('estado', (e) => {
  euChave = e.voce;
  souMestre = e.mestre;
  $('papel').textContent = e.mestre ? 'Mestre' : 'Jogador';
  tokens = e.tokens;
  selecionado = null;
  usarGrade(e.grade);
  aplicarMapa(e.mapa);
  desenhar();
});

socket.on('mapa', aplicarMapa);

socket.on('tokens', (t) => {
  tokens = t;
  desenhar();
});

socket.on('token-movido', ({ id, x, y }) => {
  if (!tokens[id]) return;
  tokens[id].x = x;
  tokens[id].y = y;
  const el = $(id);
  if (el) {
    el.style.left = (x * 100) + '%';
    el.style.top = (y * 100) + '%';
  }
});

socket.on('token-girado', ({ id, rot }) => {
  if (!tokens[id]) return;
  tokens[id].rot = rot;
  const el = $(id);
  if (el) aplicarRotacao(el, rot);
});