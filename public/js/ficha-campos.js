// peças da ficha: recursos, atributos (número ou dado), campos soltos, conta dos dados e listas

function campoNumero(valor, extra) {
  const i = document.createElement('input');
  i.type = 'number';
  i.inputMode = 'numeric';
  i.value = valor;
  Object.assign(i.dataset, extra || {});
  return i;
}

function campoTexto(valor, longo, extra) {
  const i = document.createElement(longo ? 'textarea' : 'input');
  if (longo) i.rows = 2;
  else i.type = 'text';
  i.maxLength = longo ? 300 : 60;
  i.value = valor || '';
  Object.assign(i.dataset, extra || {});
  return i;
}

function seletorDado(valor, extra) {
  const s = document.createElement('select');
  sistema.dados.forEach((d) => {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = d.toUpperCase();
    s.appendChild(o);
  });
  s.value = valor;
  Object.assign(s.dataset, extra || {});
  return s;
}

function botaoPasso(texto, aoClicar) {
  const b = document.createElement('button');
  b.className = 'sec';
  b.textContent = texto;
  b.onclick = aoClicar;
  return b;
}

function secao(box, titulo) {
  const h = document.createElement('h4');
  h.textContent = titulo;
  box.appendChild(h);
}

// ---------- recursos (atual / máximo, com Dano e Curar quando o sistema pede) ----------
function desenharRecursos(box, s, f) {
  s.recursos.forEach((r) => {
    const d = (f.recursos && f.recursos[r.id]) || { v: r.v, max: r.max };
    const linha = document.createElement('div');
    linha.className = 'ficha-recurso';
    const rotulo = document.createElement('b');
    rotulo.textContent = r.nome;
    const v = campoNumero(d.v, { rec: r.id, parte: 'v' });
    const max = campoNumero(d.max, { rec: r.id, parte: 'max' });
    const barra = document.createElement('span');
    barra.textContent = '/';
    linha.append(
      rotulo,
      botaoPasso('−', () => { v.value = Number(v.value) - 1; salvarFicha(); }),
      v,
      barra,
      max,
      botaoPasso('+', () => { v.value = Number(v.value) + 1; salvarFicha(); })
    );
    box.appendChild(linha);

    if (r.acoes) {
      const acao = document.createElement('div');
      acao.className = 'ficha-acoes';
      const qtd = campoNumero(1);
      const mudar = (sinal) => {
        const novo = Number(v.value) + sinal * Math.abs(Number(qtd.value) || 0);
        v.value = Math.max(0, Math.min(Number(max.value), novo));
        salvarFicha();
      };
      acao.append(
        qtd,
        botaoPasso('Dano', () => mudar(r.inverso ? 1 : -1)),
        botaoPasso('Curar', () => mudar(r.inverso ? -1 : 1))
      );
      box.appendChild(acao);
    }
  });
}

// ---------- campos soltos (número ou texto) ----------
function desenharSimples(box, s, f) {
  (s.campos || []).forEach((c) => {
    const linha = document.createElement('div');
    linha.className = 'ficha-recurso';
    const rotulo = document.createElement('b');
    rotulo.textContent = c.nome;
    const valor = f.campos && f.campos[c.id] !== undefined ? f.campos[c.id] : c.v;
    let campo;
    if (c.tipo === 'texto') {
      campo = campoTexto(valor, false, { simples: c.id });
      campo.classList.add('simples-texto');
    } else {
      campo = campoNumero(valor, { simples: c.id });
    }
    linha.append(rotulo, campo);
    box.appendChild(linha);
    if (c.aguenta) {
      const aviso = document.createElement('small');
      aviso.id = 'ficha-aguenta';
      aviso.className = 'mudo';
      aviso.dataset.vida = c.aguenta;
      aviso.dataset.campo = c.id;
      box.appendChild(aviso);
    }
  });
}

