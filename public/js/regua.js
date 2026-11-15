// seta com medida: arrasta no mapa e aparece a distância, usando a escala da grade

const SVGNS = 'http://www.w3.org/2000/svg';
const U = 1000; // largura do desenho, em unidades
let modoRegua = false;
let setas = {};
let previa = null;

const camadaSetas = document.createElementNS(SVGNS, 'svg');
camadaSetas.id = 'camada-setas';
camadaSetas.setAttribute('preserveAspectRatio', 'none');
$('mesa').appendChild(camadaSetas);

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// cada pessoa tem sempre a mesma cor
function corDoDono(chave) {
  let h = 0;
  for (const c of String(chave)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return 'hsl(' + h + ', 85%, 62%)';
}

function textoDistancia(s, ar) {
  const celulas = Math.hypot(s.x2 - s.x1, (s.y2 - s.y1) / ar) * grade.colunas;
  return formatarNumero(celulas * grade.valor) + ' ' + grade.unidade;
}

function desenharSeta(s, ar) {
  const x1 = s.x1 * U;
  const y1 = (s.y1 * U) / ar;
  const x2 = s.x2 * U;
  const y2 = (s.y2 * U) / ar;
  const cor = corDoDono(s.dono);
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

  // medida acima do meio da seta
  const texto = textoDistancia(s, ar);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 36;
  const larg = texto.length * 18 + 28;
  g.appendChild(svgEl('rect', { x: mx - larg / 2, y: my - 21, width: larg, height: 42, rx: 10, fill: 'rgba(15, 14, 24, 0.88)' }));
  const t = svgEl('text', { x: mx, y: my + 10, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, fill: '#fff', 'font-family': 'sans-serif' });
  t.textContent = texto;
  g.appendChild(t);

  camadaSetas.appendChild(g);
}

function redesenharSetas() {
  const mesa = $('mesa');
  const W = mesa.offsetWidth;
  const H = mesa.offsetHeight;
  if (!W || !H) return;
  const ar = W / H;
  camadaSetas.setAttribute('viewBox', '0 0 ' + U + ' ' + U / ar);
  camadaSetas.textContent = '';
  Object.values(setas).forEach((s) => desenharSeta(s, ar));
  if (previa) desenharSeta(previa, ar);
}

function pontoNoMapa(e) {
  const r = $('mesa').getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  };
}

// ---------- barra de ferramentas ----------
function criarBarra() {
  const barra = document.createElement('div');
  barra.id = 'ferramentas';

  const mover = document.createElement('button');
  mover.className = 'sec ativa';
  mover.textContent = '✋ Mover';
  const seta = document.createElement('button');
  seta.className = 'sec';
  seta.textContent = '📏 Seta';

  const duracao = document.createElement('select');
  duracao.id = 'duracao-seta';
  duracao.style.display = 'none';
  [['5000', '5 s'], ['30000', '30 s'], ['120000', '2 min'], ['0', 'Fixa']].forEach(([valor, nome]) => {
    const o = document.createElement('option');
    o.value = valor;
    o.textContent = nome;
    duracao.appendChild(o);
  });

  const limpar = document.createElement('button');
  limpar.className = 'sec';
  limpar.textContent = 'Limpar';

  const escolher = (regua) => {
    modoRegua = regua;
    mover.classList.toggle('ativa', !regua);
    seta.classList.toggle('ativa', regua);
    duracao.style.display = regua ? '' : 'none';
    $('mesa').classList.toggle('modo-regua', regua);
  };
  mover.onclick = () => escolher(false);
  seta.onclick = () => escolher(true);
  limpar.onclick = () => socket.emit('limpar-setas', {});

  barra.append(mover, seta, duracao, limpar);
  barra.addEventListener('pointerdown', (e) => e.stopPropagation());
  $('mesa').insertAdjacentElement('beforebegin', barra);
}
criarBarra();

// ---------- desenhar arrastando ----------
const mesaEl = $('mesa');

mesaEl.addEventListener('pointerdown', (e) => {
  if (!modoRegua) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.stopPropagation();
  const p = pontoNoMapa(e);
  previa = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, dono: euChave };
  mesaEl.setPointerCapture(e.pointerId);
});

mesaEl.addEventListener('pointermove', (e) => {
  if (!previa) return;
  const p = pontoNoMapa(e);
  previa.x2 = p.x;
  previa.y2 = p.y;
  redesenharSetas();
});

mesaEl.addEventListener('pointerup', () => {
  if (!previa) return;
  const s = previa;
  previa = null;
  redesenharSetas();
  if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 0.02) return; // foi só um toque
  socket.emit('nova-seta', {
    x1: s.x1,
    y1: s.y1,
    x2: s.x2,
    y2: s.y2,
    duracao: Number($('duracao-seta').value)
  });
});

mesaEl.addEventListener('pointercancel', () => {
  previa = null;
  redesenharSetas();
});

// ---------- o que chega do servidor ----------
socket.on('seta', (s) => {
  setas[s.id] = s;
  redesenharSetas();
});

socket.on('seta-removida', ({ id }) => {
  delete setas[id];
  redesenharSetas();
});

socket.on('estado', () => {
  socket.emit('listar-setas', {}, (r) => {
    setas = {};
    (r.setas || []).forEach((s) => { setas[s.id] = s; });
    redesenharSetas();
  });
});

// a medida muda quando o mestre muda a escala
socket.on('grade', redesenharSetas);

new ResizeObserver(redesenharSetas).observe(mesaEl);