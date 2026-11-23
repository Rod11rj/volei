import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE, clearSession, loadSession, saveSession, verifyCredentials } from '../src/auth.js';
import { memoryStorage } from './helpers.js';

// Usuário fictício, só para os testes: a senha real de nenhum usuário aparece aqui.
const SALT = 'sal-de-teste';
const TEST_USERS = [{
  username: 'teste',
  salt: SALT,
  hash: createHash('sha256').update(`${SALT}:senha-de-teste`).digest('hex'),
}];

test('aceita usuário com a senha certa', async () => {
  assert.equal(await verifyCredentials('teste', 'senha-de-teste', TEST_USERS), 'teste');
});

test('nome de usuário ignora maiúsculas e espaços', async () => {
  assert.equal(await verifyCredentials('  Teste ', 'senha-de-teste', TEST_USERS), 'teste');
});

test('recusa senha errada e usuário inexistente', async () => {
  assert.equal(await verifyCredentials('teste', 'senha-errada', TEST_USERS), null);
  assert.equal(await verifyCredentials('teste', '', TEST_USERS), null);
  assert.equal(await verifyCredentials('outro', 'senha-de-teste', TEST_USERS), null);
});

test('usuário real existe e recusa senha errada', async () => {
  assert.equal(await verifyCredentials('viciados', 'senha-errada'), null);
  assert.equal(await verifyCredentials('viciados', ''), null);
});

test('nome antigo (viciado) não entra mais', async () => {
  assert.equal(await verifyCredentials('viciado', 'qualquer'), null);
});

test('sessão de usuário é guardada e removida', () => {
  const storage = memoryStorage();
  saveSession({ mode: MODE.USER, username: 'viciados' }, storage);
  assert.deepEqual(loadSession(storage), { mode: MODE.USER, username: 'viciados' });
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
