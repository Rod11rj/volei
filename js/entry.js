/**
 * Tela de entrada: o visitante escolhe um lado da quadra e a bola voa até lá.
 * Esquerda = convidado; direita = usuário cadastrado.
 *
 * Navegação: clique/toque em um lado, setas ← → (ou Home/End) no teclado,
 * ou arraste o dedo para o lado desejado.
 */
import { MODE, saveSession, verifyCredentials } from './auth.js';

const SWIPE_THRESHOLD = 40;

/** @returns {Promise<{ mode: string, username?: string }>} */
export function showEntry() {
  const root = document.getElementById('entry');
  const app = document.getElementById('app');
  const court = root.querySelector('.court');
  const sides = [...root.querySelectorAll('.court__side')];
  const ball = root.querySelector('.court__ball');
  const panels = {
    [MODE.GUEST]: root.querySelector('#entry-guest'),
    [MODE.USER]: root.querySelector('#entry-user'),
  };
  const form = root.querySelector('#login-form');
  const userInput = root.querySelector('#login-user');
  const passInput = root.querySelector('#login-pass');
  const error = root.querySelector('#login-error');

  root.hidden = false;
  app.hidden = true;

  let current = null;

  function choose(mode, { focusSide = false } = {}) {
    if (mode === current) return;
    current = mode;
    court.dataset.side = mode;

    sides.forEach((side) => {
      const on = side.dataset.mode === mode;
      side.setAttribute('aria-checked', String(on));
      side.tabIndex = on ? 0 : -1;
      if (on && focusSide) side.focus();
    });

    // reinicia a animação do voo da bola
    ball.classList.remove('is-flying');
    void ball.offsetWidth;
    ball.classList.add('is-flying');

    Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== mode; });
    error.textContent = '';
  }

  /** Seta para a esquerda leva ao lado esquerdo; para a direita, ao direito (a bola começa sobre a rede). */
  const step = (direction) => {
    const index = sides.findIndex((s) => s.dataset.mode === current);
    const next = index === -1
      ? (direction > 0 ? sides.length - 1 : 0)
      : Math.min(sides.length - 1, Math.max(0, index + direction));
    choose(sides[next].dataset.mode, { focusSide: true });
  };

  court.addEventListener('keydown', (event) => {
    const keys = {
      ArrowLeft: () => step(-1),
      ArrowUp: () => step(-1),
      ArrowRight: () => step(1),
      ArrowDown: () => step(1),
      Home: () => choose(sides[0].dataset.mode, { focusSide: true }),
      End: () => choose(sides.at(-1).dataset.mode, { focusSide: true }),
    };
    if (!keys[event.key]) return;
    event.preventDefault();
    keys[event.key]();
  });

  sides.forEach((side) => side.addEventListener('click', () => {
    choose(side.dataset.mode);
    if (side.dataset.mode === MODE.USER) userInput.focus({ preventScroll: true });
  }));

  let startX = null;
  court.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  court.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) choose(dx < 0 ? MODE.GUEST : MODE.USER);
  });

  return new Promise((resolve) => {
    const finish = (session) => {
      root.hidden = true;
      app.hidden = false;
      resolve(session);
    };

    root.querySelector('#guest-enter').addEventListener('click', () => finish({ mode: MODE.GUEST }));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = await verifyCredentials(userInput.value, passInput.value);
      if (!username) {
        error.textContent = 'Usuário ou senha incorretos.';
        passInput.value = '';
        passInput.focus();
        return;
      }
      const session = { mode: MODE.USER, username };
      saveSession(session);
      form.reset();
      finish(session);
    });
  });
}
