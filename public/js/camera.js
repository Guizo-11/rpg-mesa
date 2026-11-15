// câmera do modo PC: roda do mouse dá zoom, arrastar o fundo move o mapa

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

  // arrastar o fundo move o mapa
  let arrasto = null;
  sala.addEventListener('pointerdown', (e) => {
    if (arrasto || e.target.closest('.token')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    arrasto = { id: e.pointerId, px: e.clientX, py: e.clientY, x: camera.x, y: camera.y };
    sala.setPointerCapture(e.pointerId);
  });
  sala.addEventListener('pointermove', (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    camera.x = arrasto.x + (e.clientX - arrasto.px);
    camera.y = arrasto.y + (e.clientY - arrasto.py);
    aplicarCamera();
  });
  const soltar = () => { arrasto = null; };
  sala.addEventListener('pointerup', soltar);
  sala.addEventListener('pointercancel', soltar);
}