// extras do token: condições (envenenado, caído...) e a distância ao arrastar
// (carrega depois do moldura.js e do nevoa.js)

const CONDICOES = [
  ['sangrando', '🩸', 'Sangrando'],
  ['envenenado', '🤢', 'Envenenado'],
  ['atordoado', '💫', 'Atordoado'],
  ['caido', '🛌', 'Caído'],
  ['inconsciente', '😵', 'Inconsciente'],
  ['chamas', '🔥', 'Em chamas'],
  ['congelado', '❄️', 'Congelado'],
  ['medo', '😱', 'Com medo'],
  ['preso', '⛓️', 'Preso'],
  ['invisivel', '👻', 'Invisível'],
  ['protegido', '🛡️', 'Protegido'],
  ['morto', '💀', 'Morto']
];

let condDe = null; // token com o menu de condições aberto

// ---------- emojis do lado do token ----------
function desenharCondicoes(el, t) {
  let caixa = el.querySelector('.conds');
  const lista = CONDICOES.filter((c) => (t.cond || []).includes(c[0]));
  if (!lista.length) {
    if (caixa) caixa.remove();
    return;
  }
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'conds';
    el.appendChild(caixa);
  }
  caixa.textContent = '';
  lista.forEach(([, emoji, nome]) => {
    const i = document.createElement('i');
    i.textContent = emoji;
    i.title = nome;
    caixa.appendChild(i);
  });
}

// ---------- menu pra marcar e desmarcar ----------
const menuCond = document.createElement('div');
menuCond.id = 'menu-cond';
menuCond.style.display = 'none';
menuCond.addEventListener('pointerdown', (e) => e.stopPropagation());
$('tela-sala').appendChild(menuCond);

function fecharCondicoes() {
  condDe = null;
  menuCond.style.display = 'none';
}

function mudarCondicoes(id, nova) {
  const t = tokens[id];
  if (!t) return;
  t.cond = CONDICOES.map((c) => c[0]).filter((c) => nova.includes(c));
  const el = $(id);
  if (el) desenharCondicoes(el, t);
  if (condDe === id) montarCondicoes();
  socket.emit('condicoes-token', { id, cond: t.cond });
}

function montarCondicoes() {
  const t = condDe ? tokens[condDe] : null;
  if (!t) return fecharCondicoes();
  const id = condDe;
  const ativas = t.cond || [];
  menuCond.textContent = '';

  const cab = document.createElement('div');
  cab.className = 'cond-cab';
  const titulo = document.createElement('b');
  titulo.textContent = 'Condições: ' + t.nome;
  const fechar = document.createElement('button');
  fechar.textContent = '×';
  fechar.onclick = fecharCondicoes;
  cab.append(titulo, fechar);

  const lista = document.createElement('div');
  lista.className = 'cond-lista';
  CONDICOES.forEach(([c, emoji, nome]) => {
    const b = document.createElement('button');
    b.className = 'sec' + (ativas.includes(c) ? ' ativa' : '');
    b.textContent = emoji + ' ' + nome;
    b.onclick = () => mudarCondicoes(id, ativas.includes(c) ? ativas.filter((x) => x !== c) : ativas.concat(c));
    lista.appendChild(b);
  });

  const limpar = document.createElement('button');
  limpar.className = 'sec cond-limpar';
  limpar.textContent = 'Tirar todas';
  limpar.onclick = () => mudarCondicoes(id, []);

  menuCond.append(cab, lista, limpar);
}

function abrirCondicoes(id) {
  condDe = id;
  montarCondicoes();
  menuCond.style.display = 'block';
}

document.addEventListener('pointerdown', (e) => {
  if (menuCond.style.display === 'block' && !e.target.closest('#menu-cond, .alca-cond')) fecharCondicoes();
}, true);

// botão ✨ na moldura do token selecionado (do lado direito)
const molduraSemCondicoes = atualizarMoldura;
atualizarMoldura = function () {
  molduraSemCondicoes();
  const moldura = document.querySelector('#mesa .moldura');
  if (!moldura || !selecionado) return;
  const id = selecionado;
  const alca = document.createElement('div');
  alca.className = 'alca-cond';
  alca.textContent = '✨';
  alca.title = 'Condições';
  alca.addEventListener('pointerdown', (e) => e.stopPropagation());
  alca.addEventListener('click', (e) => {
    e.stopPropagation();
    if (condDe === id && menuCond.style.display === 'block') fecharCondicoes();
    else abrirCondicoes(id);
  });
  moldura.appendChild(alca);
};

// ---------- distância ao arrastar (na escala da grade) ----------
function ligarMedida(el, id) {
  let inicio = null;
  let etiqueta = null;
  el.addEventListener('pointerdown', () => {
    const t = tokens[id];
    inicio = t && podeMover(t) ? { x: t.x, y: t.y } : null;
  });
  el.addEventListener('pointermove', () => {
    const t = tokens[id];
    if (!inicio || !t || !el.dataset.arrastando) return;
    const quadrados = Math.hypot(t.x - inicio.x, ((t.y - inicio.y) * mesaEl.offsetHeight) / mesaEl.offsetWidth) * grade.colunas;
    if (!etiqueta && quadrados < 0.25) return;
    if (!etiqueta) {
      etiqueta = document.createElement('div');
      etiqueta.className = 'medida';
      el.appendChild(etiqueta);
    }
    etiqueta.textContent = formatarNumero(Math.round(quadrados * grade.valor * 10) / 10) + ' ' + grade.unidade;
  });
  const fim = () => {
    inicio = null;
    if (etiqueta) etiqueta.remove();
    etiqueta = null;
  };
  el.addEventListener('pointerup', fim);
  el.addEventListener('pointercancel', fim);
}

// toda vez que a mesa é redesenhada, os tokens ganham as condições e a medida
const desenharSemExtras = desenhar;
desenhar = function () {
  desenharSemExtras();
  for (const id in tokens) {
    const el = $(id);
    if (!el) continue;
    desenharCondicoes(el, tokens[id]);
    ligarMedida(el, id);
  }
  if (condDe && !tokens[condDe]) fecharCondicoes();
};

// ---------- o que chega do servidor ----------
socket.on('token-condicoes', ({ id, cond }) => {
  const t = tokens[id];
  if (!t) return;
  t.cond = cond;
  const el = $(id);
  if (el) desenharCondicoes(el, t);
  if (condDe === id) montarCondicoes();
});

socket.on('estado', fecharCondicoes);
// fim de extras-token.js