// névoa de guerra: o mestre cobre o mapa e vai revelando; os jogadores só veem o que foi revelado
// (precisa carregar depois do regua.js)

let nevoa = { ativa: false, base: 'coberto', tracos: [] };
let modoNevoa = 'r'; // r = revelar, c = cobrir
let tamanhoNevoa = 10;
let pincelNevoa = null; // traço em andamento (só o mestre)
let btnNevoa = null;
let painelNevoa = null;
let btnLigaNevoa = null;
let btnRevelar = null;
let btnCobrir = null;

const telaNevoa = document.createElement('canvas');
telaNevoa.id = 'nevoa';
mesaEl.appendChild(telaNevoa);

// ---------- desenho ----------
function riscarNevoa(ctx, t) {
  const cw = telaNevoa.width;
  const ch = telaNevoa.height;
  ctx.globalCompositeOperation = t.m === 'r' ? 'destination-out' : 'source-over';
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = t.r * 2 * cw;
  const p = t.pontos;
  ctx.beginPath();
  if (p.length === 1) {
    ctx.arc(p[0][0] * cw, p[0][1] * ch, t.r * cw, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.moveTo(p[0][0] * cw, p[0][1] * ch);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0] * cw, p[i][1] * ch);
  ctx.stroke();
}

function redesenharNevoa() {
  mesaEl.classList.toggle('nevoa-ativa', nevoa.ativa);
  mesaEl.classList.toggle('nevoa-mestre', souMestre);
  const W = mesaEl.offsetWidth;
  const H = mesaEl.offsetHeight;
  if (!W || !H) return;
  const cw = 1000;
  const ch = Math.round((cw * H) / W);
  if (telaNevoa.width !== cw || telaNevoa.height !== ch) {
    telaNevoa.width = cw;
    telaNevoa.height = ch;
  }
  const ctx = telaNevoa.getContext('2d');
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cw, ch);
  if (!nevoa.ativa) return;
  if (nevoa.base === 'coberto') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
  }
  nevoa.tracos.forEach((t) => riscarNevoa(ctx, t));
  if (pincelNevoa) riscarNevoa(ctx, pincelNevoa);
}

new ResizeObserver(redesenharNevoa).observe(mesaEl);

// ---------- pincel do mestre ----------
function nevoaPronta() {
   return souMestre && ferramenta === 'nevoa';
}

function enviarPincel() {
  if (!pincelNevoa) return;
  const t = pincelNevoa;
  pincelNevoa = null;
  socket.emit('nevoa-traco', t);
}

mesaEl.addEventListener('pointerdown', (e) => {
  if (!nevoaPronta()) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!nevoa.ativa) { nevoa.ativa = true; socket.emit('nevoa-ativar', { ativa: true }); } // pintou com ela desligada: liga sozinha
  const p = pontoNoMapa(e);
  pincelNevoa = { m: modoNevoa, r: tamanhoNevoa / 200, pontos: [[p.x, p.y]] };
  redesenharNevoa();
});

mesaEl.addEventListener('pointermove', (e) => {
  if (!pincelNevoa) return;
  const p = pontoNoMapa(e);
  const ult = pincelNevoa.pontos[pincelNevoa.pontos.length - 1];
  if (Math.hypot(p.x - ult[0], p.y - ult[1]) < 0.004) return;
  pincelNevoa.pontos.push([p.x, p.y]);
  riscarNevoa(telaNevoa.getContext('2d'), pincelNevoa);
  if (pincelNevoa.pontos.length >= 300) {
    // traço muito longo: envia e continua num novo, do mesmo ponto
    const base = { m: pincelNevoa.m, r: pincelNevoa.r };
    enviarPincel();
    pincelNevoa = { m: base.m, r: base.r, pontos: [[p.x, p.y]] };
  }
});

mesaEl.addEventListener('pointerup', enviarPincel);
mesaEl.addEventListener('pointercancel', enviarPincel);

// ---------- botão na barra e painel de opções ----------
function criarBotaoNevoa(texto, acao) {
  const b = document.createElement('button');
  b.className = 'sec';
  b.textContent = texto;
  b.onclick = acao;
  return b;
}

