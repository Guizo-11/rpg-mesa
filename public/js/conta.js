function aoLogar(r) {
  if (!r.ok) {
    $('erro-login').textContent = r.erro || 'Erro';
    return;
  }
  $('erro-login').textContent = '';
  $('login-senha').value = '';
  guardar('token', r.token);
  $('meu-nome').textContent = r.nome;
  mostrar('tela-lobby');
}

function fazerLogin() {
  socket.emit('login', { nome: $('login-nome').value, senha: $('login-senha').value }, aoLogar);
}

function criarConta() {
  socket.emit('registrar', { nome: $('login-nome').value, senha: $('login-senha').value }, aoLogar);
}

function sair() {
  apagar('token');
  apagarSala();
  location.reload();
}

// ---------- perfil ----------
function atualizarCabecalho() {
  socket.emit('perfil', {}, (r) => {
    if (!r.ok) return;
    $('meu-nome').textContent = r.nome;
    preencherAvatar($('meu-avatar'), r.nome, r.foto);
  });
}

function mostrarPerfil(r) {
  $('perfil-login').textContent = r.login;
  $('perfil-nome').value = r.nome;
  preencherAvatar($('perfil-foto'), r.nome, r.foto);
}

function abrirPerfil() {
  $('erro-perfil').textContent = '';
  $('ok-perfil').textContent = '';
  socket.emit('perfil', {}, (r) => {
    if (!r.ok) return;
    mostrarPerfil(r);
    mostrar('tela-perfil');
  });
}

function respostaPerfil(r, mensagem) {
  if (!r.ok) {
    $('ok-perfil').textContent = '';
    $('erro-perfil').textContent = r.erro || 'Erro';
    return;
  }
  $('erro-perfil').textContent = '';
  $('ok-perfil').textContent = mensagem;
  mostrarPerfil(r);
}

function salvarNome() {
  socket.emit('salvar-perfil', { nome: $('perfil-nome').value }, (r) => respostaPerfil(r, 'Nome salvo!'));
}

function removerFoto() {
  socket.emit('salvar-perfil', { foto: null }, (r) => respostaPerfil(r, 'Foto removida.'));
}

function enviarFoto() {
  const input = $('perfil-arquivo');
  const arquivo = input.files[0];
  if (!arquivo) return;
  imagemQuadrada(arquivo, 256, 'image/jpeg', (blob) => {
    if (!blob) {
      $('erro-perfil').textContent = 'Não consegui abrir essa imagem';
      return;
    }
    enviarImagem(blob, 'foto', (url) => {
      input.value = '';
      if (!url) {
        $('erro-perfil').textContent = 'Erro ao enviar a foto';
        return;
      }
      socket.emit('salvar-perfil', { foto: url }, (r) => respostaPerfil(r, 'Foto atualizada!'));
    });
  });
}

function trocarSenha() {
  socket.emit('trocar-senha', { atual: $('senha-atual').value, nova: $('senha-nova').value }, (r) => {
    if (!r.ok) {
      $('ok-perfil').textContent = '';
      $('erro-perfil').textContent = r.erro || 'Erro';
      return;
    }
    $('senha-atual').value = '';
    $('senha-nova').value = '';
    $('erro-perfil').textContent = '';
    $('ok-perfil').textContent = 'Senha trocada!';
  });
}