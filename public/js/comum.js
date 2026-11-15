const socket = io();
const $ = (id) => document.getElementById(id);
// o login (token) fica guardado em cada aba: duas contas em abas diferentes não se misturam
function guardar(k, v) {
  try {
    if (k === 'token') sessionStorage.setItem(k, v);
    localStorage.setItem(k, v);
  } catch (e) {}
}
function ler(k) {
  try {
    if (k === 'token') {
      let t = sessionStorage.getItem(k);
      if (!t) {
        t = localStorage.getItem(k);
        if (t) sessionStorage.setItem(k, t);
      }
      return t;
    }
    return localStorage.getItem(k);
  } catch (e) { return null; }
}
function apagar(k) {
  try {
    if (k === 'token') sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  } catch (e) {}
}

function guardarSala(v) { try { sessionStorage.setItem('sala', v); } catch (e) {} }
function lerSala() { try { return sessionStorage.getItem('sala'); } catch (e) { return null; } }
function apagarSala() { try { sessionStorage.removeItem('sala'); } catch (e) {} }

function mostrar(tela) {
  $('carregando').style.display = 'none';
  document.querySelectorAll('.tela').forEach((t) => {
    t.style.display = (t.id === tela) ? 'block' : 'none';
  });
  if (tela === 'tela-lobby') atualizarCabecalho();
}

// mostra a foto da pessoa, ou a inicial do nome se não tiver foto
function preencherAvatar(el, nome, foto) {
  el.textContent = '';
  el.style.backgroundImage = '';
  if (foto) {
    el.style.backgroundImage = 'url("' + foto + '")';
  } else {
    el.textContent = (nome || '?').slice(0, 1).toUpperCase();
  }
}