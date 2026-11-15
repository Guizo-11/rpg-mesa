let grade = { mostrar: false, colunas: 12, valor: 1, unidade: 'm' };

function formatarNumero(n) {
  return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

// aplica a grade recebida do servidor
function usarGrade(g) {
  grade = g;
  const mesa = $('mesa');
  mesa.style.setProperty('--cols', g.colunas);
  mesa.classList.toggle('com-grade', g.mostrar);
  $('legenda-grade').textContent = g.mostrar
    ? 'Cada quadrado = ' + formatarNumero(g.valor) + ' ' + g.unidade
    : '';
  $('grade-mostrar').checked = g.mostrar;
  $('grade-colunas').value = g.colunas;
  $('grade-valor').value = g.valor;
  $('grade-unidade').value = g.unidade;
}

// botão "Aplicar" do mestre
function enviarGrade() {
  socket.emit('definir-grade', {
    mostrar: $('grade-mostrar').checked,
    colunas: $('grade-colunas').value,
    valor: $('grade-valor').value,
    unidade: $('grade-unidade').value
  });
}

socket.on('grade', (g) => {
  usarGrade(g);
  desenhar();
});