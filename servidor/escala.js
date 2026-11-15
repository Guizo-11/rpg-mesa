const UNIDADES = ['cm', 'm', 'km', 'pés'];

function padrao() {
  return { mostrar: false, colunas: 12, valor: 1, unidade: 'm' };
}

// confere o que chegou e devolve uma grade segura
function validar(g, atual) {
  const base = atual || padrao();
  if (!g || typeof g !== 'object') return base;
  const colunas = Math.round(Number(g.colunas));
  const valor = Math.round(Number(g.valor) * 100) / 100;
  return {
    mostrar: typeof g.mostrar === 'boolean' ? g.mostrar : base.mostrar,
    colunas: isFinite(colunas) ? Math.min(80, Math.max(4, colunas)) : base.colunas,
    valor: isFinite(valor) && valor > 0 ? Math.min(100000, valor) : base.valor,
    unidade: UNIDADES.includes(g.unidade) ? g.unidade : base.unidade
  };
}

module.exports = { padrao, validar, UNIDADES };