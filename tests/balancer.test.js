import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEX, TEAM_SIZE, balanceTeams, pickBench, planGame, spread, strength, swapPlayers,
} from '../js/balancer.js';

/** Gerador pseudoaleatório com semente, para testes reproduzíveis. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const player = (id, sex, rating) => ({ id, name: id, sex, rating });
const men = (n, rating = 3) => Array.from({ length: n }, (_, i) => player(`h${i}`, SEX.MALE, rating));
const women = (n, rating = 3) => Array.from({ length: n }, (_, i) => player(`m${i}`, SEX.FEMALE, rating));
const countMen = (team) => team.filter((p) => p.sex === SEX.MALE).length;

test('nota masculina é multiplicada pelo peso', () => {
  assert.equal(strength(player('a', SEX.MALE, 3), 1.5), 4.5);
  assert.equal(strength(player('b', SEX.FEMALE, 3), 1.5), 3);
});

test('planGame calcula times e reservas', () => {
  const plan = planGame([...men(5), ...women(5)]);
  assert.deepEqual(plan, { total: 10, men: 5, women: 5, teams: 2, bench: 2, enough: true });
  assert.equal(planGame(men(7)).enough, false);
});

test('retorna null com menos de 8 jogadores', () => {
  assert.equal(balanceTeams([...men(4), ...women(3)]), null);
});

test('todo time tem exatamente 4 jogadores e ninguém se repete', () => {
  const players = [...men(7), ...women(6)];
  const { teams, bench } = balanceTeams(players, { rng: seededRng(1) });
  assert.equal(teams.length, 3);
  teams.forEach((team) => assert.equal(team.length, TEAM_SIZE));
  const ids = [...teams.flat(), ...bench].map((p) => p.id);
  assert.equal(new Set(ids).size, players.length);
});

test('homens são distribuídos de forma uniforme entre os times', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const players = [
      ...men(7).map((p, i) => ({ ...p, rating: (i % 5) + 1 })),
      ...women(9).map((p, i) => ({ ...p, rating: ((i + 2) % 5) + 1 })),
    ];
    const { teams } = balanceTeams(players, { rng: seededRng(seed) });
    const counts = teams.map(countMen);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `semente ${seed}: ${counts}`);
  }
});

test('reservas saem do grupo em maior número', () => {
  const { active, bench } = pickBench([...men(7), ...women(5)], 2, seededRng(3));
  assert.equal(bench.length, 2);
  assert.ok(bench.every((p) => p.sex === SEX.MALE));
  assert.equal(countMen(active), 5);
});

test('equilibra habilidade quando há solução perfeita', () => {
  const players = [
    player('a', SEX.MALE, 5), player('b', SEX.MALE, 1),
    player('c', SEX.MALE, 4), player('d', SEX.MALE, 2),
    player('e', SEX.FEMALE, 5), player('f', SEX.FEMALE, 1),
    player('g', SEX.FEMALE, 4), player('h', SEX.FEMALE, 2),
  ];
  const { teams } = balanceTeams(players, { maleWeight: 1, rng: seededRng(7) });
  assert.equal(spread(teams, 1), 0);
});

test('mesma semente gera o mesmo resultado', () => {
  const players = [...men(6), ...women(6)].map((p, i) => ({ ...p, rating: (i % 5) + 1 }));
  const ids = (r) => r.teams.map((t) => t.map((p) => p.id));
  assert.deepEqual(
    ids(balanceTeams(players, { rng: seededRng(42) })),
    ids(balanceTeams(players, { rng: seededRng(42) })),
  );
});

test('swapPlayers troca entre times e ignora o mesmo time', () => {
  const teams = [['a', 'b'], ['c', 'd']];
  assert.deepEqual(swapPlayers(teams, 'a', 'd'), [['d', 'b'], ['c', 'a']]);
  assert.equal(swapPlayers(teams, 'a', 'b'), teams);
  assert.deepEqual(teams, [['a', 'b'], ['c', 'd']], 'não altera a entrada');
});
