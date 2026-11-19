// câmera do mapa: roda do mouse e botões − ⌂ + dão zoom; um dedo (ou o mouse) arrasta; dois dedos dão zoom
// 🎯 leva até o seu token

const camera = { x: 0, y: 0, s: 1, ajustado: false };

function aplicarCamera() {
  const mesa = $('mesa');
  mesa.style.transform = 'translate(' + camera.x + 'px, ' + camera.y + 'px) scale(' + camera.s + ')';
  mesa.style.setProperty('--zoom', camera.s);
}

// encaixa o mapa inteiro na tela, centralizado
function ajustarCamera() {
  if (!modoPC) return;
  const mesa = $('mesa');
  const W = mesa.offsetWidth;
  const H = mesa.offsetHeight;
  if (!W || !H) return;
  camera.s = Math.min(window.innerWidth / W, window.innerHeight / H);
  camera.x = (window.innerWidth - W * camera.s) / 2;
  camera.y = (window.innerHeight - H * camera.s) / 2;
  camera.ajustado = true;
  aplicarCamera();
}

// zoom em volta de um ponto da tela
function zoomEm(fator, px, py) {
  const novo = Math.min(8, Math.max(0.05, camera.s * fator));
  const k = novo / camera.s;
  camera.x = px - (px - camera.x) * k;
  camera.y = py - (py - camera.y) * k;
  camera.s = novo;
  aplicarCamera();
}

function zoomCamera(fator) {
  zoomEm(fator, window.innerWidth / 2, window.innerHeight / 2);
}

// leva a câmera até um ponto do mapa (x e y de 0 a 1), chegando perto se estiver longe
function centralizarEm(x, y) {
  if (!modoPC) return;
  const mesa = $('mesa');
  const W = mesa.offsetWidth;
  const H = mesa.offsetHeight;
  if (!W || !H) return;
  camera.s = Math.max(camera.s, Math.min(8, (70 * grade.colunas) / W)); // um quadrado com uns 70px
  camera.x = window.innerWidth / 2 - x * W * camera.s;
  camera.y = window.innerHeight / 2 - y * H * camera.s;
  mesa.classList.add('camera-suave');
  aplicarCamera();
  setTimeout(() => mesa.classList.remove('camera-suave'), 400);
}

// o ponto do mapa que está no meio da tela (é onde os tokens novos aparecem)
function centroDaVisao() {
  const mesa = $('mesa');
  const W = mesa.offsetWidth * camera.s;
  const H = mesa.offsetHeight * camera.s;
  if (!modoPC || !W || !H) return { x: 0.5, y: 0.5 };
  const lim = (n) => Math.round(Math.min(0.97, Math.max(0.03, n)) * 10000) / 10000;
  const sorteio = () => (Math.random() - 0.5) * (0.6 / grade.colunas); // pra não empilhar
  return {
    x: lim((window.innerWidth / 2 - camera.x) / W + sorteio()),
    y: lim((window.innerHeight / 2 - camera.y) / H + (sorteio() * W) / H)
  };
}

// 🎯: vai até o seu token e seleciona; o mestre passa por todos, um por toque
let indiceAlvo = -1;
function irParaMeuToken() {
  const ids = Object.keys(tokens).filter((id) => souMestre || tokens[id].dono === euChave);
  if (!ids.length) return;
  indiceAlvo = (indiceAlvo + 1) % ids.length;
  const id = ids[indiceAlvo];
  centralizarEm(tokens[id].x, tokens[id].y);
  if ($(id)) selecionar(id);
}

if (modoPC) {
  const sala = $('tela-sala');

  // botões 🎯 − ⌂ + no canto de baixo
  const zoom = document.createElement('div');
  zoom.id = 'zoom-pc';
  [['🎯', irParaMeuToken], ['−', () => zoomCamera(1 / 1.25)], ['⌂', () => ajustarCamera()], ['+', () => zoomCamera(1.25)]].forEach(([texto, acao]) => {
    const b = document.createElement('button');
    b.className = 'sec';
    b.textContent = texto;
    b.onclick = acao;
    zoom.appendChild(b);
  });
  zoom.firstChild.title = 'Ir até o meu token';
  zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
  sala.appendChild(zoom);

  // encaixa o mapa na primeira vez que a tela aparece
  new ResizeObserver(() => { if (!camera.ajustado) ajustarCamera(); }).observe($('mesa'));

  // roda do mouse = zoom (sobre um token ela gira o token)
  sala.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.target.closest('.janela, #menu-pc, .topo, .token, #menu-cond')) return;
    e.preventDefault();
    zoomEm(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
  }, { passive: false });

  // gestos no fundo: um dedo arrasta o mapa, dois dedos dão zoom (e também movem)
  const dedos = new Map();
  let gesto = null;

  function iniciarGesto() {
    const pts = Array.from(dedos.values());
    if (pts.length === 1) {
      gesto = { tipo: 'arrasto', px: pts[0].x, py: pts[0].y, x: camera.x, y: camera.y };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      gesto = {
        tipo: 'pinca',
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        s0: camera.s,
        cx0: (a.x + b.x) / 2,
        cy0: (a.y + b.y) / 2,
        x0: camera.x,
        y0: camera.y
      };
    } else {
      gesto = null;
    }
  }

  sala.addEventListener('pointerdown', (e) => {
    // botões e campos funcionam normal (antes o clique do mouse no menu de pingar se perdia)
    if (e.target.closest('.token, button, input, select, textarea')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    iniciarGesto();
  });

  sala.addEventListener('pointermove', (e) => {
    const dedo = dedos.get(e.pointerId);
    if (!dedo || !gesto) return;
    dedo.x = e.clientX;
    dedo.y = e.clientY;
    // só "prende" o ponteiro depois que ele andou de verdade (um clique continua sendo clique)
    if (!dedo.preso && Math.hypot(dedo.x - dedo.x0, dedo.y - dedo.y0) > 6) {
      try { sala.setPointerCapture(e.pointerId); } catch (err) {}
      dedo.preso = true;
    }
    if (gesto.tipo === 'arrasto') {
      camera.x = gesto.x + (e.clientX - gesto.px);
      camera.y = gesto.y + (e.clientY - gesto.py);
    } else {
      const [a, b] = Array.from(dedos.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const s = Math.min(8, Math.max(0.05, (gesto.s0 * dist) / gesto.d0));
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      // o ponto do mapa que estava entre os dedos continua entre os dedos
      const mx = (gesto.cx0 - gesto.x0) / gesto.s0;
      const my = (gesto.cy0 - gesto.y0) / gesto.s0;
      camera.s = s;
      camera.x = cx - mx * s;
      camera.y = cy - my * s;
    }
    aplicarCamera();
  });

  const soltar = (e) => {
    if (dedos.delete(e.pointerId)) iniciarGesto();
  };
  sala.addEventListener('pointerup', soltar);
  sala.addEventListener('pointercancel', soltar);
}
// fim de camera.js