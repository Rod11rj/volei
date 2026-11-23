/**
 * Ponto de entrada: retoma a sessão do usuário, se houver; senão, mostra a
 * tela de entrada e inicia a aplicação depois da escolha.
 */
import { loadSession } from './auth.js';
import { startApp } from './app.js';
import { showEntry } from './entry.js';

const session = loadSession();

if (session) {
  document.getElementById('app').hidden = false;
  startApp(session);
} else {
  showEntry().then(startApp);
}