// "a armadura aguenta N ataques": vida da armadura dividida pelo quanto ela reduz por ataque
function atualizarAguentaArmadura(box) {
  const alvo = $('ficha-aguenta');
  if (!alvo) return;
  const vida = box.querySelector('[data-rec="' + alvo.dataset.vida + '"][data-parte="v"]');
  const red = box.querySelector('[data-simples="' + alvo.dataset.campo + '"]');
  if (!vida || !red || Number(red.value) <= 0) {
    alvo.textContent = '';
    return;
  }
  const n = Math.floor(Number(vida.value) / Number(red.value));
  alvo.textContent = 'A armadura aguenta ' + n + ' ataque' + (n === 1 ? '' : 's');
}

// ---------- conta dos dados: quantas vezes cada dado foi usado ----------
function atualizarContaDados(box) {
  const alvo = $('ficha-dados');
  if (!alvo) return;
  alvo.textContent = '';
  (sistema.regrasDados || []).forEach((r) => {
    const seletor = r.lista
      ? '.ficha-linha[data-lista="' + r.lista + '"] [data-col="dado"]'
      : '.ficha-atributos [data-parte="dado"]';
    const uso = {};
    box.querySelectorAll(seletor).forEach((sel) => { uso[sel.value] = (uso[sel.value] || 0) + 1; });

    const linha = document.createElement('div');
    linha.className = 'ficha-conta';
    const nome = document.createElement('b');
    nome.textContent = r.nome + ': ';
    linha.appendChild(nome);
    let fechou = true;
    sistema.dados.forEach((d) => {
      const n = uso[d] || 0;
      const chip = document.createElement('span');
      chip.textContent = d + ' ' + n + '/' + r.limite;
      if (n > r.limite || (r.fecha && n < r.limite)) {
        chip.className = 'ruim';
        fechou = false;
      } else if (n === r.limite) {
        chip.className = 'bom';
      }
      linha.appendChild(chip);
    });
    if (r.fecha) {
      const fim = document.createElement('span');
      fim.className = fechou ? 'bom' : 'ruim';
      fim.textContent = fechou ? '✓ conta fechada' : '⚠ sobra ou falta dado';
      linha.appendChild(fim);
    }
    alvo.appendChild(linha);
  });
}

// atualiza tudo o que é calculado a partir da ficha
function atualizarAguenta(box) {
  atualizarAguentaArmadura(box);
  atualizarContaDados(box);
}

// ---------- atributos ----------
function celulaAtributo(a, f) {
  const atual = f.atributos ? f.atributos[a.id] : undefined;
  const cel = document.createElement('div');
  const rotulo = document.createElement('small');
  rotulo.textContent = a.nome;
  cel.appendChild(rotulo);
  if (a.tipo === 'dado') {
    const o = atual && typeof atual === 'object' ? atual : { dado: a.dado, bonus: a.bonus };
    cel.appendChild(seletorDado(o.dado || a.dado, { attr: a.id, parte: 'dado' }));
    if (!a.semBonus) {
      cel.appendChild(campoNumero(o.bonus !== undefined ? o.bonus : a.bonus, { attr: a.id, parte: 'bonus' }));
    }
  } else {
    cel.appendChild(campoNumero(typeof atual === 'number' ? atual : a.v, { attr: a.id }));
  }
  return cel;
}

function desenharAtributos(box, s, f) {
  secao(box, 'Atributos');
  const grid = document.createElement('div');
  grid.className = 'ficha-atributos';
  s.atributos.forEach((a) => grid.appendChild(celulaAtributo(a, f)));
  box.appendChild(grid);

  if (s.rolagens && s.rolagens.length) {
    secao(box, 'Outras rolagens');
    const outras = document.createElement('div');
    outras.className = 'ficha-rolagens';
    s.rolagens.forEach((a) => outras.appendChild(celulaAtributo(a, f)));
    box.appendChild(outras);
  }
}

