// recorta a imagem no centro, em quadrado, e redimensiona
function imagemQuadrada(arquivo, tamanho, mime, callback) {
  const img = new Image();
  img.onload = () => {
    const lado = Math.min(img.width, img.height);
    const sx = (img.width - lado) / 2;
    const sy = (img.height - lado) / 2;
    const c = document.createElement('canvas');
    c.width = tamanho;
    c.height = tamanho;
    const ctx = c.getContext('2d');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tamanho, tamanho);
    }
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
    URL.revokeObjectURL(img.src);
    c.toBlob((blob) => callback(blob), mime, 0.9);
  };
  img.onerror = () => callback(null);
  img.src = URL.createObjectURL(arquivo);
}

// envia a imagem ao servidor; tipo: 'foto' ou 'token'. Devolve o endereço dela (ou null)
function enviarImagem(blob, tipo, callback) {
  fetch('/upload-imagem', {
    method: 'POST',
    headers: { 'Content-Type': blob.type, 'x-token': ler('token') || '', 'x-tipo': tipo },
    body: blob
  })
    .then((resp) => resp.json())
    .then((r) => callback(r.ok ? r.url : null))
    .catch(() => callback(null));
}