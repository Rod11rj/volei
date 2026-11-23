/**
 * Persistência da lista de jogadores.
 *
 * - Convidado: nada é gravado; a lista vive só enquanto a página estiver aberta.
 * - Usuário: a lista é gravada no localStorage do navegador, numa chave própria
 *   de cada usuário.
 *
 * Toda leitura passa por validação: dados corrompidos ou de outra versão
 * nunca quebram a página, apenas são descartados.
 */
import { MODE, formerNamesOf } from './auth.js';
import { SEX } from './balancer.js';
import { cleanName } from './utils.js';

const KEY_PREFIX = 'escalacao-da-selecao';
const LEGACY_KEY = KEY_PREFIX; // versão 1.0.0, antes do login
const SCHEMA_VERSION = 1;
const MAX_NAME_LENGTH = 40;

export const MALE_WEIGHT = Object.freeze({ min: 1, max: 2, step: 0.1, default: 1.4 });

function emptyState() {
  return { players: [], maleWeight: MALE_WEIGHT.default, selected: new Set(), result: null };
}

function clampWeight(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return MALE_WEIGHT.default;
  return Math.min(MALE_WEIGHT.max, Math.max(MALE_WEIGHT.min, Math.round(n * 10) / 10));
}

function normalizePlayer(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
  const name = cleanName(raw.name ?? '').slice(0, MAX_NAME_LENGTH);
  const rating = Math.round(Number(raw.rating));
  if (!name || !Object.values(SEX).includes(raw.sex) || !(rating >= 1 && rating <= 5)) return null;
  return { id: raw.id, name, sex: raw.sex, rating };
}

function normalizeResult(raw, validIds) {
  if (!raw || !Array.isArray(raw.teams)) return null;
  const keep = (ids) => (Array.isArray(ids) ? ids.filter((id) => validIds.has(id)) : []);
  const teams = raw.teams.map(keep).filter((team) => team.length > 0);
  return teams.length ? { teams, bench: keep(raw.bench) } : null;
}

/** Valida dados lidos do navegador. @returns estado ou null */
function parseState(data) {
  if (data?.version !== SCHEMA_VERSION) return null;
  const players = (Array.isArray(data.players) ? data.players : []).map(normalizePlayer).filter(Boolean);
  const ids = new Set(players.map((p) => p.id));
  return {
    players,
    maleWeight: clampWeight(data.maleWeight),
    selected: new Set((Array.isArray(data.selected) ? data.selected : []).filter((id) => ids.has(id))),
    result: normalizeResult(data.result, ids),
  };
}

/** Formato gravado no navegador. */
function toPayload({ players, maleWeight, selected, result }) {
  return { version: SCHEMA_VERSION, players, maleWeight, selected: [...selected], result };
}

const userKey = (username) => `${KEY_PREFIX}:usuario:${username}`;

/**
 * Traz para a chave do usuário uma lista salva em local antigo: com um nome
 * anterior do mesmo usuário ou pela versão sem login (1.0.0).
 */
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

/**
 * @param {{ mode: string, username?: string }} session
 * @param {{ storage?: Storage }} [options]  Permite injetar um armazenamento falso nos testes.
 * @returns {{ load: () => object, save: (state: object) => boolean }}
 */
export function createStore(session, { storage = globalThis.localStorage } = {}) {
  if (session.mode !== MODE.USER) {
    return { load: emptyState, save: () => true };
  }

  const key = userKey(session.username);
  return {
    load() {
      try {
        const raw = storage.getItem(key) ?? migrateOldData(storage, key, session.username);
        return (raw && parseState(JSON.parse(raw))) || emptyState();
      } catch {
        return emptyState();
      }
    },
    save(state) {
      try {
        storage.setItem(key, JSON.stringify(toPayload(state)));
        return true;
      } catch {
        return false;
      }
    },
  };
}
