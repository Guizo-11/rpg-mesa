// marcações no mapa: régua (seta que mede), desenho à mão livre, texto e ping

const SVGNS = 'http://www.w3.org/2000/svg';
const U = 1000; // largura do desenho, em unidades
const mesaEl = $('mesa');

let ferramenta = 'mover'; // mover | desenhar | texto | regua
let corAtual = /^#[0-9a-f]{6}$/.test(ler('corMarca') || '') ? ler('corMarca') : null;
let fixarSeta = false;
let marcas = {}; // desenhos, textos e setas fixas do mapa atual
let vivas = {}; // setas que alguém está arrastando agora
let tracado = null;
let previa = null;
let previaFixa = false;
let pendenteTexto = null;
let caixaTexto = null;
let pressao = null;
let ultimoViva = 0;
let pontoDoMenu = null;
let botoesFerramenta = {};
let btnFixar = null;
let btnCor = null;

// disco de cores: tom (ângulo), intensidade (distância do centro) e claridade (barra)
const corHsl = { h: 200, s: 0.85, l: 0.6 };
let seletor = null;
let disco = null;
let pontoDisco = null;
let controleClaro = null;
let previaCor = null;
let textoHex = null;

const camada = document.createElementNS(SVGNS, 'svg');
camada.id = 'camada-setas';
camada.setAttribute('preserveAspectRatio', 'none');
mesaEl.appendChild(camada);

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// ---------- contas de cor ----------
function hslParaRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function hslParaHex(h, s, l) {
  return '#' + hslParaRgb(h, s, l).map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexParaHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

// cor automática de cada pessoa (usada nas marcações antigas, sem cor escolhida)
function corDoDono(chave) {
  let h = 0;
  for (const c of String(chave)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return 'hsl(' + h + ', 85%, 62%)';
}

// a cor de uma marcação: a que foi escolhida, ou a automática
function corDe(m) {
  return m.cor || corDoDono(m.dono);
}

// a cor que você usa se ainda não escolheu nenhuma
function corPadrao() {
  let h = 0;
  for (const c of String(euChave)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return hslParaHex(h, 0.85, 0.62);
}

// a cor que você está usando agora
function minhaCor() {
  return corAtual || corPadrao();
}

function textoDistancia(s, ar) {
  const celulas = Math.hypot(s.x2 - s.x1, (s.y2 - s.y1) / ar) * grade.colunas;
  return formatarNumero(celulas * grade.valor) + ' ' + grade.unidade;
}

// ---------- desenhar na tela ----------
function desenharSeta(s, ar) {
  const x1 = s.x1 * U;
  const y1 = (s.y1 * U) / ar;
  const x2 = s.x2 * U;
  const y2 = (s.y2 * U) / ar;
  const cor = corDe(s);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ponta = 34;
  const fx = x2 - Math.cos(ang) * ponta * 0.8;
  const fy = y2 - Math.sin(ang) * ponta * 0.8;
  const g = svgEl('g', {});

  g.appendChild(svgEl('line', { x1, y1, x2: fx, y2: fy, stroke: '#000', 'stroke-width': 11, 'stroke-linecap': 'round', opacity: 0.45 }));
  g.appendChild(svgEl('line', { x1, y1, x2: fx, y2: fy, stroke: cor, 'stroke-width': 6, 'stroke-linecap': 'round' }));
  const pontas = [
    [x2, y2],
    [x2 - Math.cos(ang - 0.45) * ponta, y2 - Math.sin(ang - 0.45) * ponta],
    [x2 - Math.cos(ang + 0.45) * ponta, y2 - Math.sin(ang + 0.45) * ponta]
  ].map((p) => p.join(',')).join(' ');
  g.appendChild(svgEl('polygon', { points: pontas, fill: cor, stroke: '#000', 'stroke-opacity': 0.45, 'stroke-width': 3 }));

  const texto = textoDistancia(s, ar);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 36;
  const larg = texto.length * 18 + 28;
  g.appendChild(svgEl('rect', { x: mx - larg / 2, y: my - 21, width: larg, height: 42, rx: 10, fill: 'rgba(15, 14, 24, 0.88)' }));
  const t = svgEl('text', { x: mx, y: my + 10, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: '#fff', 'font-family': 'sans-serif' });
  t.textContent = texto;
  g.appendChild(t);

  camada.appendChild(g);
}

function desenharTraco(m, ar) {
  const pts = m.pontos.map((p) => (p[0] * U) + ',' + ((p[1] * U) / ar)).join(' ');
  camada.appendChild(svgEl('polyline', { points: pts, fill: 'none', stroke: '#000', 'stroke-opacity': 0.35, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  camada.appendChild(svgEl('polyline', { points: pts, fill: 'none', stroke: corDe(m), 'stroke-width': 5.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

function desenharTexto(m, ar) {
  const t = svgEl('text', {
    x: m.x * U,
    y: (m.y * U) / ar,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-size': 34,
    'font-weight': 700,
    'font-family': 'sans-serif',
    fill: corDe(m),
    stroke: '#000',
    'stroke-width': 7,
    'stroke-linejoin': 'round',
    'paint-order': 'stroke'
  });
  t.textContent = m.texto;
  camada.appendChild(t);
}

function desenharMarca(m, ar) {
  if (m.tipo === 'seta') desenharSeta(m, ar);
  else if (m.tipo === 'desenho') desenharTraco(m, ar);
  else if (m.tipo === 'texto') desenharTexto(m, ar);
}

function redesenharMarcas() {
  const W = mesaEl.offsetWidth;
  const H = mesaEl.offsetHeight;
  if (!W || !H) return;
  const ar = W / H;
  camada.setAttribute('viewBox', '0 0 ' + U + ' ' + U / ar);
  camada.textContent = '';
  Object.values(marcas).forEach((m) => desenharMarca(m, ar));
  Object.values(vivas).forEach((s) => desenharMarca(Object.assign({}, s, { tipo: 'seta' }), ar));
  if (tracado) desenharMarca({ tipo: 'desenho', dono: euChave, cor: minhaCor(), pontos: tracado }, ar);
  if (previa) desenharMarca(Object.assign({}, previa, { tipo: 'seta', dono: euChave, cor: minhaCor() }), ar);
}

function pontoNoMapa(e) {
  const r = mesaEl.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  };
}

// ---------- ping ----------
function mostrarPing(p) {
  const el = document.createElement('div');
  el.className = 'ping';
  el.style.left = (p.x * 100) + '%';
  el.style.top = (p.y * 100) + '%';
  el.style.setProperty('--cor', corDe(p));
  for (let i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
  mesaEl.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ---------- caixa de texto em cima do mapa (como no Paint) ----------
function fecharCaixaTexto(enviar) {
  if (!caixaTexto) return;
  const { input, p, cor } = caixaTexto;
  caixaTexto = null;
  const texto = input.value.trim();
  input.remove();
  if (enviar && texto) socket.emit('nova-marca', { tipo: 'texto', x: p.x, y: p.y, texto, cor });
}

function abrirCaixaTexto(p) {
  fecharCaixaTexto(true);
  const cor = minhaCor();
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'caixa-texto';
  input.maxLength = 40;
  input.placeholder = 'Digite aqui';
  input.style.left = (p.x * 100) + '%';
  input.style.top = (p.y * 100) + '%';
  input.style.setProperty('--cor', cor);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fecharCaixaTexto(true);
    } else if (e.key === 'Escape') {
      fecharCaixaTexto(false);
    }
  });
  input.addEventListener('blur', () => fecharCaixaTexto(true));
  input.addEventListener('pointerdown', (e) => e.stopPropagation());
  mesaEl.appendChild(input);
  caixaTexto = { input, p, cor };
  input.focus();
}

// ---------- menu de segurar (ping e escrever) ----------
const menuToque = document.createElement('div');
menuToque.id = 'menu-toque';
menuToque.style.display = 'none';

function fecharMenuToque() {
  menuToque.style.display = 'none';
}

function abrirMenuToque(cx, cy, p) {
  pontoDoMenu = p;
  menuToque.style.display = 'block';
  const w = menuToque.offsetWidth;
  const h = menuToque.offsetHeight;
  menuToque.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, cx - w / 2)) + 'px';
  menuToque.style.top = Math.min(window.innerHeight - h - 8, Math.max(8, cy - h - 18)) + 'px';
}

[
  ['📍 Pingar', () => socket.emit('ping', { x: pontoDoMenu.x, y: pontoDoMenu.y, cor: minhaCor() })],
  ['🔤 Escrever aqui', () => abrirCaixaTexto(pontoDoMenu)]
].forEach(([texto, acao]) => {
  const b = document.createElement('button');
  b.textContent = texto;
  b.onclick = () => {
    fecharMenuToque();
    acao();
  };
  menuToque.appendChild(b);
});
$('tela-sala').appendChild(menuToque);

document.addEventListener('pointerdown', (e) => {
  if (menuToque.style.display === 'block' && !e.target.closest('#menu-toque')) fecharMenuToque();
}, true);

function cancelarPressao() {
  if (pressao) clearTimeout(pressao.timer);
  pressao = null;
}

// ---------- disco de cores ----------
function atualizarBotaoCor() {
  if (btnCor) btnCor.style.background = minhaCor();
}

// posição da bolinha no disco, prévia, código e barra de claridade
function mostrarSelecao() {
  const hex = hslParaHex(corHsl.h, corHsl.s, corHsl.l);
  const rad = (corHsl.h * Math.PI) / 180;
  pontoDisco.style.left = (100 + Math.cos(rad) * corHsl.s * 100) + 'px';
  pontoDisco.style.top = (100 + Math.sin(rad) * corHsl.s * 100) + 'px';
  previaCor.style.background = hex;
  textoHex.textContent = hex.toUpperCase();
  const css = (l) => 'hsl(' + corHsl.h + ', ' + (corHsl.s * 100) + '%, ' + (l * 100) + '%)';
  controleClaro.style.background = 'linear-gradient(to right, ' + css(0.05) + ', ' + css(0.5) + ', ' + css(0.95) + ')';
}

function aplicarHsl() {
  corAtual = hslParaHex(corHsl.h, corHsl.s, corHsl.l);
  guardar('corMarca', corAtual);
  mostrarSelecao();
  atualizarBotaoCor();
}

function desenharDisco() {
  const ctx = disco.getContext('2d');
  const T = disco.width;
  const R = T / 2;
  const img = ctx.createImageData(T, T);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const dx = x + 0.5 - R;
      const dy = y + 0.5 - R;
      const r = Math.hypot(dx, dy);
      if (r > R) continue;
      let h = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (h < 0) h += 360;
      const rgb = hslParaRgb(h, r / R, corHsl.l);
      const i = (y * T + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function escolherNoDisco(e) {
  const r = disco.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  let h = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (h < 0) h += 360;
  corHsl.h = h;
  corHsl.s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
  aplicarHsl();
}

function abrirSeletorCor() {
  if (seletor.style.display === 'block') {
    seletor.style.display = 'none';
    return;
  }
  const atual = hexParaHsl(minhaCor());
  corHsl.h = atual.h;
  corHsl.s = atual.s;
  corHsl.l = Math.min(0.95, Math.max(0.05, atual.l));
  controleClaro.value = String(Math.round(corHsl.l * 100));
  seletor.style.display = 'block';
  desenharDisco();
  mostrarSelecao();
}

function criarSeletorCor() {
  seletor = document.createElement('div');
  seletor.id = 'seletor-cor';
  seletor.style.display = 'none';

  const titulo = document.createElement('div');
  titulo.className = 'seletor-titulo';
  titulo.textContent = 'Escolha a cor';

  const area = document.createElement('div');
  area.className = 'disco-area';
  disco = document.createElement('canvas');
  disco.id = 'disco-cor';
  disco.width = 200;
  disco.height = 200;
  pontoDisco = document.createElement('div');
  pontoDisco.className = 'disco-ponto';
  area.append(disco, pontoDisco);

  const rotulo = document.createElement('small');
  rotulo.textContent = 'Claridade';
  controleClaro = document.createElement('input');
  controleClaro.type = 'range';
  controleClaro.id = 'claro-cor';
  controleClaro.min = '5';
  controleClaro.max = '95';

  const rodape = document.createElement('div');
  rodape.className = 'seletor-rodape';
  previaCor = document.createElement('div');
  previaCor.className = 'seletor-previa';
  textoHex = document.createElement('span');
  const pronto = document.createElement('button');
  pronto.className = 'mini';
  pronto.textContent = 'Pronto';
  pronto.onclick = () => { seletor.style.display = 'none'; };
  rodape.append(previaCor, textoHex, pronto);

  seletor.append(titulo, area, rotulo, controleClaro, rodape);
  $('tela-sala').appendChild(seletor);

  let arrastando = false;
  disco.addEventListener('pointerdown', (e) => {
    arrastando = true;
    disco.setPointerCapture(e.pointerId);
    escolherNoDisco(e);
  });
  disco.addEventListener('pointermove', (e) => {
    if (arrastando) escolherNoDisco(e);
  });
  disco.addEventListener('pointerup', () => { arrastando = false; });
  disco.addEventListener('pointercancel', () => { arrastando = false; });

  let agendado = false;
  controleClaro.addEventListener('input', () => {
    corHsl.l = Number(controleClaro.value) / 100;
    aplicarHsl();
    if (!agendado) {
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        desenharDisco();
      });
    }
  });

  seletor.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.addEventListener('pointerdown', (e) => {
    if (seletor.style.display === 'block' && !e.target.closest('#seletor-cor, .cor-atual')) {
      seletor.style.display = 'none';
    }
  }, true);
}

// ---------- barra de ferramentas ----------
function escolherFerramenta(id) {
  ferramenta = id;
  cancelarPressao();
  fecharMenuToque();
  fecharCaixaTexto(true);
  if (previa) socket.emit('seta-viva-fim', {});
  tracado = null;
  previa = null;
  pendenteTexto = null;
  Object.keys(botoesFerramenta).forEach((k) => botoesFerramenta[k].classList.toggle('ativa', k === id));
  btnFixar.style.display = id === 'regua' ? '' : 'none';
  mesaEl.classList.toggle('modo-regua', id !== 'mover');
  redesenharMarcas();
}

function criarBarra() {
  const barra = document.createElement('div');
  barra.id = 'ferramentas';

  [['mover', '✋ Mover'], ['desenhar', '✏️ Desenhar'], ['texto', '🔤 Texto'], ['regua', '📏 Régua']].forEach(([id, texto]) => {
    const b = document.createElement('button');
    b.className = 'sec' + (id === 'mover' ? ' ativa' : '');
    b.textContent = texto;
    b.onclick = () => escolherFerramenta(id);
    botoesFerramenta[id] = b;
    barra.appendChild(b);
  });

  btnFixar = document.createElement('button');
  btnFixar.className = 'sec';
  btnFixar.textContent = '📌 Fixar';
  btnFixar.style.display = 'none';
  btnFixar.onclick = () => {
    fixarSeta = !fixarSeta;
    btnFixar.classList.toggle('ativa', fixarSeta);
  };

  const desfazer = document.createElement('button');
  desfazer.className = 'sec';
  desfazer.textContent = '↶';
  desfazer.onclick = () => socket.emit('desfazer', {});

  const limpar = document.createElement('button');
  limpar.className = 'sec';
  limpar.textContent = '🧹';
  limpar.onclick = () => {
    if (souMestre && !confirm('Limpar todas as marcações deste mapa?')) return;
    socket.emit('limpar-marcas', {});
  };

  btnCor = document.createElement('button');
  btnCor.className = 'sec cor-atual';
  btnCor.title = 'Cor';
  btnCor.onclick = abrirSeletorCor;

  barra.append(btnFixar, desfazer, limpar, btnCor);
  barra.addEventListener('pointerdown', (e) => e.stopPropagation());
  mesaEl.insertAdjacentElement('beforebegin', barra);
  atualizarBotaoCor();
}
criarBarra();
criarSeletorCor();

// ---------- gestos no mapa ----------
function enviarViva() {
  const agora = Date.now();
  if (agora - ultimoViva < 70) return;
  ultimoViva = agora;
  socket.emit('seta-viva', { x1: previa.x1, y1: previa.y1, x2: previa.x2, y2: previa.y2, cor: minhaCor() });
}

mesaEl.addEventListener('contextmenu', (e) => {
  if (e.target.id !== 'caixa-texto') e.preventDefault();
});

mesaEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const p = pontoNoMapa(e);

  if (ferramenta === 'mover') {
    if (e.target.closest('.token')) return;
    cancelarPressao();
    const x0 = e.clientX;
    const y0 = e.clientY;
    pressao = {
      x0,
      y0,
      timer: setTimeout(() => {
        pressao = null;
        abrirMenuToque(x0, y0, p);
      }, 550)
    };
    return;
  }

  e.stopPropagation();
  if (ferramenta === 'texto') {
    // a caixa abre no "click", depois que o toque termina
    pendenteTexto = { p, x0: e.clientX, y0: e.clientY };
    return;
  }

  mesaEl.setPointerCapture(e.pointerId);
  if (ferramenta === 'desenhar') {
    tracado = [[p.x, p.y]];
  } else if (ferramenta === 'regua') {
    previa = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    previaFixa = fixarSeta || e.ctrlKey;
  }
});

mesaEl.addEventListener('pointermove', (e) => {
  if (pressao && Math.hypot(e.clientX - pressao.x0, e.clientY - pressao.y0) > 10) cancelarPressao();
  if (tracado) {
    const p = pontoNoMapa(e);
    const ultimo = tracado[tracado.length - 1];
    if (Math.hypot(p.x - ultimo[0], p.y - ultimo[1]) >= 0.004 && tracado.length < 800) {
      tracado.push([p.x, p.y]);
      redesenharMarcas();
    }
  } else if (previa) {
    const p = pontoNoMapa(e);
    previa.x2 = p.x;
    previa.y2 = p.y;
    if (e.ctrlKey) previaFixa = true;
    redesenharMarcas();
    enviarViva();
  }
});

mesaEl.addEventListener('pointerup', (e) => {
  cancelarPressao();
  if (tracado) {
    const pontos = tracado;
    tracado = null;
    redesenharMarcas();
    if (pontos.length >= 2) socket.emit('nova-marca', { tipo: 'desenho', pontos, cor: minhaCor() });
  } else if (previa) {
    const s = previa;
    previa = null;
    socket.emit('seta-viva-fim', {});
    redesenharMarcas();
    // a seta some ao soltar, a não ser que esteja marcada pra fixar
    if ((previaFixa || e.ctrlKey) && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= 0.02) {
      socket.emit('nova-marca', { tipo: 'seta', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, cor: minhaCor() });
    }
  } else if (pendenteTexto && Math.hypot(e.clientX - pendenteTexto.x0, e.clientY - pendenteTexto.y0) > 10) {
    pendenteTexto = null; // arrastou: não foi um toque
  }
});

mesaEl.addEventListener('click', () => {
  if (ferramenta !== 'texto' || !pendenteTexto) return;
  const p = pendenteTexto.p;
  pendenteTexto = null;
  abrirCaixaTexto(p);
});

mesaEl.addEventListener('pointercancel', () => {
  cancelarPressao();
  if (previa) socket.emit('seta-viva-fim', {});
  tracado = null;
  previa = null;
  pendenteTexto = null;
  redesenharMarcas();
});

// segurar CTRL durante o arrasto também fixa a seta
document.addEventListener('keydown', (e) => {
  if (e.key === 'Control' && previa) previaFixa = true;
});

// ---------- o que chega do servidor ----------
function recarregarMarcas() {
  socket.emit('listar-marcas', {}, (r) => {
    marcas = {};
    (r.marcas || []).forEach((m) => { marcas[m.id] = m; });
    redesenharMarcas();
  });
}

socket.on('marca', (m) => {
  marcas[m.id] = m;
  redesenharMarcas();
});

socket.on('marca-removida', ({ id }) => {
  delete marcas[id];
  redesenharMarcas();
});

socket.on('seta-viva', (s) => {
  vivas[s.dono] = s;
  redesenharMarcas();
});

socket.on('seta-viva-fim', ({ dono }) => {
  delete vivas[dono];
  redesenharMarcas();
});

socket.on('ping', mostrarPing);

// ao entrar na sala ou trocar de mapa, carrega as marcações daquele mapa
socket.on('estado', () => {
 vivas = {};
  atualizarBotaoCor();
  recarregarMarcas();
});

socket.on('mapa', () => {
  vivas = {};
  recarregarMarcas();
});

// a medida muda quando o mestre muda a escala
socket.on('grade', redesenharMarcas);

new ResizeObserver(redesenharMarcas).observe(mesaEl);