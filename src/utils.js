/** Utilitários genéricos, sem dependência do domínio. */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto do usuário antes de inseri-lo em HTML. */
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** Número com no máximo uma casa decimal, no formato brasileiro. */
export function formatNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export const pluralize = (count, singular, plural) => (count === 1 ? singular : plural);

/** Minúsculas e sem acentos, para busca e comparação de nomes. */
export const normalizeText = (value) =>
  String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Remove espaços extras de um nome digitado. */
export const cleanName = (value) => String(value).trim().replace(/\s+/g, ' ');

export const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
