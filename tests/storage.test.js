import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE } from '../js/auth.js';
import { SEX } from '../js/balancer.js';
import { createStore } from '../js/storage.js';
import { memoryStorage } from './helpers.js';

const sampleState = () => ({
  players: [{ id: 'p1', name: 'Ana', sex: SEX.FEMALE, rating: 4 }],
  maleWeight: 1.5,
  selected: new Set(['p1']),
  result: null,
});

test('convidado não grava nada', () => {
  const storage = memoryStorage();
  const store = createStore({ mode: MODE.GUEST }, { storage });
  assert.equal(store.persistent, false);
  store.save(sampleState());
  assert.equal(storage.size, 0);
  assert.deepEqual(store.load().players, []);
});

test('usuário grava e recupera a lista', () => {
  const storage = memoryStorage();
  createStore({ mode: MODE.USER, username: 'viciado' }, { storage }).save(sampleState());
  const loaded = createStore({ mode: MODE.USER, username: 'viciado' }, { storage }).load();
  assert.deepEqual(loaded.players, sampleState().players);
  assert.equal(loaded.maleWeight, 1.5);
  assert.deepEqual([...loaded.selected], ['p1']);
});

test('cada usuário tem a própria lista', () => {
  const storage = memoryStorage();
  createStore({ mode: MODE.USER, username: 'viciado' }, { storage }).save(sampleState());
  assert.deepEqual(createStore({ mode: MODE.USER, username: 'outro' }, { storage }).load().players, []);
});

test('lista da versão sem login é migrada para o usuário', () => {
  const storage = memoryStorage();
  storage.setItem('escalacao-da-selecao', JSON.stringify({ version: 1, ...sampleState(), selected: ['p1'] }));
  const loaded = createStore({ mode: MODE.USER, username: 'viciado' }, { storage }).load();
  assert.equal(loaded.players[0].name, 'Ana');
  assert.equal(storage.getItem('escalacao-da-selecao'), null);
});

test('dados corrompidos viram lista vazia', () => {
  const storage = memoryStorage();
  storage.setItem('escalacao-da-selecao:usuario:viciado', '{quebrado');
  assert.deepEqual(createStore({ mode: MODE.USER, username: 'viciado' }, { storage }).load().players, []);
});