// ---------- listas (linhas que a pessoa adiciona e tira) ----------
function criarLinha(l, dados) {
  const lin = document.createElement('div');
  lin.className = 'ficha-linha';
  lin.dataset.lista = l.id;
  const campos = document.createElement('div');
  campos.className = 'ficha-linha-campos';
  l.colunas.forEach((c) => {
    const v = dados ? dados[c.id] : undefined;
    const extra = { col: c.id };
    let el;
    if (c.tipo === 'numero') el = campoNumero(v === undefined ? 0 : v, extra);
    else if (c.tipo === 'dado') el = seletorDado(v || sistema.dados[2], extra);
    else el = campoTexto(v, c.tipo === 'longo', extra);
    el.placeholder = c.nome;
    el.title = c.nome;
    el.classList.add('col-' + c.tipo);
    campos.appendChild(el);
  });
  lin.append(campos, botaoPasso('×', () => { lin.remove(); salvarFicha(); }));
  return lin;
}

function desenharListas(box, s, f) {
  (s.listas || []).forEach((l) => {
    secao(box, l.nome);
    const area = document.createElement('div');
    area.dataset.area = l.id;
    ((f.listas && f.listas[l.id]) || []).forEach((d) => area.appendChild(criarLinha(l, d)));
    const mais = botaoPasso('+ Adicionar', () => {
      area.appendChild(criarLinha(l, null));
      atualizarContaDados(box);
    });
    mais.classList.add('ficha-mais');
    box.append(area, mais);
  });
}

// ---------- tudo junto ----------
function desenharCampos(box, s, f) {
  secao(box, 'Recursos');
  desenharRecursos(box, s, f);
  desenharSimples(box, s, f);
  const conta = document.createElement('div');
  conta.id = 'ficha-dados';
  conta.className = 'ficha-dados';
  box.appendChild(conta);
  desenharAtributos(box, s, f);
  desenharListas(box, s, f);
  secao(box, 'Anotações');
  const notas = document.createElement('textarea');
  notas.id = 'ficha-notas';
  notas.placeholder = 'Anotações livres';
  notas.maxLength = 600;
  notas.value = f.notas || '';
  box.appendChild(notas);
  atualizarAguenta(box);
}

// lê tudo o que está escrito na ficha
function lerCampos(box) {
  const f = { recursos: {}, atributos: {}, campos: {}, listas: {}, notas: '' };
  box.querySelectorAll('[data-rec]').forEach((i) => {
    const id = i.dataset.rec;
    f.recursos[id] = f.recursos[id] || {};
    f.recursos[id][i.dataset.parte] = Number(i.value);
  });
  box.querySelectorAll('[data-attr]').forEach((i) => {
    const id = i.dataset.attr;
    const parte = i.dataset.parte;
    if (!parte) {
      f.atributos[id] = Number(i.value);
      return;
    }
    f.atributos[id] = f.atributos[id] || {};
    f.atributos[id][parte] = parte === 'bonus' ? Number(i.value) : i.value;
  });
  box.querySelectorAll('[data-simples]').forEach((i) => {
    f.campos[i.dataset.simples] = i.type === 'number' ? Number(i.value) : i.value;
  });
  // toda lista é enviada, mesmo vazia (assim apagar todas as linhas funciona)
  box.querySelectorAll('[data-area]').forEach((a) => { f.listas[a.dataset.area] = []; });
  box.querySelectorAll('.ficha-linha').forEach((lin) => {
    const o = {};
    lin.querySelectorAll('[data-col]').forEach((c) => {
      o[c.dataset.col] = c.type === 'number' ? Number(c.value) : c.value;
    });
    f.listas[lin.dataset.lista].push(o);
  });
  const n = box.querySelector('#ficha-notas');
  f.notas = n ? n.value : '';
  return f;
}

// o servidor pode ajustar valores (ex.: vida atual maior que a máxima)
function aplicarValores(box, f) {
  box.querySelectorAll('[data-rec]').forEach((i) => {
    const d = f.recursos && f.recursos[i.dataset.rec];
    if (d && i !== document.activeElement) i.value = d[i.dataset.parte];
  });
  atualizarAguenta(box);
}
// fim de ficha-campos.js