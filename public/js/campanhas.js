// campanhas: lista no estilo "meus jogos", criar, entrar com código, apagar e sair

let listaCampanhas = [];

function carregarCampanhas() {
  socket.emit('minhas-campanhas', {}, (r) => {
    if (r.ok) mostrarCampanhas(r.campanhas);
  });
}

function mostrarCampanhas(lista) {
  listaCampanhas = lista;
  desenharCampanhas();
}

function filtrarCampanhas() {
  desenharCampanhas();
}

function dataBonita(ms) {
  if (!ms) return 'ainda não jogada';
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function desenharCampanhas() {
  const div = $('campanhas');
  const termo = $('busca-campanha').value.trim().toLowerCase();
  const lista = listaCampanhas.filter((c) => c.nome.toLowerCase().includes(termo));
  div.textContent = '';
  if (lista.length === 0) {
    const p = document.createElement('p');
    p.className = 'mudo';
    p.textContent = listaCampanhas.length === 0
      ? 'Você ainda não tem campanhas. Crie uma ou entre com um código.'
      : 'Nenhuma campanha com esse nome.';
    div.appendChild(p);
    return;
  }
  lista.forEach((c) => div.appendChild(cartaoCampanha(c)));
}

function cartaoCampanha(c) {
  const card = document.createElement('div');
  card.className = 'camp';

  const capa = document.createElement('div');
  capa.className = 'camp-capa';
  if (c.capa) capa.style.backgroundImage = 'url("' + c.capa + '")';
  else capa.textContent = c.nome.slice(0, 1).toUpperCase();

  const corpo = document.createElement('div');
  corpo.className = 'camp-corpo';

  const titulo = document.createElement('div');
  titulo.className = 'camp-titulo';
  titulo.textContent = c.nome;
  const selo = document.createElement('span');
  selo.className = 'selo' + (c.souMestre ? ' mestre' : '');
  selo.textContent = c.souMestre ? 'Mestre' : 'Jogador';
  titulo.appendChild(selo);
  if (c.aoVivo) {
    const vivo = document.createElement('span');
    vivo.className = 'selo vivo';
    vivo.textContent = '🟢 ao vivo';
    titulo.appendChild(vivo);
  }

  const avatares = document.createElement('div');
  avatares.className = 'avatares';
  c.participantes.slice(0, 8).forEach((p) => {
    const a = document.createElement('div');
    a.className = 'avatar';
    a.title = p.nome;
    preencherAvatar(a, p.nome, p.foto);
    avatares.appendChild(a);
  });
  if (c.participantes.length > 8) {
    const mais = document.createElement('div');
    mais.className = 'avatar';
    mais.textContent = '+' + (c.participantes.length - 8);
    avatares.appendChild(mais);
  }

  const info = document.createElement('div');
  info.className = 'mudo';
  info.textContent = (c.souMestre ? 'Código ' + c.codigo : 'Mestre: ' + c.mestreNome)
    + ' · Última vez: ' + dataBonita(c.ultimoAcesso);

  const acoes = document.createElement('div');
  acoes.className = 'camp-acoes';

  const entrar = document.createElement('button');
  entrar.className = 'mini';
  entrar.textContent = 'Entrar';
  entrar.onclick = () => abrirCampanha(c.id);

  const sair = document.createElement('button');
  sair.className = 'mini sec';
  sair.textContent = c.souMestre ? 'Apagar' : 'Sair';
  sair.onclick = () => {
    const aviso = c.souMestre
      ? 'Apagar a campanha "' + c.nome + '"? Os tokens e o progresso dela serão perdidos.'
      : 'Sair da campanha "' + c.nome + '"?';
    if (!confirm(aviso)) return;
    socket.emit(c.souMestre ? 'apagar-campanha' : 'sair-campanha', { id: c.id }, (r) => {
      if (r.ok) mostrarCampanhas(r.campanhas);
      else $('erro-lobby').textContent = r.erro || 'Erro';
    });
  };

  acoes.append(entrar, sair);
  corpo.append(titulo, avatares, info, acoes);
  card.append(capa, corpo);
  return card;
}

function abrirCampanha(id) {
  socket.emit('abrir-campanha', { id }, (r) => {
    if (r.ok) abrirSala(r.codigo, r.mestre);
    else $('erro-lobby').textContent = r.erro || 'Erro';
  });
}

function criarCampanha() {
  const campo = $('nome-campanha');
  socket.emit('criar-campanha', { nome: campo.value }, (r) => {
    if (!r.ok) {
      $('erro-lobby').textContent = r.erro || 'Erro';
      return;
    }
    $('erro-lobby').textContent = '';
    campo.value = '';
    $('painel-criar').style.display = 'none';
    mostrarCampanhas(r.campanhas);
  });
}

// abre um dos dois formulários pequenos (e fecha o outro)
function alternar(painel, outro, campo) {
  const p = $(painel);
  $(outro).style.display = 'none';
  const abrir = p.style.display === 'none';
  p.style.display = abrir ? 'block' : 'none';
  if (abrir) $(campo).focus();
}

function abrirCriar() { alternar('painel-criar', 'painel-entrar', 'nome-campanha'); }
function abrirEntrar() { alternar('painel-entrar', 'painel-criar', 'cod'); }

socket.on('campanha-encerrada', () => {
  alert('Esta campanha foi apagada pelo mestre.');
  sairDaSala();
});