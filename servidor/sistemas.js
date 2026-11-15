// sistemas de RPG. Cada sistema diz o que a ficha tem:
//   recursos:    contadores atual/máximo (barra: true faz a barra aparecer embaixo do token;
//                acoes: true mostra Dano e Curar; inverso: true faz o Dano subir o número)
//   campos:      números soltos (ou tipo: 'texto')
//   atributos:   tipo 'numero' ou 'dado' (dado + bônus; semBonus: true esconde o bônus)
//   rolagens:    como atributos, mas numa seção à parte ("Outras rolagens")
//   regrasDados: conta dos dados (limite por dado; fecha: true exige usar todos)
//   listas:      linhas que a pessoa adiciona e tira (colunas: texto, longo, numero, dado)
// Pra adicionar outro sistema, copie um bloco e troque os campos.

const DADOS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const txt = (id, nome) => ({ id, nome, tipo: 'texto' });
const longo = (id, nome) => ({ id, nome, tipo: 'longo' });
const num = (id, nome) => ({ id, nome, tipo: 'numero' });
const dado = (id, nome) => ({ id, nome, tipo: 'dado' });

// perícias do sistema André: cada uma começa com um dado diferente (dá pra trocar)
const PERICIAS = [
  'Atletismo (Força)',
  'Acrobacia (Destreza)',
  'Furtividade (Destreza)',
  'Prestidigitação (Destreza)',
  'História (Inteligência)',
  'Investigação (Inteligência)',
  'Natureza (Inteligência)',
  'Ocultismo (Inteligência)',
  'Religião (Inteligência)'
].map((nome, i) => ({ nome, dado: DADOS[i % DADOS.length] }));

const SISTEMAS = {
  lumen: {
    id: 'lumen',
    nome: 'Lumen Mora',
    recursos: [
      { id: 'vida', nome: 'Vida Superficial', v: 15, max: 19, barra: true, cor: '#3ddc84' },
      { id: 'graves', nome: 'Ferimentos Graves', v: 7, max: 7 },
      { id: 'alma', nome: 'Alma', v: 6, max: 6 },
      { id: 'armadura', nome: 'Vida da armadura (VA)', v: 14, max: 14 }
    ],
    campos: [{ id: 'reducao', nome: 'Armadura reduz por ataque', v: 1, aguenta: 'armadura' }],
    atributos: ['FOR', 'DES', 'CON', 'SAB', 'INT', 'CAR'].map((id) => ({ id, nome: id, tipo: 'dado', dado: 'd8', bonus: 0 })),
    listas: [
      { id: 'extras', nome: 'Recursos extras (ex.: Sangue)', colunas: [txt('nome', 'Nome'), num('v', 'Atual'), num('max', 'Máx')] },
      { id: 'talentos', nome: 'Talentos', colunas: [txt('nome', 'Talento'), dado('dado', 'Dado'), num('bonus', 'Bônus')] },
      { id: 'combate', nome: 'Combate', colunas: [txt('nome', 'Arma'), dado('dado', 'Dado'), num('bonus', 'Bônus'), longo('descricao', 'Descrição')] },
      { id: 'habilidades', nome: 'Habilidades', colunas: [txt('nome', 'Habilidade'), longo('descricao', 'O que faz')] },
      { id: 'tracos', nome: 'Traços', colunas: [txt('nome', 'Traço'), longo('descricao', 'Descrição')] }
    ]
  },
  cthulhu: {
    id: 'cthulhu',
    nome: 'Call of Cthulhu',
    recursos: [
      { id: 'pv', nome: 'PV', v: 10, max: 10, barra: true, cor: '#3ddc84' },
      { id: 'san', nome: 'Sanidade', v: 50, max: 99, barra: true, cor: '#4ea8ff' },
      { id: 'pm', nome: 'PM', v: 10, max: 10 },
      { id: 'sorte', nome: 'Sorte', v: 50, max: 99 }
    ],
    campos: [],
    atributos: ['FOR', 'CON', 'TAM', 'DES', 'APA', 'INT', 'POD', 'EDU'].map((id) => ({ id, nome: id, tipo: 'numero', v: 50 })),
    listas: []
  },
  andre: {
    id: 'andre',
    nome: 'André',
    recursos: [
       { id: 'vida', nome: 'Pontos de vida', v: 10, max: 10, barra: true, cor: '#3ddc84' },
       { id: 'estresse', nome: 'Pontos de estresse', v: 0, max: 20 }
    ],
    campos: [
      { id: 'xp', nome: 'XP', v: 0 },
      { id: 'determinacao', nome: 'Determinação', v: 0 },
      { id: 'deslocamento', nome: 'Deslocamento (m)', v: 9 },
      { id: 'estereotipo', nome: 'Estereótipo', tipo: 'texto', v: '' }
    ],
    atributos: [
      ['forca', 'Força'], ['destreza', 'Destreza'], ['constituicao', 'Constituição'],
      ['inteligencia', 'Inteligência'], ['sabedoria', 'Sabedoria'], ['carisma', 'Carisma']
    ].map(([id, nome], i) => ({ id, nome, tipo: 'dado', semBonus: true, dado: DADOS[i], bonus: 0 })),
    rolagens: [
      { id: 'iniciativa', nome: 'Iniciativa', tipo: 'dado', semBonus: true, dado: 'd20', bonus: 0 },
      { id: 'estresseDado', nome: 'Estresse', tipo: 'dado', semBonus: true, dado: 'd20', bonus: 0 }
    ],
    regrasDados: [
      { nome: 'Atributos', atributos: true, limite: 1, fecha: true },
      { nome: 'Perícias', lista: 'pericias', limite: 3 }
    ],
    listas: [
      { id: 'pericias', nome: 'Perícias', colunas: [txt('nome', 'Perícia'), dado('dado', 'Dado')], linhas: PERICIAS },
      { id: 'habilidades', nome: 'Habilidades', colunas: [txt('nome', 'Habilidade'), longo('descricao', 'O que faz')] }
    ]
  }
};

