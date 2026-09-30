// The bundled platform reference of the Texto do post: where it lives, how its rules are read,
// and whether it is stale. Every rule is a top-level bullet carrying a source label
// (`[official]`, `[study]` or `[marketing]`), a `sourced: YYYY-MM-DD` date and an https URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The reference file, relative to the plugin root (the `scripts/lib` folder is two levels down).
export const REFERENCIA_DE_PLATAFORMA = 'skills/estudio/references/platform-rules.md';
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const referenciaDePlataformaFile = (root = pluginRoot) => path.join(root, ...REFERENCIA_DE_PLATAFORMA.split('/'));

export const SOURCE_LABELS = ['official', 'study', 'marketing'];
// The reference is stale when its newest `sourced:` date is more than this many months old.
export const STALE_AFTER_MONTHS = 6;

const LABEL = new RegExp(`\\[(${SOURCE_LABELS.join('|')})\\]`);
const SOURCED = /\bsourced:\s*(\d{4}-\d{2}-\d{2})\b/;
const URL = /https:\/\/[^\s<>)]+/;

// A calendar date `YYYY-MM-DD` that exists (2026-02-30 does not).
const isCalendarDate = (text) => {
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
};

// The rules of the reference text: each top-level bullet outside a code fence, with its
// continuation lines, as {text, label, sourced, url, problems}. A missing or invalid part is
// null and named in `problems`.
export function platformRules(markdown) {
  const items = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line)) fenced = !fenced;
    else if (fenced) continue;
    else if (/^[-*]\s/.test(line)) items.push(line.replace(/^[-*]\s+/, ''));
    else if (/^\s+\S/.test(line) && items.at(-1)) items[items.length - 1] += ` ${line.trim()}`;
    else items.push(null); // a blank line or a heading ends the bullet
  }
  return items.filter((text) => text !== null).map((text) => {
    const label = LABEL.exec(text)?.[1] ?? null;
    const sourced = SOURCED.exec(text)?.[1] ?? null;
    const url = URL.exec(text)?.[0] ?? null;
    const valid = sourced && isCalendarDate(sourced) ? sourced : null;
    const problems = [];
    if (!label) problems.push(`lacks its source label (${SOURCE_LABELS.map((l) => `[${l}]`).join(', ')})`);
    if (!valid) problems.push('lacks its sourced: date (sourced: YYYY-MM-DD)');
    if (!url) problems.push('lacks its URL (https://…)');
    return { text, label, sourced: valid, url, problems };
  });
}

// The newest `sourced:` date among the rules (`YYYY-MM-DD`), or null when none has one.
export const newestSourced = (rules) => rules.map((r) => r.sourced).filter(Boolean).sort().at(-1) ?? null;

// Whether `newest` is more than STALE_AFTER_MONTHS before `now` (a Date). No date: stale.
export function isStale(newest, now) {
  if (!newest) return true;
  const limit = new Date(`${newest}T00:00:00Z`);
  limit.setUTCMonth(limit.getUTCMonth() + STALE_AFTER_MONTHS);
  return now.getTime() > limit.getTime();
}

// The reference's state for `estado`: {presente, maisRecente, desatualizada}. The clock is
// `now`; ESTUDIO_AGORA (an ISO date) stands in for it so a test can put today on either side of
// the line.
export function platformReferenceState(file = referenciaDePlataformaFile(), now = new Date(process.env.ESTUDIO_AGORA ?? Date.now())) {
  if (!fs.existsSync(file)) return { presente: false, maisRecente: null, desatualizada: true };
  const maisRecente = newestSourced(platformRules(fs.readFileSync(file, 'utf8')));
  return { presente: true, maisRecente, desatualizada: isStale(maisRecente, now) };
}
