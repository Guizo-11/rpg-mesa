function iniciar() {
  const token = ler('token');
  if (!token) return mostrar('tela-login');
  socket.emit('retomar', { token }, (r) => {
    if (!r.ok) {
      apagar('token');
      apagarSala();
      return mostrar('tela-login');
    }
    $('meu-nome').textContent = r.nome;
    const sala = lerSala();
    if (!sala) return mostrar('tela-lobby');
    socket.emit('entrar-sala', { codigo: sala }, (r2) => {
      if (r2.ok) {
        abrirSala(r2.codigo, r2.mestre);
      } else {
        apagarSala();
        mostrar('tela-lobby');
      }
    });
  });
}

socket.on('connect', iniciar);
if (socket.connected) iniciar();