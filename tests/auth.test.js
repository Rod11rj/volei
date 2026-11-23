import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE, clearSession, loadSession, saveSession, verifyCredentials } from '../src/auth.js';
import { memoryStorage } from './helpers.js';

test('aceita o usuário cadastrado com a senha certa', async () => {
  assert.equal(await verifyCredentials('viciado', 'viciado'), 'viciado');
});

test('nome de usuário ignora maiúsculas e espaços', async () => {
  assert.equal(await verifyCredentials('  Viciado ', 'viciado'), 'viciado');
});

test('recusa senha errada e usuário inexistente', async () => {
  assert.equal(await verifyCredentials('viciado', 'Viciado'), null);
  assert.equal(await verifyCredentials('viciado', ''), null);
  assert.equal(await verifyCredentials('outro', 'viciado'), null);
});

test('sessão de usuário é guardada e removida', () => {
  const storage = memoryStorage();
  saveSession({ mode: MODE.USER, username: 'viciado' }, storage);
  assert.deepEqual(loadSession(storage), { mode: MODE.USER, username: 'viciado' });
  clearSession(storage);
  assert.equal(loadSession(storage), null);
});

test('convidado não tem sessão guardada', () => {
  const storage = memoryStorage();
  saveSession({ mode: MODE.GUEST }, storage);
  assert.equal(loadSession(storage), null);
});

test('sessão adulterada ou de usuário desconhecido é ignorada', () => {
  const storage = memoryStorage();
  storage.setItem('escalacao-da-selecao:sessao', '{"mode":"user","username":"intruso"}');
  assert.equal(loadSession(storage), null);
  storage.setItem('escalacao-da-selecao:sessao', 'não é json');
  assert.equal(loadSession(storage), null);
});
