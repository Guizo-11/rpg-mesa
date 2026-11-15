// quadrado em volta do token selecionado; o mestre arrasta os cantos pra mudar o tamanho

function atualizarMoldura() {
  document.querySelectorAll('#mesa .moldura').forEach((m) => m.remove());
  const el = selecionado ? $(selecionado) : null;
  if (!el) return;
  const moldura = document.createElement('div');
  moldura.className = 'moldura';
  if (souMestre) {
    ['nw', 'ne', 'sw', 'se'].forEach((canto) => {
      const alca = document.createElement('div');
      alca.className = 'alca ' + canto;
      ligarRedimensionar(alca, selecionado);
      moldura.appendChild(alca);
    });
  }
  moldura.appendChild(criarAlcaGiro(selecionado));
  el.appendChild(moldura);
}

// distância do centro do token até o dedo (maior eixo)
function distanciaDoCentro(e, t) {
  const r = $('mesa').getBoundingClientRect();
  const cx = r.left + t.x * r.width;
  const cy = r.top + t.y * r.height;
  return Math.max(Math.abs(e.clientX - cx), Math.abs(e.clientY - cy)) || 1;
}

function ligarRedimensionar(alca, id) {
  alca.addEventListener('pointerdown', (e) => {
    const t = tokens[id];
    if (!t) return;
    e.stopPropagation();
    alca.setPointerCapture(e.pointerId);
    alca.dataset.redimensionando = '1';
    alca.dataset.d0 = String(distanciaDoCentro(e, t));
    alca.dataset.t0 = String(t.tamanho || 1);
  });
  alca.addEventListener('pointermove', (e) => {
    if (!alca.dataset.redimensionando) return;
    const t = tokens[id];
    const el = $(id);
    if (!t || !el) return;
    const d0 = Number(alca.dataset.d0);
    const t0 = Number(alca.dataset.t0);
    const tamanho = Math.min(12, Math.max(0.25, t0 * (distanciaDoCentro(e, t) / d0)));
    t.tamanho = tamanho;
    el.style.setProperty('--p', ((tamanho * 100) / grade.colunas).toFixed(3));
    socket.emit('tamanho-token', { id, tamanho });
  });
  const soltar = () => { delete alca.dataset.redimensionando; };
  alca.addEventListener('pointerup', soltar);
  alca.addEventListener('pointercancel', soltar);
}

// o servidor avisa os outros quando o mestre redimensiona
socket.on('token-redimensionado', ({ id, tamanho }) => {
  if (!tokens[id]) return;
  tokens[id].tamanho = tamanho;
  const el = $(id);
  if (el) el.style.setProperty('--p', ((tamanho * 100) / grade.colunas).toFixed(3));
});
// tocar fora do token (e fora do painel dele) tira a seleção
document.addEventListener('pointerdown', (e) => {
  if (!selecionado) return;
  if (e.target.closest('#painel-token')) return;
  const token = e.target.closest('.token');
  if (token && token.id === selecionado) return;
  selecionado = null;
  document.querySelectorAll('#mesa .token').forEach((t) => t.classList.remove('sel'));
  atualizarMoldura();
  atualizarPainelToken();
});