function existe(id) {
  return Object.prototype.hasOwnProperty.call(SISTEMAS, id);
}

function obter(id) {
  const s = existe(id) ? SISTEMAS[id] : SISTEMAS.lumen;
  return Object.assign({}, s, { dados: DADOS });
}

function lista() {
  return Object.values(SISTEMAS).map((s) => ({ id: s.id, nome: s.nome }));
}

function todosAtributos(s) {
  return s.atributos.concat(s.rolagens || []);
}

function fichaVazia(s) {
  const f = { recursos: {}, atributos: {}, campos: {}, listas: {}, notas: '' };
  s.recursos.forEach((r) => { f.recursos[r.id] = { v: r.v, max: r.max }; });
  todosAtributos(s).forEach((a) => {
    f.atributos[a.id] = a.tipo === 'dado' ? { dado: a.dado, bonus: a.bonus } : a.v;
  });
  (s.campos || []).forEach((c) => { f.campos[c.id] = c.v; });
  (s.listas || []).forEach((l) => { f.listas[l.id] = (l.linhas || []).map((x) => Object.assign({}, x)); });
  return f;
}

function inteiro(n, min, max, padrao) {
  n = Math.round(Number(n));
  if (!isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

function valorDaColuna(c, v) {
  if (c.tipo === 'numero') return inteiro(v, -9999, 9999, 0);
  if (c.tipo === 'dado') return DADOS.includes(v) ? v : DADOS[2];
  return String(v || '').slice(0, c.tipo === 'longo' ? 300 : 60);
}

// confere o que chegou do navegador e devolve uma ficha segura
function limpar(s, f) {
  f = f && typeof f === 'object' ? f : {};
  const base = fichaVazia(s);

  s.recursos.forEach((r) => {
    const x = f.recursos && f.recursos[r.id] && typeof f.recursos[r.id] === 'object' ? f.recursos[r.id] : {};
    const max = inteiro(x.max, 0, 9999, r.max);
    const v = inteiro(x.v, 0, 9999, r.v);
    base.recursos[r.id] = { v: Math.min(v, max), max };
  });

  todosAtributos(s).forEach((a) => {
    const x = f.atributos ? f.atributos[a.id] : undefined;
    if (a.tipo === 'dado') {
      const o = x && typeof x === 'object' ? x : {};
      base.atributos[a.id] = {
        dado: DADOS.includes(o.dado) ? o.dado : a.dado,
        bonus: inteiro(o.bonus, -99, 99, a.bonus)
      };
    } else {
      base.atributos[a.id] = inteiro(x, 0, 999, a.v);
    }
  });

  (s.campos || []).forEach((c) => {
    const x = f.campos ? f.campos[c.id] : undefined;
    base.campos[c.id] = c.tipo === 'texto'
      ? String(x === undefined ? c.v : x).slice(0, 60)
      : inteiro(x, 0, 9999, c.v);
  });

  (s.listas || []).forEach((l) => {
    const bruto = f.listas && Array.isArray(f.listas[l.id]) ? f.listas[l.id].slice(0, 30) : null;
    if (!bruto) return; // sem lista no que chegou: fica a padrão
    base.listas[l.id] = bruto.map((lin) => {
      const o = lin && typeof lin === 'object' ? lin : {};
      const nova = {};
      l.colunas.forEach((c) => { nova[c.id] = valorDaColuna(c, o[c.id]); });
      return nova;
    });
  });

  base.notas = String(f.notas || '').slice(0, 600);
  return base;
}

module.exports = { obter, existe, lista, fichaVazia, limpar };
// fim de sistemas.js