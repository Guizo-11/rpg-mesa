function criarOuvinte(socket) {
  return function ouvir(evento, fn) {
    socket.on(evento, (dados, resposta) => {
      const responder = typeof resposta === 'function' ? resposta : () => {};
      try {
        fn(dados || {}, responder);
      } catch (e) {
        console.log('Erro em', evento, e.message);
      }
    });
  };
}

function exigirLogin(socket, responder) {
  if (!socket.data.usuario) {
    responder({ ok: false, erro: 'Faça login primeiro' });
    return false;
  }
  return true;
}

function tem(obj, chave) {
  return Object.prototype.hasOwnProperty.call(obj, chave);
}

module.exports = { criarOuvinte, exigirLogin, tem };