function criarPainelNevoa() {
  painelNevoa = document.createElement('div');
  painelNevoa.id = 'painel-nevoa';
  painelNevoa.style.display = 'none';

  btnLigaNevoa = criarBotaoNevoa('', () => socket.emit('nevoa-ativar', { ativa: !nevoa.ativa }));
  btnRevelar = criarBotaoNevoa('👁 Revelar', () => { modoNevoa = 'r'; atualizarPainelNevoa(); });
  btnCobrir = criarBotaoNevoa('⬛ Cobrir', () => { modoNevoa = 'c'; atualizarPainelNevoa(); });
  const linha1 = document.createElement('div');
  linha1.className = 'nevoa-linha';
  linha1.append(btnLigaNevoa, btnRevelar, btnCobrir);

  const rotulo = document.createElement('small');
  rotulo.textContent = 'Pincel';
  const tamanho = document.createElement('input');
  tamanho.type = 'range';
  tamanho.min = '2';
  tamanho.max = '30';
  tamanho.value = String(tamanhoNevoa);
  tamanho.oninput = () => { tamanhoNevoa = Number(tamanho.value); };
  const linha2 = document.createElement('div');
  linha2.className = 'nevoa-linha';
  linha2.append(rotulo, tamanho);

  const desfazer = criarBotaoNevoa('↶ Desfazer', () => socket.emit('nevoa-desfazer', {}));
  const cobrirTudo = criarBotaoNevoa('Cobrir tudo', () => {
    if (confirm('Cobrir o mapa inteiro? Isso apaga o que já foi revelado.')) socket.emit('nevoa-tudo', { base: 'coberto' });
  });
  const revelarTudo = criarBotaoNevoa('Revelar tudo', () => {
    if (confirm('Revelar o mapa inteiro?')) socket.emit('nevoa-tudo', { base: 'aberto' });
  });
  const linha3 = document.createElement('div');
  linha3.className = 'nevoa-linha';
  linha3.append(desfazer, cobrirTudo, revelarTudo);

  painelNevoa.append(linha1, linha2, linha3);
  painelNevoa.addEventListener('pointerdown', (e) => e.stopPropagation());
  $('tela-sala').appendChild(painelNevoa);
}

function atualizarPainelNevoa() {
  if (!painelNevoa) return;
  painelNevoa.style.display = souMestre && ferramenta === 'nevoa' ? 'block' : 'none';
  btnLigaNevoa.textContent = nevoa.ativa ? '🌫️ Névoa ligada' : '🌫️ Névoa desligada';
  btnLigaNevoa.classList.toggle('ativa', nevoa.ativa);
  btnRevelar.classList.toggle('ativa', modoNevoa === 'r');
  btnCobrir.classList.toggle('ativa', modoNevoa === 'c');
}

function prepararBotaoNevoa() {
  if (!btnNevoa) {
    btnNevoa = document.createElement('button');
    btnNevoa.className = 'sec';
    btnNevoa.textContent = '🌫️ Névoa';
    btnNevoa.onclick = () => escolherFerramenta('nevoa');
    botoesFerramenta.nevoa = btnNevoa;
    $('ferramentas').insertBefore(btnNevoa, btnFixar);
    criarPainelNevoa();
  }
  btnNevoa.style.display = souMestre ? '' : 'none';
  atualizarPainelNevoa();
}

// quando a ferramenta muda, o painel da névoa aparece ou some
const escolherOriginal = escolherFerramenta;
escolherFerramenta = function (id) {
  escolherOriginal(id);
  atualizarPainelNevoa();
};

// ---------- o que chega do servidor ----------
function carregarNevoa() {
  socket.emit('nevoa-obter', {}, (r) => {
    if (!r || !r.ok) return;
    nevoa = r.nevoa;
    redesenharNevoa();
    atualizarPainelNevoa();
  });
}

socket.on('nevoa', (n) => {
  nevoa = n;
  redesenharNevoa();
  atualizarPainelNevoa();
});

socket.on('nevoa-traco', (t) => {
  nevoa.tracos.push(t);
  redesenharNevoa();
});

socket.on('nevoa-aviso', ({ texto }) => {
  alert(texto);
  redesenharNevoa();
});

socket.on('estado', () => {
  prepararBotaoNevoa();
  carregarNevoa();
});
socket.on('mapa', carregarNevoa);
if (btnFixar && btnFixar.parentElement) btnFixar.parentElement.classList.add('barra-ferr');
// fim de nevoa.js