function carregarBiblioteca() {
  socket.emit('listar-mapas', {}, (r) => {
    if (r.ok) mostrarBiblioteca(r.mapas);
  });
}

function mostrarBiblioteca(mapas) {
  const div = $('biblioteca');
  div.textContent = '';
  if (mapas.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Nenhum mapa salvo ainda.';
    div.appendChild(p);
    return;
  }
  mapas.forEach((m) => {
    const linha = document.createElement('div');
    linha.className = 'mapa-item';

    const img = document.createElement('img');
    img.src = m.url;
    img.loading = 'lazy';

    const nome = document.createElement('div');
    nome.className = 'nome';
    nome.textContent = m.nome;

    const usar = document.createElement('button');
    usar.className = 'mini';
    usar.textContent = 'Usar';
    usar.onclick = () => socket.emit('usar-mapa', { id: m.id });

    const apagarBtn = document.createElement('button');
    apagarBtn.className = 'mini sec';
    apagarBtn.textContent = 'Apagar';
    apagarBtn.onclick = () => {
      if (!confirm('Apagar "' + m.nome + '"?')) return;
      socket.emit('apagar-mapa', { id: m.id }, (r) => {
        if (r.ok) mostrarBiblioteca(r.mapas);
      });
    };

    linha.append(img, nome, usar, apagarBtn);
    div.appendChild(linha);
  });
}

function enviarMapa() {
  const input = $('mapa-arquivo');
  const erro = $('erro-mapa');
  const arquivo = input.files[0];
  erro.textContent = '';
  if (!arquivo) {
    erro.textContent = 'Escolha uma imagem primeiro';
    return;
  }
  const nome = $('mapa-nome').value.trim() || arquivo.name.replace(/\.[^.]+$/, '') || 'Mapa';
  const img = new Image();
  img.onload = () => {
    const esc = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * esc);
    c.height = Math.round(img.height * esc);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    c.toBlob((blob) => {
      if (!blob) {
        erro.textContent = 'Não consegui converter a imagem';
        return;
      }
      fetch('/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'x-token': ler('token') || '',
          'x-nome': encodeURIComponent(nome)
        },
        body: blob
      })
        .then((resp) => resp.json())
        .then((r) => {
          if (r.ok) {
            $('mapa-nome').value = '';
            input.value = '';
            carregarBiblioteca();
          } else {
            erro.textContent = r.erro || 'Erro ao enviar';
          }
        })
        .catch(() => { erro.textContent = 'Erro ao enviar a imagem'; });
    }, 'image/jpeg', 0.85);
  };
  img.onerror = () => { erro.textContent = 'Não consegui abrir essa imagem'; };
  img.src = URL.createObjectURL(arquivo);
}