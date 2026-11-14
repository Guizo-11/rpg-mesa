function carregarTokensSalvos() {
  socket.emit('listar-tokens', {}, (r) => {
    if (r.ok) mostrarTokensSalvos(r.tokens);
  });
}

function mostrarTokensSalvos(lista) {
  const div = $('tokens-salvos');
  div.textContent = '';
  if (lista.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Nenhum token salvo ainda.';
    div.appendChild(p);
    return;
  }
  lista.forEach((t) => {
    const linha = document.createElement('div');
    linha.className = 'mapa-item';

    const bolinha = document.createElement('div');
    bolinha.className = 'bolinha';
    bolinha.style.background = t.cor;
    if (t.imagem) {
      bolinha.style.backgroundImage = 'url("' + t.imagem + '")';
      bolinha.style.backgroundSize = 'cover';
      bolinha.style.backgroundPosition = 'center';
    } else {
      bolinha.textContent = t.nome.slice(0, 2).toUpperCase();
    }

    const nome = document.createElement('div');
    nome.className = 'nome';
    nome.textContent = t.nome;

    const colocar = document.createElement('button');
    colocar.className = 'mini';
    colocar.textContent = 'Colocar';
    colocar.onclick = () => socket.emit('colocar-token', { id: t.id });

    const apagarBtn = document.createElement('button');
    apagarBtn.className = 'mini sec';
    apagarBtn.textContent = 'Apagar';
    apagarBtn.onclick = () => {
      if (!confirm('Apagar "' + t.nome + '" da biblioteca?')) return;
      socket.emit('apagar-token-salvo', { id: t.id }, (r) => {
        if (r.ok) mostrarTokensSalvos(r.tokens);
      });
    };

    linha.append(bolinha, nome, colocar, apagarBtn);
    div.appendChild(linha);
  });
}

function criarToken() {
  const campo = $('nomeToken');
  const arquivo = $('imagem-token').files[0];
  const erro = $('erro-token');
  erro.textContent = '';

  const criar = (url) => {
    socket.emit('criar-token', {
      nome: campo.value.trim() || 'Token',
      cor: $('cor-token').value,
      imagem: url
    }, (r) => {
      if (r.ok) mostrarTokensSalvos(r.tokens);
    });
    campo.value = '';
    $('imagem-token').value = '';
  };

  if (!arquivo) return criar(null);

  imagemQuadrada(arquivo, 256, 'image/png', (blob) => {
    if (!blob) {
      erro.textContent = 'Não consegui abrir essa imagem';
      return;
    }
    enviarImagem(blob, 'token', (url) => {
      if (!url) {
        erro.textContent = 'Erro ao enviar a imagem';
        return;
      }
      criar(url);
    });
  });
}