// campanhas: lista salva, criar, abrir, apagar e sair

function carregarCampanhas() {
  socket.emit('minhas-campanhas', {}, (r) => {
    if (r.ok) mostrarCampanhas(r.campanhas);
  });
}

function mostrarCampanhas(lista) {
  const div = $('campanhas');
  div.textContent = '';
  if (lista.length === 0) {
    const p = document.createElement('p');
    p.className = 'mudo';
    p.textContent = 'Você ainda não tem campanhas. Crie uma abaixo ou entre com um código.';
    div.appendChild(p);
    return;
  }
  lista.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'campanha';

    const info = document.createElement('div');
    info.className = 'campanha-info';
    const nome = document.createElement('div');
    nome.className = 'campanha-nome';
    nome.textContent = c.nome;
    const sub = document.createElement('div');
    sub.className = 'mudo';
    sub.textContent = c.souMestre
      ? 'Mestre · código ' + c.codigo + ' · ' + c.jogadores + ' jogador(es)'
      : 'Jogador · mestre ' + c.mestreNome;
    if (c.aoVivo) sub.textContent += ' · 🟢 ao vivo';
    info.append(nome, sub);

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

    card.append(info, entrar, sair);
    div.appendChild(card);
  });
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
    mostrarCampanhas(r.campanhas);
  });
}

socket.on('campanha-encerrada', () => {
  alert('Esta campanha foi apagada pelo mestre.');
  sairDaSala();
});