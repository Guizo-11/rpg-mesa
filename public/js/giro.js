// girar o token: roda do mouse (computador) e alça quadrada em cima da moldura (celular)

// ângulo do dedo/mouse em relação ao centro do token (0 = pra cima, sentido horário)
function anguloDoToque(t, e) {
  const r = $('mesa').getBoundingClientRect();
  const cx = r.left + t.x * r.width;
  const cy = r.top + t.y * r.height;
  const graus = Math.round((Math.atan2(e.clientX - cx, cy - e.clientY) * 180) / Math.PI);
  return ((graus % 360) + 360) % 360;
}

function mudarRotacao(id, rot) {
  const t = tokens[id];
  const el = $(id);
  if (!t || !el) return;
  t.rot = rot;
  aplicarRotacao(el, rot);
  socket.emit('girar-token', { id, rot });
}

function criarAlcaGiro(id) {
  const alca = document.createElement('div');
  alca.className = 'alca-giro';
  alca.textContent = '↻';
  alca.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    alca.setPointerCapture(e.pointerId);
    alca.dataset.girando = '1';
  });
  alca.addEventListener('pointermove', (e) => {
    if (!alca.dataset.girando) return;
    const t = tokens[id];
    if (t) mudarRotacao(id, anguloDoToque(t, e));
  });
  const soltar = () => { delete alca.dataset.girando; };
  alca.addEventListener('pointerup', soltar);
  alca.addEventListener('pointercancel', soltar);
  return alca;
}

// roda do mouse sobre um token que você controla gira ele de 15 em 15 graus
$('mesa').addEventListener('wheel', (e) => {
  const el = e.target.closest('.token');
  if (!el) return;
  const t = tokens[el.id];
  if (!t || !podeMover(t)) return;
  e.preventDefault();
  const passo = e.deltaY > 0 ? 15 : -15;
  mudarRotacao(el.id, ((((t.rot || 0) + passo) % 360) + 360) % 360);
}, { passive: false });