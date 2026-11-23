/**
 * Acesso à página: convidado ou usuário cadastrado.
 *
 * ATENÇÃO: o site é estático (GitHub Pages) e não tem servidor. A verificação
 * acontece no navegador, então este login NÃO protege dados — serve apenas para
 * separar o modo convidado (nada é salvo) do modo usuário (lista salva no
 * navegador, separada por usuário). Para contas de verdade, sincronizadas entre
 * aparelhos, é preciso um serviço de autenticação externo.
 *
 * As senhas não ficam em texto puro: guarda-se o SHA-256 de `${salt}:${senha}`.
 * Para cadastrar outro usuário, gere sal e hash com:
 *   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s,c.createHash('sha256').update(s+':SENHA').digest('hex'))"
 */

export const MODE = Object.freeze({ GUEST: 'guest', USER: 'user' });

/** @type {ReadonlyArray<{ username: string, salt: string, hash: string }>} */
export const USERS = Object.freeze([
  {
    username: 'viciado',
    salt: 'cbebad3520a37d606b4d2bbbf99a720b',
    hash: '57e7f033d4120f13c189bfef4f0588c488892201e83137da8abcb39e822ae64b',
  },
]);

const SESSION_KEY = 'escalacao-da-selecao:sessao';

export const normalizeUsername = (value) => String(value ?? '').trim().toLowerCase();

export async function sha256Hex(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @returns {Promise<string|null>} o nome do usuário se as credenciais conferem, senão null.
 */
export async function verifyCredentials(username, password, users = USERS) {
  const user = users.find((u) => u.username === normalizeUsername(username));
  if (!user) return null;
  const hash = await sha256Hex(`${user.salt}:${password}`);
  return hash === user.hash ? user.username : null;
}

/**
 * Sessão do usuário cadastrado, guardada até o navegador ser fechado.
 * O convidado não tem sessão: ao recarregar a página, volta à tela de entrada.
 */
export function loadSession(storage = globalThis.sessionStorage) {
  try {
    const data = JSON.parse(storage.getItem(SESSION_KEY));
    if (data?.mode === MODE.USER && USERS.some((u) => u.username === data.username)) {
      return { mode: MODE.USER, username: data.username };
    }
  } catch {
    /* sessão ausente ou inválida */
  }
  return null;
}

export function saveSession(session, storage = globalThis.sessionStorage) {
  if (session.mode !== MODE.USER) return;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* navegador recusou; o usuário precisará entrar de novo ao recarregar */
  }
}

export function clearSession(storage = globalThis.sessionStorage) {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    /* nada a limpar */
  }
}
