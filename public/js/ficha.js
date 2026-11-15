// ficha do token: painel, barras embaixo do token e salvamento (as peças ficam em ficha-campos.js)

let sistema = null; // definição do sistema, enviada pelo servidor
let todosSistemas = [];
let fichaAberta = null; // id do token com a ficha aberta
let salvarTimer = null;
let avisoTimer = null;

const painelFicha = document.createElement('div');
painelFicha.id = 'painel-ficha';
painelFicha.style.display = 'none';
const conteudoFicha = document.createElement('div');
conteudoFicha.className = 'ficha';
painelFicha.appendChild(conteudoFicha);
$('tela-sala').appendChild(painelFicha);
painelFicha.addEventListener('pointerdown', (e) => e.stopPropagation());

function fecharFicha() {
  fichaAberta = null;
  painelFicha.style.display = 'none';
}

if (modoPC) {
  decorarJanela(painelFicha, 'Ficha', 90, 110);
} else {
  const cab = document.createElement('div');
  cab.className = 'ficha-cab';
  const titulo = document.createElement('span');
  titulo.textContent = 'Ficha';
  const fechar = document.createElement('button');
  fechar.textContent = '×';
  fechar.onclick = fecharFicha;
  cab.append(titulo, fechar);
  painelFicha.insertBefore(cab, conteudoFicha);
}

// ---------- barras (vida, sanidade...) embaixo do token ----------
function barraDeVida(el, t) {
  let barras = t.barras;
  // tokens antigos só têm a vida
  if (!barras && t.pvMax > 0) barras = [{ id: 'pv', v: t.pv, max: t.pvMax, cor: '#3ddc84' }];
  barras = (barras || []).filter((b) => b.max > 0);
  let vida = el.querySelector('.vida');
  el.classList.toggle('com-barras', barras.length > 0);
  el.style.setProperty('--b', barras.length);
  if (!barras.length) {
    if (vida) vida.remove();
    return;
  }
  if (!vida) {
    vida = document.createElement('div');
    vida.className = 'vida';
    el.appendChild(vida);
  }
  vida.textContent = '';
  barras.forEach((b) => {
    const caixa = document.createElement('div');
    caixa.className = 'vida-barra';
    const dentro = document.createElement('i');
    dentro.style.width = Math.max(0, Math.min(100, (b.v / b.max) * 100)) + '%';
    dentro.style.background = b.cor;
    caixa.appendChild(dentro);
    vida.appendChild(caixa);
  });
}

// ---------- montar e salvar ----------
function desenharFicha(nome, f) {
  const box = conteudoFicha;
  box.textContent = '';
  if (!sistema) {
    box.textContent = 'Carregando o sistema...';
    return;
  }
  const titulo = document.createElement('h3');
  titulo.textContent = nome;
  box.appendChild(titulo);

  // só o mestre troca o sistema da campanha
  if (souMestre && todosSistemas.length > 1) {
    const sel = document.createElement('select');
    sel.className = 'ficha-sistema';
    todosSistemas.forEach((s) => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.nome;
      sel.appendChild(o);
    });
    sel.value = sistema.id;
    sel.onchange = () => socket.emit('definir-sistema', { id: sel.value });
    box.appendChild(sel);
  } else {
    const sub = document.createElement('small');
    sub.className = 'mudo';
    sub.textContent = sistema.nome;
    box.appendChild(sub);
  }

  desenharCampos(box, sistema, f);

  const estado = document.createElement('div');
  estado.className = 'ficha-estado';
  estado.id = 'ficha-estado';
  box.appendChild(estado);
}

function salvarFicha() {
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(() => {
    if (!fichaAberta) return;
    socket.emit('salvar-ficha', { id: fichaAberta, ficha: lerCampos(conteudoFicha) }, (r) => {
      const estado = $('ficha-estado');
      if (!r.ok) {
        if (estado) estado.textContent = r.erro || 'Não salvou';
        return;
      }
      aplicarValores(conteudoFicha, r.ficha);
      if (estado) {
        estado.textContent = 'Salvo ✓';
        clearTimeout(avisoTimer);
        avisoTimer = setTimeout(() => { estado.textContent = ''; }, 1500);
      }
    });
  }, 250);
}

// qualquer campo que mude salva a ficha (menos o seletor de sistema)
conteudoFicha.addEventListener('change', (e) => {
  if (e.target.classList.contains('ficha-sistema')) return;
  salvarFicha();
});
conteudoFicha.addEventListener('input', () => atualizarAguenta(conteudoFicha));

// ---------- abrir ----------
function abrirFicha(id) {
  socket.emit('obter-ficha', { id }, (r) => {
    if (!r.ok) {
      alert(r.erro || 'Sem acesso a essa ficha');
      return;
    }
    fichaAberta = id;
    desenharFicha(r.nome, r.ficha);
    painelFicha.style.display = 'block';
    if (modoPC) trazerParaFrente(painelFicha);
  });
}

// botão 📋 na moldura do token selecionado
function criarAlcaFicha(id) {
  const alca = document.createElement('div');
  alca.className = 'alca-ficha';
  alca.textContent = '📋';
  alca.addEventListener('pointerdown', (e) => e.stopPropagation());
  alca.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirFicha(id);
  });
  return alca;
}

// ---------- o que chega do servidor ----------
socket.on('estado', () => {
  fecharFicha();
  socket.emit('sistema', {}, (r) => {
    if (r.ok) {
      sistema = r.sistema;
      todosSistemas = r.sistemas || [];
    }
  });
});

socket.on('sistema-mudou', ({ sistema: novo }) => {
  sistema = novo;
  fecharFicha();
});

socket.on('token-barras', ({ id, barras }) => {
  const t = tokens[id];
  if (!t) return;
  t.barras = barras;
  const el = $(id);
  if (el) barraDeVida(el, t);
});

socket.on('ficha-atualizada', ({ id, nome, ficha }) => {
  if (fichaAberta === id && painelFicha.style.display !== 'none') desenharFicha(nome, ficha);
});

socket.on('tokens', (t) => {
  if (fichaAberta && !t[fichaAberta]) fecharFicha();
});
// fim de ficha.js