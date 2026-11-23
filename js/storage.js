/**
 * Persistência local (localStorage) e importação/exportação da lista.
 *
 * Toda leitura passa por validação: dados corrompidos ou de outra versão
 * nunca quebram a página, apenas são descartados.
 */
import { SEX } from './balancer.js';
import { cleanName, createId } from './utils.js';

const STORAGE_KEY = 'escalacao-da-selecao';
const SCHEMA_VERSION = 1;
const MAX_NAME_LENGTH = 40;

export const MALE_WEIGHT = Object.freeze({ min: 1, max: 2, step: 0.1, default: 1.4 });

const LEGACY_SEX = { H: SEX.MALE, M: SEX.FEMALE };

function emptyState() {
  return { players: [], maleWeight: MALE_WEIGHT.default, selected: new Set(), result: null };
}

function clampWeight(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return MALE_WEIGHT.default;
  return Math.min(MALE_WEIGHT.max, Math.max(MALE_WEIGHT.min, Math.round(n * 10) / 10));
}

/**
 * Normaliza um jogador vindo de fonte externa. Aceita o formato atual
 * ({name, sex, rating}) e o da primeira versão ({nome, sexo: 'H'|'M', nota}).
 * Devolve null se o registro for inválido.
 */
function normalizePlayer(raw, { keepId = false } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanName(raw.name ?? raw.nome ?? '').slice(0, MAX_NAME_LENGTH);
  const sex = Object.values(SEX).includes(raw.sex) ? raw.sex : LEGACY_SEX[raw.sexo];
  const rating = Math.round(Number(raw.rating ?? raw.nota));
  if (!name || !sex || !(rating >= 1 && rating <= 5)) return null;
  const id = keepId && typeof raw.id === 'string' ? raw.id : createId();
  return { id, name, sex, rating };
}

function normalizeResult(raw, validIds) {
  if (!raw || !Array.isArray(raw.teams)) return null;
  const keep = (ids) => (Array.isArray(ids) ? ids.filter((id) => validIds.has(id)) : []);
  const teams = raw.teams.map(keep).filter((team) => team.length > 0);
  return teams.length ? { teams, bench: keep(raw.bench) } : null;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const data = JSON.parse(raw);
    if (data?.version !== SCHEMA_VERSION) return emptyState();

    const players = (data.players ?? [])
      .map((p) => normalizePlayer(p, { keepId: true }))
      .filter(Boolean);
    const ids = new Set(players.map((p) => p.id));

    return {
      players,
      maleWeight: clampWeight(data.maleWeight),
      selected: new Set((data.selected ?? []).filter((id) => ids.has(id))),
      result: normalizeResult(data.result, ids),
    };
  } catch {
    return emptyState();
  }
}

/** @returns {boolean} false se o navegador recusou a gravação. */
export function saveState({ players, maleWeight, selected, result }) {
  try {
    const payload = { version: SCHEMA_VERSION, players, maleWeight, selected: [...selected], result };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Texto para backup: só os dados que importam, sem ids internos. */
export function serializePlayers(players) {
  return JSON.stringify(players.map(({ name, sex, rating }) => ({ name, sex, rating })));
}

/**
 * Lê um backup colado pelo usuário.
 * @throws {SyntaxError|TypeError} se o texto não for uma lista JSON.
 */
export function parsePlayers(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new TypeError('O backup deve ser uma lista.');
  return data.map((p) => normalizePlayer(p)).filter(Boolean);
}
