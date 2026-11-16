// câmera do mapa: roda do mouse e botões − ⌂ + dão zoom; um dedo (ou o mouse) arrasta; dois dedos dão zoom

const camera = { x: 0, y: 0, s: 1, ajustado: false };

function aplicarCamera() {
  $('mesa').style.transform = 'translate(' + camera.x + 'px, ' + camera.y + 'px) scale(' + camera.s + ')';
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

if (modoPC) {
  const sala = $('tela-sala');

  // botões − ⌂ + no canto de baixo
  const zoom = document.createElement('div');
  zoom.id = 'zoom-pc';
  [['−', () => zoomCamera(1 / 1.25)], ['⌂', () => ajustarCamera()], ['+', () => zoomCamera(1.25)]].forEach(([texto, acao]) => {
    const b = document.createElement('button');
    b.className = 'sec';
    b.textContent = texto;
    b.onclick = acao;
    zoom.appendChild(b);
  });
  zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
  sala.appendChild(zoom);

  // encaixa o mapa na primeira vez que a tela aparece
  new ResizeObserver(() => { if (!camera.ajustado) ajustarCamera(); }).observe($('mesa'));

  // roda do mouse = zoom (sobre um token ela gira o token)
  sala.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.target.closest('.janela, #menu-pc, .topo, .token')) return;
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
    if (e.target.closest('.token')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    sala.setPointerCapture(e.pointerId);
    iniciarGesto();
  });

  sala.addEventListener('pointermove', (e) => {
    const dedo = dedos.get(e.pointerId);
    if (!dedo || !gesto) return;
    dedo.x = e.clientX;
    dedo.y = e.clientY;
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