/**
 * Modelos de interface: funções puras que recebem dados e devolvem HTML.
 * Nenhuma delas lê ou altera o estado da aplicação.
 */
import { SEX, TEAM_SIZE, strength, teamStrength } from './balancer.js';
import { escapeHtml as esc, formatNumber as fmt, pluralize } from './utils.js';

const TEAM_COLOR_COUNT = 8; // precisa corresponder às classes .team--c* do CSS
const SEX_SHORT = { [SEX.MALE]: 'H', [SEX.FEMALE]: 'M' };
const SEX_LABEL = { [SEX.MALE]: 'Homem', [SEX.FEMALE]: 'Mulher' };

export function ratingDots(rating) {
  const dots = Array.from({ length: 5 }, (_, i) =>
    `<i class="rating__dot${i < rating ? ' is-on' : ''}"></i>`).join('');
  return `<span class="rating" role="img" aria-label="Nota ${rating} de 5">${dots}</span>`;
}

export function sexBadge(sex) {
  return `<span class="badge badge--${sex}" title="${SEX_LABEL[sex]}">${SEX_SHORT[sex]}</span>`;
}

export function playerRow(player, checked) {
  return `<li class="roster__item">
    <label class="roster__label">
      <input type="checkbox" class="roster__check" data-id="${player.id}"${checked ? ' checked' : ''}>
      <span class="roster__name">${esc(player.name)}</span>
      ${sexBadge(player.sex)}${ratingDots(player.rating)}
    </label>
    <button type="button" class="btn btn--ghost btn--small" data-edit="${player.id}">Editar</button>
  </li>`;
}

export const rosterMessage = (text) => `<li class="roster__empty">${esc(text)}</li>`;

export function summaryText(plan) {
  let text = `${plan.total} ${pluralize(plan.total, 'selecionado', 'selecionados')} (${plan.men} H, ${plan.women} M)`;
  if (plan.teams > 0) text += ` · ${plan.teams} ${pluralize(plan.teams, 'time', 'times')} de ${TEAM_SIZE}`;
  if (plan.teams > 0 && plan.bench > 0) text += ` · ${plan.bench} ${pluralize(plan.bench, 'fica', 'ficam')} de fora`;
  return text;
}

export const weightHint = (maleWeight) =>
  `Homem nota 3 vale ${fmt(3 * maleWeight)} pontos; mulher nota 3 vale 3. ` +
  'Ajuste até os times parecerem justos na quadra.';

function teamCard(team, index, total, maleWeight, pickedId) {
  const ordered = [...team].sort((a, b) => strength(b, maleWeight) - strength(a, maleWeight));
  const men = team.filter((p) => p.sex === SEX.MALE).length;
  const players = ordered.map((p) => {
    const picked = p.id === pickedId;
    return `<li><button type="button" class="team__player${picked ? ' is-picked' : ''}" data-player="${p.id}" aria-pressed="${picked}">
      <span class="team__name">${esc(p.name)}</span>${sexBadge(p.sex)}${ratingDots(p.rating)}
    </button></li>`;
  }).join('');

  return `<article class="team team--c${index % TEAM_COLOR_COUNT}">
    <header class="team__head">
      <h3 class="team__title">Time ${index + 1}</h3>
      <span class="team__score">${fmt(total)} pts</span>
    </header>
    <p class="team__meta">${men} H · ${team.length - men} M · média ${fmt(total / team.length)}</p>
    <ul class="team__list">${players}</ul>
  </article>`;
}

export function resultView({ teams, bench, maleWeight, pickedId }) {
  const totals = teams.map((team) => teamStrength(team, maleWeight));
  const diff = Math.round((Math.max(...totals) - Math.min(...totals)) * 10) / 10;
  const benchBlock = bench.length
    ? `<div class="bench"><strong>Ficam de fora nesta rodada:</strong> ${bench.map((p) => esc(p.name)).join(', ')}
        <small>Sorteados no grupo (homens ou mulheres) que estiver em maior número, para manter o equilíbrio.</small></div>`
    : '';

  return `<p class="result__diff"><strong>${fmt(diff)}</strong> ${pluralize(diff, 'ponto', 'pontos')} de diferença entre o time mais forte e o mais fraco</p>
    <div class="teams">${teams.map((t, i) => teamCard(t, i, totals[i], maleWeight, pickedId)).join('')}</div>
    ${benchBlock}
    <div class="actions">
      <button type="button" class="btn btn--primary" data-action="copy">Copiar times</button>
      <button type="button" class="btn" data-action="regenerate">Gerar outra combinação</button>
    </div>
    <p class="hint">Para trocar dois jogadores de time manualmente, toque em um e depois no outro. Os pontos são recalculados na hora.</p>`;
}

export const emptyResult = () =>
  '<p class="result__empty">Marque quem veio hoje na lista e toque em <strong>Gerar times</strong>.<br>' +
  'Cada clique gera outra combinação igualmente equilibrada.</p>';

/** Texto simples para colar em aplicativos de mensagem. */
export function shareText(teams, bench) {
  const lines = teams.map((team, i) => `Time ${i + 1}: ${team.map((p) => p.name).join(', ')}`);
  const benchLine = bench.length ? `\n\nFora desta rodada: ${bench.map((p) => p.name).join(', ')}` : '';
  return `Times de hoje\n\n${lines.join('\n')}${benchLine}`;
}
