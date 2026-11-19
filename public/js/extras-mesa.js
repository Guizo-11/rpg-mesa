// extras da mesa: esconder, renomear e duplicar tokens (mestre),
// "Trazer todos aqui" (mestre) e clique direito no computador abrindo o menu de pingar

// ---------- tokens escondidos: o jogador não vê (o mestre e o dono veem meio apagado) ----------
const desenharSemOcultos = desenhar;
desenhar = function () {
  desenharSemOcultos();
  for (const id in tokens) {
    const t = tokens[id];
    const el = $(id);
    if (!t.oculto || !el) continue;
    if (souMestre || t.dono === euChave) el.classList.add('oculto');
    else el.remove();
  }
};

// ---------- painel do token (mestre): nome, esconder e duplicar ----------
const extraToken = document.createElement('div');
extraToken.className = 'token-extra';

const rotuloNomeToken = document.createElement('small');
rotuloNomeToken.textContent = 'Nome na mesa:';
const campoNomeToken = document.createElement('input');
campoNomeToken.maxLength = 12;
campoNomeToken.onchange = () => {
  if (selecionado) socket.emit('editar-token', { id: selecionado, nome: campoNomeToken.value });
};

const btnOcultar = document.createElement('button');
btnOcultar.className = 'sec';
btnOcultar.onclick = () => {
  const t = selecionado ? tokens[selecionado] : null;
  if (t) socket.emit('editar-token', { id: selecionado, oculto: !t.oculto });
};

const btnDuplicar = document.createElement('button');
btnDuplicar.className = 'sec';
btnDuplicar.textContent = '⧉ Duplicar (com a ficha)';
btnDuplicar.onclick = () => {
  if (selecionado) socket.emit('duplicar-token', { id: selecionado });
};

extraToken.append(rotuloNomeToken, campoNomeToken, btnOcultar, btnDuplicar);
$('sel-mestre').insertBefore(extraToken, $('sel-mestre').querySelector('button'));

const painelTokenSemExtras = atualizarPainelToken;
atualizarPainelToken = function () {
  painelTokenSemExtras();
  const t = selecionado ? tokens[selecionado] : null;
  if (!t || !souMestre) return;
  if (document.activeElement !== campoNomeToken) campoNomeToken.value = t.nome;
  btnOcultar.textContent = t.oculto ? '👁 Mostrar aos jogadores' : '🙈 Esconder dos jogadores';
  btnOcultar.classList.toggle('ativa', !!t.oculto);
};

// ---------- "Trazer todos aqui": o ping do mestre leva a tela de todo mundo até o ponto ----------
const btnPuxar = document.createElement('button');
btnPuxar.textContent = '📣 Trazer todos aqui';
btnPuxar.onclick = () => {
  fecharMenuToque();
  socket.emit('ping', { x: pontoDoMenu.x, y: pontoDoMenu.y, cor: minhaCor(), puxar: true });
};
menuToque.appendChild(btnPuxar);

socket.on('ping', (p) => {
  if (p.puxar) centralizarEm(p.x, p.y);
});

socket.on('estado', () => {
  btnPuxar.style.display = souMestre ? '' : 'none';
});

// ---------- computador: clique direito no mapa abre o menu (pingar, escrever...) ----------
let cliqueDireito = false;
mesaEl.addEventListener('pointerdown', (e) => {
  cliqueDireito = e.pointerType === 'mouse' && e.button === 2;
}, true);

mesaEl.addEventListener('contextmenu', (e) => {
  if (!cliqueDireito || e.target.id === 'caixa-texto') return;
  cliqueDireito = false;
  e.preventDefault();
  abrirMenuToque(e.clientX, e.clientY, pontoNoMapa(e));
});
// fim de extras-mesa.js