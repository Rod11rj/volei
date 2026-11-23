/**
 * Controlador da página: guarda o estado, liga eventos e chama a renderização.
 * Regras de negócio ficam em balancer.js; HTML gerado, em templates.js;
 * gravação, em storage.js. Iniciado por main.js com a sessão escolhida.
 */
import { MODE, clearSession } from './auth.js';
import { MIN_TEAMS, TEAM_SIZE, balanceTeams, planGame, swapPlayers } from './balancer.js';
import { MALE_WEIGHT, createStore } from './storage.js';
import * as view from './templates.js';
import { cleanName, createId, formatNumber, normalizeText } from './utils.js';

const $ = (selector) => document.querySelector(selector);

const dom = {
  form: $('#player-form'),
  formTitle: $('#form-title'),
  nameInput: $('#player-name'),
  submit: $('#form-submit'),
  cancel: $('#form-cancel'),
  remove: $('#form-delete'),
  search: $('#search'),
  selectAll: $('#select-all'),
  selectNone: $('#select-none'),
  roster: $('#roster'),
  summary: $('#summary'),
  dockSummary: $('#dock-summary'),
  sessionName: $('#session-name'),
  logout: $('#logout'),
  guestNotice: $('#guest-notice'),
  weight: $('#male-weight'),
  weightValue: $('#male-weight-value'),
  weightHint: $('#male-weight-hint'),
  teamsPanel: $('#teams-panel'),
  result: $('#result'),
  generateButtons: document.querySelectorAll('[data-action="generate"]'),
  toast: $('#toast'),
};

/** Definidos em startApp(), conforme a sessão. */
let store;
let session;
const state = {
  players: [],
  maleWeight: MALE_WEIGHT.default,
  selected: new Set(),
  result: null,
  editingId: null,
  query: '',
  pickedId: null,
};

/* ---------- Consultas ao estado ---------- */

const findPlayer = (id) => state.players.find((p) => p.id === id);
const presentPlayers = () => state.players.filter((p) => state.selected.has(p.id));
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function resolvedResult() {
  if (!state.result) return null;
  const toPlayers = (ids) => ids.map(findPlayer).filter(Boolean);
  const teams = state.result.teams.map(toPlayers).filter((team) => team.length > 0);
  return teams.length ? { teams, bench: toPlayers(state.result.bench) } : null;
}

function persist() {
  if (!store.save(state)) showToast('Não foi possível salvar neste navegador');
}

/* ---------- Renderização ---------- */

function renderSummary() {
  const text = view.summaryText(planGame(presentPlayers()));
  dom.summary.textContent = text;
  dom.dockSummary.textContent = text;
}

function renderRoster() {
  const sorted = [...state.players].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const visible = state.query ? sorted.filter((p) => normalizeText(p.name).includes(state.query)) : sorted;

  if (!state.players.length) {
    dom.roster.innerHTML = view.rosterMessage('Nenhum jogador cadastrado ainda. Use o formulário acima para adicionar o primeiro.');
  } else if (!visible.length) {
    dom.roster.innerHTML = view.rosterMessage('Ninguém com esse nome.');
  } else {
    dom.roster.innerHTML = visible.map((p) => view.playerRow(p, state.selected.has(p.id))).join('');
  }
  renderSummary();
}

function renderWeight() {
  dom.weight.value = String(state.maleWeight);
  dom.weightValue.textContent = `×${formatNumber(state.maleWeight)}`;
  dom.weightHint.textContent = view.weightHint(state.maleWeight);
}

function renderResult() {
  const result = resolvedResult();
  dom.result.innerHTML = result
    ? view.resultView({ ...result, maleWeight: state.maleWeight, pickedId: state.pickedId })
    : view.emptyResult();
}

function renderAll() {
  renderRoster();
  renderWeight();
  renderResult();
}

/* ---------- Avisos e confirmações ---------- */

let toastTimer;
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-visible'), 2400);
}

/** Ação destrutiva em dois cliques: o primeiro arma o botão, o segundo executa. */
function confirmTwice(button, armedLabel, action) {
  if (button.dataset.armed) {
    disarm(button);
    action();
    return;
  }
  button.dataset.label = button.textContent;
  button.dataset.armed = 'true';
  button.textContent = armedLabel;
}

function disarm(button) {
  if (!button.dataset.armed) return;
  button.textContent = button.dataset.label;
  delete button.dataset.armed;
}

/* ---------- Cadastro ---------- */

function readForm() {
  const data = new FormData(dom.form);
  return {
    name: cleanName(data.get('name') ?? ''),
    sex: data.get('sex'),
    rating: Number(data.get('rating')),
  };
}

function setEditing(player) {
  state.editingId = player?.id ?? null;
  const editing = Boolean(player);

  dom.formTitle.textContent = editing ? `Editando ${player.name}` : 'Novo jogador';
  dom.submit.textContent = editing ? 'Salvar alterações' : 'Adicionar';
  dom.cancel.hidden = !editing;
  dom.remove.hidden = !editing;
  disarm(dom.remove);

  if (editing) {
    dom.nameInput.value = player.name;
    dom.form.elements.sex.value = player.sex;
    dom.form.elements.rating.value = String(player.rating);
    dom.form.scrollIntoView({ block: 'nearest' });
    dom.nameInput.focus();
  } else {
    dom.form.reset();
  }
}

