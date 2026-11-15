// modo PC: mapa em tela cheia, menu ☰ e janelas flutuantes que a pessoa arrasta

const modoPC = window.matchMedia('(min-width: 900px)').matches;
const JANELAS = [];
let zJanela = 100;

function lerPosicoes() {
  try { return JSON.parse(localStorage.getItem('janelas') || '{}'); } catch (e) { return {}; }
}

function guardarPosicao(id, x, y) {
  const todas = lerPosicoes();
  todas[id] = { x, y };
  try { localStorage.setItem('janelas', JSON.stringify(todas)); } catch (e) {}
}

function trazerParaFrente(el) {
  zJanela++;
  el.style.zIndex = zJanela;
}

// cliques na interface não movem o mapa nem tiram a seleção do token
function bloquearGestos(el) {
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
}

function ligarArrasteJanela(el, cab) {
  let arrasto = null;
  cab.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.janela-x')) return;
    trazerParaFrente(el);
    const r = el.getBoundingClientRect();
    arrasto = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    cab.setPointerCapture(e.pointerId);
  });
  cab.addEventListener('pointermove', (e) => {
    if (!arrasto) return;
    const x = Math.min(window.innerWidth - 60, Math.max(60 - el.offsetWidth, e.clientX - arrasto.dx));
    const y = Math.min(window.innerHeight - 40, Math.max(0, e.clientY - arrasto.dy));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });
  const soltar = () => {
    if (!arrasto) return;
    arrasto = null;
    guardarPosicao(el.id, parseFloat(el.style.left), parseFloat(el.style.top));
  };
  cab.addEventListener('pointerup', soltar);
  cab.addEventListener('pointercancel', soltar);
}

// transforma um elemento numa janela com barra de título e botão de fechar
function decorarJanela(el, titulo, padraoX, padraoY) {
  const corpo = document.createElement('div');
  corpo.className = 'janela-corpo';
  while (el.firstChild) corpo.appendChild(el.firstChild);

  const cab = document.createElement('div');
  cab.className = 'janela-cab';
  const nome = document.createElement('span');
  nome.textContent = titulo;
  const fechar = document.createElement('button');
  fechar.className = 'janela-x';
  fechar.textContent = '×';
  fechar.onclick = () => { el.style.display = 'none'; };
  cab.append(nome, fechar);

  el.classList.add('janela');
  el.append(cab, corpo);

  const salva = lerPosicoes()[el.id];
  const x = salva ? salva.x : padraoX;
  const y = salva ? salva.y : padraoY;
  el.style.left = Math.min(window.innerWidth - 120, Math.max(0, x)) + 'px';
  el.style.top = Math.min(window.innerHeight - 60, Math.max(0, y)) + 'px';

  el.addEventListener('pointerdown', (e) => {
    trazerParaFrente(el);
    e.stopPropagation();
  });
  ligarArrasteJanela(el, cab);
}

function montarMenu(menu) {
  menu.textContent = '';
  JANELAS.filter((j) => !j.soMestre || souMestre).forEach((j) => {
    const w = $(j.id);
    const item = document.createElement('button');
    item.className = 'menu-item';
    item.textContent = (w.style.display === 'block' ? '✓ ' : '') + j.titulo;
    item.onclick = () => {
      if (w.style.display === 'block') {
        w.style.display = 'none';
      } else {
        w.style.display = 'block';
        trazerParaFrente(w);
      }
      menu.style.display = 'none';
    };
    menu.appendChild(item);
  });
}

function iniciarModoPC() {
  const sala = $('tela-sala');
  sala.classList.add('pc');

  // as três caixas do mestre viram janelas
  const nomes = [['janela-mapas', 'Meus mapas'], ['janela-grade', 'Grade e escala'], ['janela-tokens', 'Meus tokens']];
  Array.from($('painel').querySelectorAll('details')).forEach((d, i) => {
    const j = document.createElement('div');
    j.id = nomes[i][0];
    j.style.display = 'none';
    Array.from(d.children).forEach((c) => { if (c.tagName !== 'SUMMARY') j.appendChild(c); });
    d.remove();
    sala.appendChild(j);
    decorarJanela(j, nomes[i][1], 70 + i * 28, 70 + i * 28);
    JANELAS.push({ id: nomes[i][0], titulo: nomes[i][1], soMestre: true });
  });

  // lista de jogadores
  const jog = document.createElement('div');
  jog.id = 'janela-jogadores';
  jog.style.display = 'none';
  jog.appendChild($('lista'));
  sala.appendChild(jog);
  decorarJanela(jog, 'Jogadores', 154, 154);
  JANELAS.push({ id: 'janela-jogadores', titulo: 'Jogadores', soMestre: false });

  // painel do token selecionado (o código já mostra e esconde sozinho)
  decorarJanela($('painel-token'), 'Token', window.innerWidth - 340, 70);

  // botão ☰ e a lista do menu
  const btn = document.createElement('button');
  btn.id = 'btn-menu';
  btn.textContent = '☰';
  const menu = document.createElement('div');
  menu.id = 'menu-pc';
  menu.style.display = 'none';
  btn.onclick = () => {
    if (menu.style.display === 'block') {
      menu.style.display = 'none';
    } else {
      montarMenu(menu);
      menu.style.display = 'block';
    }
  };
  sala.append(btn, menu);
  bloquearGestos(btn);
  bloquearGestos(menu);
  bloquearGestos(sala.querySelector('.topo'));

  // clicar fora fecha o menu
  document.addEventListener('pointerdown', (e) => {
    if (menu.style.display !== 'block') return;
    if (e.target.closest('#menu-pc, #btn-menu')) return;
    menu.style.display = 'none';
  }, true);
}

if (modoPC) iniciarModoPC();