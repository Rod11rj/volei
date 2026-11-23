/* Gerado a partir de src/ por: npm run build. Nao edite este arquivo. */
(() => {
  // src/auth.js
  var MODE = Object.freeze({ GUEST: "guest", USER: "user" });
  var USERS = Object.freeze([
    {
      username: "viciados",
      salt: "09977729b2cb5e662871c5e747ee5171",
      hash: "5acbc3794bf8b719d3feec8ab01bfe66d606966240f8844c4c9e97c66166ad43",
      formerNames: ["viciado"]
    }
  ]);
  var SESSION_KEY = "escalacao-da-selecao:sessao";
  var normalizeUsername = (value) => String(value ?? "").trim().toLowerCase();
  var formerNamesOf = (username) => USERS.find((u) => u.username === username)?.formerNames ?? [];
  async function sha256Hex(text) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function verifyCredentials(username, password, users = USERS) {
    const user = users.find((u) => u.username === normalizeUsername(username));
    if (!user) return null;
    const hash = await sha256Hex(`${user.salt}:${password}`);
    return hash === user.hash ? user.username : null;
  }
  function loadSession(storage = globalThis.sessionStorage) {
    try {
      const data = JSON.parse(storage.getItem(SESSION_KEY));
      if (data?.mode === MODE.USER && USERS.some((u) => u.username === data.username)) {
        return { mode: MODE.USER, username: data.username };
      }
    } catch {
    }
    return null;
  }
  function saveSession(session3, storage = globalThis.sessionStorage) {
    if (session3.mode !== MODE.USER) return;
    try {
      storage.setItem(SESSION_KEY, JSON.stringify(session3));
    } catch {
    }
  }
  function clearSession(storage = globalThis.sessionStorage) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
    }
  }

  // src/balancer.js
  var TEAM_SIZE = 4;
  var MIN_TEAMS = 2;
  var SEX = Object.freeze({ MALE: "male", FEMALE: "female" });
  var DEFAULT_OPTIONS = Object.freeze({
    maleWeight: 1.4,
    restarts: 300,
    // quantas montagens aleatórias iniciais são otimizadas
    tolerance: 0.25
    // diferença aceita em relação à melhor solução, para variar os sorteios
  });
  var EPSILON = 1e-9;
  var isMale = (player) => player.sex === SEX.MALE;
  function strength(player, maleWeight) {
    return isMale(player) ? player.rating * maleWeight : player.rating;
  }
  function teamStrength(team, maleWeight) {
    return team.reduce((sum, player) => sum + strength(player, maleWeight), 0);
  }
  function spread(teams, maleWeight) {
    const totals = teams.map((team) => teamStrength(team, maleWeight));
    return Math.max(...totals) - Math.min(...totals);
  }
  function shuffle(items, rng = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function planGame(players) {
    const total = players.length;
    const men = players.filter(isMale).length;
    const teams = Math.floor(total / TEAM_SIZE);
    return {
      total,
      men,
      women: total - men,
      teams,
      bench: total - teams * TEAM_SIZE,
      enough: teams >= MIN_TEAMS
    };
  }
  function pickBench(players, count, rng = Math.random) {
    const active = shuffle(players, rng);
    const bench = [];
    for (let k = 0; k < count; k++) {
      const men = active.filter(isMale).length;
      const sex = men * 2 >= active.length ? SEX.MALE : SEX.FEMALE;
      const index = active.findIndex((player) => player.sex === sex);
      bench.push(...active.splice(index, 1));
    }
    return { active, bench };
  }
  function menQuotas(menCount, teamCount, rng) {
    const base = Math.floor(menCount / teamCount);
    const extra = menCount - base * teamCount;
    return shuffle(
      Array.from({ length: teamCount }, (_, i) => i < extra ? base + 1 : base),
      rng
    );
  }
  function randomAssignment(men, women, quotas, rng) {
    const menPool = shuffle(men, rng);
    const womenPool = shuffle(women, rng);
    return quotas.map((quota) => [
      ...menPool.splice(0, quota),
      ...womenPool.splice(0, TEAM_SIZE - quota)
    ]);
  }
  function improveBySwaps(teams, maleWeight, { minMen, maxMen }) {
    const totals = teams.map((team) => teamStrength(team, maleWeight));
    const menCount = teams.map((team) => team.filter(isMale).length);
    const mean = totals.reduce((a, b) => a + b, 0) / teams.length;
    const deviation = (value) => (value - mean) ** 2;
    const withinBounds = (value) => value >= minMen && value <= maxMen;
    let improved = true;
    while (improved) {
      improved = false;
      for (let a = 0; a < teams.length; a++) {
        for (let b = a + 1; b < teams.length; b++) {
          for (let i = 0; i < teams[a].length; i++) {
            for (let j = 0; j < teams[b].length; j++) {
              const x = teams[a][i];
              const y = teams[b][j];
              const menDelta = x.sex === y.sex ? 0 : isMale(x) ? -1 : 1;
              if (!withinBounds(menCount[a] + menDelta) || !withinBounds(menCount[b] - menDelta)) continue;
              const nextA = totals[a] - strength(x, maleWeight) + strength(y, maleWeight);
              const nextB = totals[b] - strength(y, maleWeight) + strength(x, maleWeight);
              const gain = deviation(totals[a]) + deviation(totals[b]) - deviation(nextA) - deviation(nextB);
              if (gain <= EPSILON) continue;
              teams[a][i] = y;
              teams[b][j] = x;
              totals[a] = nextA;
              totals[b] = nextB;
              menCount[a] += menDelta;
              menCount[b] -= menDelta;
              improved = true;
            }
          }
        }
      }
    }
    return teams;
  }
  var teamsKey = (teams) => teams.map((team) => team.map((p) => p.id).sort().join(",")).sort().join("|");
  function balanceTeams(players, options = {}) {
    const { maleWeight, restarts, tolerance } = { ...DEFAULT_OPTIONS, ...options };
    const rng = options.rng ?? Math.random;
    const plan = planGame(players);
    if (!plan.enough) return null;
    const { active, bench } = pickBench(players, plan.bench, rng);
    const men = active.filter(isMale);
    const women = active.filter((player) => !isMale(player));
    const bounds = {
      minMen: Math.floor(men.length / plan.teams),
      maxMen: Math.ceil(men.length / plan.teams)
    };
    const candidates = [];
    for (let attempt = 0; attempt < restarts; attempt++) {
      const quotas = menQuotas(men.length, plan.teams, rng);
      const teams = improveBySwaps(randomAssignment(men, women, quotas, rng), maleWeight, bounds);
      candidates.push({ teams, spread: spread(teams, maleWeight), key: teamsKey(teams) });
    }
    const best = Math.min(...candidates.map((c) => c.spread));
    const seen = /* @__PURE__ */ new Set();
    const good = candidates.filter((c) => {
      if (c.spread > best + tolerance || seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });
    const chosen = good[Math.floor(rng() * good.length)];
    return { teams: chosen.teams, bench, spread: chosen.spread };
  }
  function swapPlayers(teams, idA, idB) {
    const locate = (id) => {
      for (let t = 0; t < teams.length; t++) {
        const i = teams[t].indexOf(id);
        if (i !== -1) return [t, i];
      }
      return null;
    };
    const a = locate(idA);
    const b = locate(idB);
    if (!a || !b || a[0] === b[0]) return teams;
    const next = teams.map((team) => [...team]);
    next[a[0]][a[1]] = idB;
    next[b[0]][b[1]] = idA;
    return next;
  }

  // src/utils.js
  var HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  function formatNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return rounded.toLocaleString("pt-BR", {
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
      maximumFractionDigits: 1
    });
  }
  var pluralize = (count, singular, plural) => count === 1 ? singular : plural;
  var normalizeText = (value) => String(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  var cleanName = (value) => String(value).trim().replace(/\s+/g, " ");
  var createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);

  // src/storage.js
  var KEY_PREFIX = "escalacao-da-selecao";
  var LEGACY_KEY = KEY_PREFIX;
  var SCHEMA_VERSION = 1;
  var MAX_NAME_LENGTH = 40;
  var MALE_WEIGHT = Object.freeze({ min: 1, max: 2, step: 0.1, default: 1.4 });
  function emptyState() {
    return { players: [], maleWeight: MALE_WEIGHT.default, selected: /* @__PURE__ */ new Set(), result: null };
  }
  function clampWeight(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return MALE_WEIGHT.default;
    return Math.min(MALE_WEIGHT.max, Math.max(MALE_WEIGHT.min, Math.round(n * 10) / 10));
  }
  function normalizePlayer(raw) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;
    const name = cleanName(raw.name ?? "").slice(0, MAX_NAME_LENGTH);
    const rating = Math.round(Number(raw.rating));
    if (!name || !Object.values(SEX).includes(raw.sex) || !(rating >= 1 && rating <= 5)) return null;
    return { id: raw.id, name, sex: raw.sex, rating };
  }
  function normalizeResult(raw, validIds) {
    if (!raw || !Array.isArray(raw.teams)) return null;
    const keep = (ids) => Array.isArray(ids) ? ids.filter((id) => validIds.has(id)) : [];
    const teams = raw.teams.map(keep).filter((team) => team.length > 0);
    return teams.length ? { teams, bench: keep(raw.bench) } : null;
  }
  function parseState(data) {
    if (data?.version !== SCHEMA_VERSION) return null;
    const players = (Array.isArray(data.players) ? data.players : []).map(normalizePlayer).filter(Boolean);
    const ids = new Set(players.map((p) => p.id));
    return {
      players,
      maleWeight: clampWeight(data.maleWeight),
      selected: new Set((Array.isArray(data.selected) ? data.selected : []).filter((id) => ids.has(id))),
      result: normalizeResult(data.result, ids)
    };
  }
  function toPayload({ players, maleWeight, selected, result }) {
    return { version: SCHEMA_VERSION, players, maleWeight, selected: [...selected], result };
  }
  var userKey = (username) => `${KEY_PREFIX}:usuario:${username}`;
  function migrateOldData(storage, key, username) {
    const sources = [...formerNamesOf(username).map(userKey), LEGACY_KEY];
    for (const source of sources) {
      const data = storage.getItem(source);
      if (!data) continue;
      storage.setItem(key, data);
      storage.removeItem(source);
      return data;
    }
    return null;
  }
  function createStore(session3, { storage = globalThis.localStorage } = {}) {
    if (session3.mode !== MODE.USER) {
      return { load: emptyState, save: () => true };
    }
    const key = userKey(session3.username);
    return {
      load() {
        try {
          const raw = storage.getItem(key) ?? migrateOldData(storage, key, session3.username);
          return raw && parseState(JSON.parse(raw)) || emptyState();
        } catch {
          return emptyState();
        }
      },
      save(state2) {
        try {
          storage.setItem(key, JSON.stringify(toPayload(state2)));
          return true;
        } catch {
          return false;
        }
      }
    };
  }

  // src/templates.js
  var TEAM_COLOR_COUNT = 8;
  var SEX_SHORT = { [SEX.MALE]: "H", [SEX.FEMALE]: "M" };
  var SEX_LABEL = { [SEX.MALE]: "Homem", [SEX.FEMALE]: "Mulher" };
  function ratingDots(rating) {
    const dots = Array.from({ length: 5 }, (_, i) => `<i class="rating__dot${i < rating ? " is-on" : ""}"></i>`).join("");
    return `<span class="rating" role="img" aria-label="Nota ${rating} de 5">${dots}</span>`;
  }
  function sexBadge(sex) {
    return `<span class="badge badge--${sex}" title="${SEX_LABEL[sex]}">${SEX_SHORT[sex]}</span>`;
  }
  function playerRow(player, checked) {
    return `<li class="roster__item">
    <label class="roster__label">
      <input type="checkbox" class="roster__check" data-id="${player.id}"${checked ? " checked" : ""}>
      <span class="roster__name">${escapeHtml(player.name)}</span>
      ${sexBadge(player.sex)}${ratingDots(player.rating)}
    </label>
    <button type="button" class="btn btn--ghost btn--small" data-edit="${player.id}">Editar</button>
  </li>`;
  }
  var rosterMessage = (text) => `<li class="roster__empty">${escapeHtml(text)}</li>`;
  function summaryText(plan) {
    let text = `${plan.total} ${pluralize(plan.total, "selecionado", "selecionados")} (${plan.men} H, ${plan.women} M)`;
    if (plan.teams > 0) text += ` \xB7 ${plan.teams} ${pluralize(plan.teams, "time", "times")} de ${TEAM_SIZE}`;
    if (plan.teams > 0 && plan.bench > 0) text += ` \xB7 ${plan.bench} ${pluralize(plan.bench, "fica", "ficam")} de fora`;
    return text;
  }
  var weightHint = (maleWeight) => `Homem nota 3 vale ${formatNumber(3 * maleWeight)} pontos; mulher nota 3 vale 3. Ajuste at\xE9 os times parecerem justos na quadra.`;
  function teamCard(team, index, total, maleWeight, pickedId) {
    const ordered = [...team].sort((a, b) => strength(b, maleWeight) - strength(a, maleWeight));
    const men = team.filter((p) => p.sex === SEX.MALE).length;
    const players = ordered.map((p) => {
      const picked = p.id === pickedId;
      return `<li><button type="button" class="team__player${picked ? " is-picked" : ""}" data-player="${p.id}" aria-pressed="${picked}">
      <span class="team__name">${escapeHtml(p.name)}</span>${sexBadge(p.sex)}${ratingDots(p.rating)}
    </button></li>`;
    }).join("");
    return `<article class="team team--c${index % TEAM_COLOR_COUNT}">
    <header class="team__head">
      <h3 class="team__title">Time ${index + 1}</h3>
      <span class="team__score">${formatNumber(total)} pts</span>
    </header>
    <p class="team__meta">${men} H \xB7 ${team.length - men} M \xB7 m\xE9dia ${formatNumber(total / team.length)}</p>
    <ul class="team__list">${players}</ul>
  </article>`;
  }
  function resultView({ teams, bench, maleWeight, pickedId }) {
    const totals = teams.map((team) => teamStrength(team, maleWeight));
    const diff = Math.round((Math.max(...totals) - Math.min(...totals)) * 10) / 10;
    const benchBlock = bench.length ? `<div class="bench"><strong>Ficam de fora nesta rodada:</strong> ${bench.map((p) => escapeHtml(p.name)).join(", ")}
        <small>Sorteados no grupo (homens ou mulheres) que estiver em maior n\xFAmero, para manter o equil\xEDbrio.</small></div>` : "";
    return `<p class="result__diff"><strong>${formatNumber(diff)}</strong> ${pluralize(diff, "ponto", "pontos")} de diferen\xE7a entre o time mais forte e o mais fraco</p>
    <div class="teams">${teams.map((t, i) => teamCard(t, i, totals[i], maleWeight, pickedId)).join("")}</div>
    ${benchBlock}
    <div class="actions">
      <button type="button" class="btn btn--primary" data-action="copy">Copiar times</button>
      <button type="button" class="btn" data-action="regenerate">Gerar outra combina\xE7\xE3o</button>
    </div>
    <p class="hint">Para trocar dois jogadores de time manualmente, toque em um e depois no outro. Os pontos s\xE3o recalculados na hora.</p>`;
  }
  var emptyResult = () => '<p class="result__empty">Marque quem veio hoje na lista e toque em <strong>Gerar times</strong>.<br>Cada clique gera outra combina\xE7\xE3o igualmente equilibrada.</p>';
  function shareText(teams, bench) {
    const lines = teams.map((team, i) => `Time ${i + 1}: ${team.map((p) => p.name).join(", ")}`);
    const benchLine = bench.length ? `

Fora desta rodada: ${bench.map((p) => p.name).join(", ")}` : "";
    return `Times de hoje

${lines.join("\n")}${benchLine}`;
  }

  // src/app.js
  var $ = (selector) => document.querySelector(selector);
  var dom = {
    form: $("#player-form"),
    formTitle: $("#form-title"),
    nameInput: $("#player-name"),
    submit: $("#form-submit"),
    cancel: $("#form-cancel"),
    remove: $("#form-delete"),
    search: $("#search"),
    selectAll: $("#select-all"),
    selectNone: $("#select-none"),
    roster: $("#roster"),
    summary: $("#summary"),
    dockSummary: $("#dock-summary"),
    sessionName: $("#session-name"),
    logout: $("#logout"),
    weight: $("#male-weight"),
    weightValue: $("#male-weight-value"),
    weightHint: $("#male-weight-hint"),
    teamsPanel: $("#teams-panel"),
    result: $("#result"),
    generateButtons: document.querySelectorAll('[data-action="generate"]'),
    toast: $("#toast")
  };
  var store;
  var session;
  var state = {
    players: [],
    maleWeight: MALE_WEIGHT.default,
    selected: /* @__PURE__ */ new Set(),
    result: null,
    editingId: null,
    query: "",
    pickedId: null
  };
  var findPlayer = (id) => state.players.find((p) => p.id === id);
  var presentPlayers = () => state.players.filter((p) => state.selected.has(p.id));
  var prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resolvedResult() {
    if (!state.result) return null;
    const toPlayers = (ids) => ids.map(findPlayer).filter(Boolean);
    const teams = state.result.teams.map(toPlayers).filter((team) => team.length > 0);
    return teams.length ? { teams, bench: toPlayers(state.result.bench) } : null;
  }
  function persist() {
    if (!store.save(state)) showToast("N\xE3o foi poss\xEDvel salvar neste navegador");
  }
  function renderSummary() {
    const text = summaryText(planGame(presentPlayers()));
    dom.summary.textContent = text;
    dom.dockSummary.textContent = text;
  }
  function renderRoster() {
    const sorted = [...state.players].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const visible = state.query ? sorted.filter((p) => normalizeText(p.name).includes(state.query)) : sorted;
    if (!state.players.length) {
      dom.roster.innerHTML = rosterMessage("Nenhum jogador cadastrado ainda. Use o formul\xE1rio acima para adicionar o primeiro.");
    } else if (!visible.length) {
      dom.roster.innerHTML = rosterMessage("Ningu\xE9m com esse nome.");
    } else {
      dom.roster.innerHTML = visible.map((p) => playerRow(p, state.selected.has(p.id))).join("");
    }
    renderSummary();
  }
  function renderWeight() {
    dom.weight.value = String(state.maleWeight);
    dom.weightValue.textContent = `\xD7${formatNumber(state.maleWeight)}`;
    dom.weightHint.textContent = weightHint(state.maleWeight);
  }
  function renderResult() {
    const result = resolvedResult();
    dom.result.innerHTML = result ? resultView({ ...result, maleWeight: state.maleWeight, pickedId: state.pickedId }) : emptyResult();
  }
  function renderAll() {
    renderRoster();
    renderWeight();
    renderResult();
  }
  var toastTimer;
  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2400);
  }
  function confirmTwice(button, armedLabel, action) {
    if (button.dataset.armed) {
      disarm(button);
      action();
      return;
    }
    button.dataset.label = button.textContent;
    button.dataset.armed = "true";
    button.textContent = armedLabel;
  }
  function disarm(button) {
    if (!button.dataset.armed) return;
    button.textContent = button.dataset.label;
    delete button.dataset.armed;
  }
  function readForm() {
    const data = new FormData(dom.form);
    return {
      name: cleanName(data.get("name") ?? ""),
      sex: data.get("sex"),
      rating: Number(data.get("rating"))
    };
  }
  function setEditing(player) {
    state.editingId = player?.id ?? null;
    const editing = Boolean(player);
    dom.formTitle.textContent = editing ? `Editando ${player.name}` : "Novo jogador";
    dom.submit.textContent = editing ? "Salvar altera\xE7\xF5es" : "Adicionar";
    dom.cancel.hidden = !editing;
    dom.remove.hidden = !editing;
    disarm(dom.remove);
    if (editing) {
      dom.nameInput.value = player.name;
      dom.form.elements.sex.value = player.sex;
      dom.form.elements.rating.value = String(player.rating);
      dom.form.scrollIntoView({ block: "nearest" });
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
      (p) => p.id !== state.editingId && normalizeText(p.name) === normalizeText(data.name)
    );
    if (duplicate) {
      showToast("J\xE1 existe algu\xE9m com esse nome");
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
    confirmTwice(dom.remove, "Confirmar exclus\xE3o", () => {
      const player = findPlayer(state.editingId);
      state.players = state.players.filter((p) => p.id !== state.editingId);
      state.selected.delete(state.editingId);
      setEditing(null);
      rosterChanged();
      showToast(`${player?.name ?? "Jogador"} exclu\xEDdo`);
    });
  }
  function handleRosterChange(event) {
    const { id } = event.target.dataset;
    if (!id) return;
    if (event.target.checked) state.selected.add(id);
    else state.selected.delete(id);
    persist();
    renderSummary();
  }
  function handleRosterClick(event) {
    const button = event.target.closest("[data-edit]");
    if (button) setEditing(findPlayer(button.dataset.edit));
  }
  function setSelection(selectAll) {
    if (selectAll) {
      state.players.filter((p) => !state.query || normalizeText(p.name).includes(state.query)).forEach((p) => state.selected.add(p.id));
    } else {
      state.selected.clear();
    }
    persist();
    renderRoster();
  }
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  function renderSession() {
    dom.sessionName.textContent = session.mode === MODE.GUEST ? "Convidado" : session.username;
  }
  function handleLogout() {
    const leave = () => {
      clearSession();
      location.reload();
    };
    if (session.mode === MODE.GUEST && state.players.length) {
      confirmTwice(dom.logout, "Sair e perder a lista?", leave);
    } else {
      leave();
    }
  }
  function warnBeforeLeaving(event) {
    if (session.mode === MODE.GUEST && state.players.length) event.preventDefault();
  }
  function generateTeams() {
    const result = balanceTeams(presentPlayers(), { maleWeight: state.maleWeight });
    if (!result) {
      showToast(`Marque pelo menos ${MIN_TEAMS * TEAM_SIZE} jogadores`);
      return;
    }
    state.result = {
      teams: result.teams.map((team) => team.map((p) => p.id)),
      bench: result.bench.map((p) => p.id)
    };
    state.pickedId = null;
    persist();
    renderResult();
    if (matchMedia("(max-width: 900px)").matches) {
      dom.teamsPanel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
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
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "regenerate") return generateTeams();
    if (action === "copy") {
      const result = resolvedResult();
      const ok = result && await copyToClipboard(shareText(result.teams, result.bench));
      showToast(ok ? "Times copiados \u2014 \xE9 s\xF3 colar no grupo" : "N\xE3o foi poss\xEDvel copiar");
      return;
    }
    const player = event.target.closest("[data-player]");
    if (player) pickForSwap(player.dataset.player);
  }
  function bindEvents() {
    dom.form.addEventListener("submit", handleSubmit);
    dom.cancel.addEventListener("click", () => setEditing(null));
    dom.remove.addEventListener("click", handleDelete);
    dom.roster.addEventListener("change", handleRosterChange);
    dom.roster.addEventListener("click", handleRosterClick);
    dom.search.addEventListener("input", (e) => {
      state.query = normalizeText(e.target.value);
      renderRoster();
    });
    dom.selectAll.addEventListener("click", () => setSelection(true));
    dom.selectNone.addEventListener("click", () => setSelection(false));
    dom.logout.addEventListener("click", handleLogout);
    window.addEventListener("beforeunload", warnBeforeLeaving);
    dom.weight.addEventListener("input", (e) => {
      state.maleWeight = Number(e.target.value);
      renderWeight();
      renderResult();
    });
    dom.weight.addEventListener("change", persist);
    dom.generateButtons.forEach((button) => button.addEventListener("click", generateTeams));
    dom.result.addEventListener("click", handleResultClick);
  }
  function startApp(activeSession) {
    session = activeSession;
    store = createStore(session);
    Object.assign(state, store.load());
    Object.assign(dom.weight, {
      min: MALE_WEIGHT.min,
      max: MALE_WEIGHT.max,
      step: MALE_WEIGHT.step
    });
    bindEvents();
    renderSession();
    renderAll();
  }

  // src/entry.js
  var SWIPE_THRESHOLD = 40;
  function showEntry() {
    const root = document.getElementById("entry");
    const app = document.getElementById("app");
    const court = root.querySelector(".court");
    const sides = [...root.querySelectorAll(".court__side")];
    const ball = root.querySelector(".court__ball");
    const panels = {
      [MODE.GUEST]: root.querySelector("#entry-guest"),
      [MODE.USER]: root.querySelector("#entry-user")
    };
    const form = root.querySelector("#login-form");
    const userInput = root.querySelector("#login-user");
    const passInput = root.querySelector("#login-pass");
    const error = root.querySelector("#login-error");
    root.hidden = false;
    app.hidden = true;
    let current = null;
    function choose(mode, { focusSide = false } = {}) {
      if (mode === current) return;
      current = mode;
      court.dataset.side = mode;
      sides.forEach((side) => {
        const on = side.dataset.mode === mode;
        side.setAttribute("aria-checked", String(on));
        side.tabIndex = on ? 0 : -1;
        if (on && focusSide) side.focus();
      });
      ball.classList.remove("is-flying");
      void ball.offsetWidth;
      ball.classList.add("is-flying");
      Object.entries(panels).forEach(([key, panel]) => {
        panel.hidden = key !== mode;
      });
      error.textContent = "";
    }
    const step = (direction) => {
      const index = sides.findIndex((s) => s.dataset.mode === current);
      const next = index === -1 ? direction > 0 ? sides.length - 1 : 0 : Math.min(sides.length - 1, Math.max(0, index + direction));
      choose(sides[next].dataset.mode, { focusSide: true });
    };
    court.addEventListener("keydown", (event) => {
      const keys = {
        ArrowLeft: () => step(-1),
        ArrowUp: () => step(-1),
        ArrowRight: () => step(1),
        ArrowDown: () => step(1),
        Home: () => choose(sides[0].dataset.mode, { focusSide: true }),
        End: () => choose(sides.at(-1).dataset.mode, { focusSide: true })
      };
      if (!keys[event.key]) return;
      event.preventDefault();
      keys[event.key]();
    });
    sides.forEach((side) => side.addEventListener("click", () => {
      choose(side.dataset.mode);
      if (side.dataset.mode === MODE.USER) userInput.focus({ preventScroll: true });
    }));
    let startX = null;
    court.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
    });
    court.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) choose(dx < 0 ? MODE.GUEST : MODE.USER);
    });
    return new Promise((resolve) => {
      const finish = (session3) => {
        root.hidden = true;
        app.hidden = false;
        resolve(session3);
      };
      root.querySelector("#guest-enter").addEventListener("click", () => finish({ mode: MODE.GUEST }));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = await verifyCredentials(userInput.value, passInput.value);
        if (!username) {
          error.textContent = "Usu\xE1rio ou senha incorretos.";
          passInput.value = "";
          passInput.focus();
          return;
        }
        const session3 = { mode: MODE.USER, username };
        saveSession(session3);
        form.reset();
        finish(session3);
      });
    });
  }

  // src/main.js
  var session2 = loadSession();
  if (session2) {
    document.getElementById("app").hidden = false;
    startApp(session2);
  } else {
    showEntry().then(startApp);
  }
})();
