/**
 * Algoritmo de equilíbrio de times.
 *
 * Módulo puro: não acessa DOM nem armazenamento, o que permite testá-lo
 * isoladamente (ver tests/balancer.test.js).
 *
 * @typedef {'male'|'female'} Sex
 * @typedef {{ id: string, name: string, sex: Sex, rating: number }} Player
 * @typedef {() => number} Rng  Função que devolve um número em [0, 1).
 */

export const TEAM_SIZE = 4;
export const MIN_TEAMS = 2;
export const SEX = Object.freeze({ MALE: 'male', FEMALE: 'female' });

const DEFAULT_OPTIONS = Object.freeze({
  maleWeight: 1.4,
  restarts: 300,   // quantas montagens aleatórias iniciais são otimizadas
  tolerance: 0.25, // diferença aceita em relação à melhor solução, para variar os sorteios
});

const EPSILON = 1e-9;

const isMale = (player) => player.sex === SEX.MALE;

/** Força efetiva de um jogador: a nota masculina é multiplicada pelo peso. */
export function strength(player, maleWeight) {
  return isMale(player) ? player.rating * maleWeight : player.rating;
}

/** Soma da força efetiva dos jogadores de um time. */
export function teamStrength(team, maleWeight) {
  return team.reduce((sum, player) => sum + strength(player, maleWeight), 0);
}

/** Diferença entre o time mais forte e o mais fraco. */
export function spread(teams, maleWeight) {
  const totals = teams.map((team) => teamStrength(team, maleWeight));
  return Math.max(...totals) - Math.min(...totals);
}

/** Devolve uma cópia embaralhada (Fisher–Yates). */
export function shuffle(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Resumo do que é possível montar com os jogadores presentes. */
export function planGame(players) {
  const total = players.length;
  const men = players.filter(isMale).length;
  const teams = Math.floor(total / TEAM_SIZE);
  return {
    total,
    men,
    women: total - men,
    teams,
    bench: total - teams * TEAM_SIZE,
    enough: teams >= MIN_TEAMS,
  };
}

/**
 * Escolhe quem fica de fora quando o total não é múltiplo de TEAM_SIZE.
 * Cada vaga de reserva é sorteada no grupo (homens ou mulheres) que estiver
 * em maior número, o que aproxima a proporção dos times de 50/50.
 */
export function pickBench(players, count, rng = Math.random) {
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

/** Quantos homens cada time recebe: todos com ⌊H/T⌋ ou ⌈H/T⌉. */
function menQuotas(menCount, teamCount, rng) {
  const base = Math.floor(menCount / teamCount);
  const extra = menCount - base * teamCount;
  return shuffle(
    Array.from({ length: teamCount }, (_, i) => (i < extra ? base + 1 : base)),
    rng,
  );
}

function randomAssignment(men, women, quotas, rng) {
  const menPool = shuffle(men, rng);
  const womenPool = shuffle(women, rng);
  return quotas.map((quota) => [
    ...menPool.splice(0, quota),
    ...womenPool.splice(0, TEAM_SIZE - quota),
  ]);
}

/**
 * Busca local: troca pares de jogadores entre times sempre que isso reduz a
 * soma dos desvios quadráticos em relação à média, sem violar os limites de
 * homens por time. Para quando nenhuma troca melhora.
 */
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

const teamsKey = (teams) =>
  teams.map((team) => team.map((p) => p.id).sort().join(',')).sort().join('|');

/**
 * Monta times de TEAM_SIZE equilibrados em sexo e habilidade.
 *
 * @param {Player[]} players  Jogadores presentes.
 * @param {{ maleWeight?: number, rng?: Rng, restarts?: number, tolerance?: number }} [options]
 * @returns {{ teams: Player[][], bench: Player[], spread: number } | null}
 *          null quando não há jogadores para MIN_TEAMS times.
 */
export function balanceTeams(players, options = {}) {
  const { maleWeight, restarts, tolerance } = { ...DEFAULT_OPTIONS, ...options };
  const rng = options.rng ?? Math.random;

  const plan = planGame(players);
  if (!plan.enough) return null;

  const { active, bench } = pickBench(players, plan.bench, rng);
  const men = active.filter(isMale);
  const women = active.filter((player) => !isMale(player));
  const bounds = {
    minMen: Math.floor(men.length / plan.teams),
    maxMen: Math.ceil(men.length / plan.teams),
  };

  const candidates = [];
  for (let attempt = 0; attempt < restarts; attempt++) {
    const quotas = menQuotas(men.length, plan.teams, rng);
    const teams = improveBySwaps(randomAssignment(men, women, quotas, rng), maleWeight, bounds);
    candidates.push({ teams, spread: spread(teams, maleWeight), key: teamsKey(teams) });
  }

  const best = Math.min(...candidates.map((c) => c.spread));
  const seen = new Set();
  const good = candidates.filter((c) => {
    if (c.spread > best + tolerance || seen.has(c.key)) return false;
    seen.add(c.key);
    return true;
  });
  const chosen = good[Math.floor(rng() * good.length)];

  return { teams: chosen.teams, bench, spread: chosen.spread };
}

/**
 * Troca dois jogadores de time (ajuste manual). Trabalha com listas de ids e
 * devolve uma nova estrutura; se ambos estiverem no mesmo time, nada muda.
 *
 * @param {string[][]} teams
 * @returns {string[][]}
 */
export function swapPlayers(teams, idA, idB) {
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
