let jogadoresNaSala = [];

function abrirSala(codigo, mestre) {
  guardarSala(codigo);
  $('codigo').textContent = codigo;
  $('painel').style.display = mestre ? 'block' : 'none';
  mostrar('tela-sala');
  if (mestre) {
    carregarBiblioteca();
    carregarTokensSalvos();
  }
}

function criarSala() {
  socket.emit('criar-sala', {}, (r) => {
    if (r.ok) abrirSala(r.codigo, true);
    else $('erro-lobby').textContent = r.erro || 'Erro';
  });
}

function entrarSala() {
  socket.emit('entrar-sala', { codigo: $('cod').value }, (r) => {
    if (r.ok) abrirSala(r.codigo, r.mestre);
    else $('erro-lobby').textContent = r.erro || 'Erro';
  });
}

function sairDaSala() {
  apagarSala();
  location.reload();
}

socket.on('jogadores', (lista) => {
  jogadoresNaSala = lista;
  const div = $('lista');
  div.textContent = '';
  lista.forEach((j) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    const av = document.createElement('div');
    av.className = 'avatar mini-av';
    preencherAvatar(av, j.nome, j.foto);
    const nome = document.createElement('span');
    nome.textContent = j.nome;
    chip.append(av, nome);
    div.appendChild(chip);
  });
  atualizarPainelToken();
});