function rosterChanged() {
  persist();
  renderRoster();
  renderResult();
}

function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  if (!data.name) return;

  const duplicate = state.players.some(
    (p) => p.id !== state.editingId && normalizeText(p.name) === normalizeText(data.name),
  );
  if (duplicate) {
    showToast('Já existe alguém com esse nome');
    return;
  }

  if (state.editingId) {
    Object.assign(findPlayer(state.editingId), data);
    showToast(`${data.name} atualizado`);
  } else {
    const player = { id: createId(), ...data };
    state.players.push(player);
    state.selected.add(player.id);
    showToast(`${data.name} adicionado e marcado para hoje`);
  }

  setEditing(null);
  rosterChanged();
  dom.nameInput.focus();
}

function handleDelete() {
  confirmTwice(dom.remove, 'Confirmar exclusão', () => {
    const player = findPlayer(state.editingId);
    state.players = state.players.filter((p) => p.id !== state.editingId);
    state.selected.delete(state.editingId);
    setEditing(null);
    rosterChanged();
    showToast(`${player?.name ?? 'Jogador'} excluído`);
  });
}

/* ---------- Lista e presença ---------- */

function handleRosterChange(event) {
  const { id } = event.target.dataset;
  if (!id) return;
  if (event.target.checked) state.selected.add(id);
  else state.selected.delete(id);
  persist();
  renderSummary();
}

function handleRosterClick(event) {
  const button = event.target.closest('[data-edit]');
  if (button) setEditing(findPlayer(button.dataset.edit));
}

function setSelection(selectAll) {
  if (selectAll) {
    state.players
      .filter((p) => !state.query || normalizeText(p.name).includes(state.query))
      .forEach((p) => state.selected.add(p.id));
  } else {
    state.selected.clear();
  }
  persist();
  renderRoster();
}

/* ---------- Área de transferência ---------- */

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ---------- Sessão ---------- */

function renderSession() {
  const guest = session.mode === MODE.GUEST;
  dom.sessionName.textContent = guest ? 'Convidado' : session.username;
  dom.guestNotice.hidden = !guest;
}

function handleLogout() {
  const leave = () => {
    clearSession();
    location.reload();
  };
  if (session.mode === MODE.GUEST && state.players.length) {
    confirmTwice(dom.logout, 'Sair e perder a lista?', leave);
  } else {
    leave();
  }
}

/** Convidado com jogadores cadastrados: o navegador pede confirmação antes de sair. */
function warnBeforeLeaving(event) {
  if (session.mode === MODE.GUEST && state.players.length) event.preventDefault();
}

/* ---------- Times ---------- */

function generateTeams() {
  const result = balanceTeams(presentPlayers(), { maleWeight: state.maleWeight });
  if (!result) {
    showToast(`Marque pelo menos ${MIN_TEAMS * TEAM_SIZE} jogadores`);
    return;
  }
  state.result = {
    teams: result.teams.map((team) => team.map((p) => p.id)),
    bench: result.bench.map((p) => p.id),
  };
  state.pickedId = null;
  persist();
  renderResult();

  if (matchMedia('(max-width: 900px)').matches) {
    dom.teamsPanel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}

function pickForSwap(id) {
  if (state.pickedId === null || state.pickedId === id) {
    state.pickedId = state.pickedId === id ? null : id;
  } else {
    state.result.teams = swapPlayers(state.result.teams, state.pickedId, id);
    state.pickedId = null;
    persist();
  }
  renderResult();
}

async function handleResultClick(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'regenerate') return generateTeams();
  if (action === 'copy') {
    const result = resolvedResult();
    const ok = result && (await copyToClipboard(view.shareText(result.teams, result.bench)));
    showToast(ok ? 'Times copiados — é só colar no grupo' : 'Não foi possível copiar');
    return;
  }
  const player = event.target.closest('[data-player]');
  if (player) pickForSwap(player.dataset.player);
}

/* ---------- Inicialização ---------- */

function bindEvents() {
  dom.form.addEventListener('submit', handleSubmit);
  dom.cancel.addEventListener('click', () => setEditing(null));
  dom.remove.addEventListener('click', handleDelete);

  dom.roster.addEventListener('change', handleRosterChange);
  dom.roster.addEventListener('click', handleRosterClick);
  dom.search.addEventListener('input', (e) => {
    state.query = normalizeText(e.target.value);
    renderRoster();
  });
  dom.selectAll.addEventListener('click', () => setSelection(true));
  dom.selectNone.addEventListener('click', () => setSelection(false));

  dom.logout.addEventListener('click', handleLogout);
  window.addEventListener('beforeunload', warnBeforeLeaving);

  dom.weight.addEventListener('input', (e) => {
    state.maleWeight = Number(e.target.value);
    renderWeight();
    renderResult();
  });
  dom.weight.addEventListener('change', persist);

  dom.generateButtons.forEach((button) => button.addEventListener('click', generateTeams));
  dom.result.addEventListener('click', handleResultClick);
}

/**
 * @param {{ mode: string, username?: string }} activeSession
 */
export function startApp(activeSession) {
  session = activeSession;
  store = createStore(session);
  Object.assign(state, store.load());

  Object.assign(dom.weight, {
    min: MALE_WEIGHT.min,
    max: MALE_WEIGHT.max,
    step: MALE_WEIGHT.step,
  });
  bindEvents();
  renderSession();
  renderAll();
}
