const socket = io();
const $ = (id) => document.getElementById(id);

function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function apagar(k) { try { localStorage.removeItem(k); } catch (e) {} }
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