// A minimal frontmatter reader for the Estúdio's pt-BR documents (no dependencies:
// the CLI runs on a bare portable Node). Supports what the documents need and nothing else:
//
//   ---
//   status: Revisão          → "Revisão"   (quotes optional)
//   rodada: 2                → 2
//   aprovado: true           → true
//   vazio:                   → null
//   itens:                   → ["a", "b"]
//     - a
//     - b
//   ---
//
// Throws an Error with a plain message when the block is malformed.
const KEY_LINE = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/;
const LIST_ITEM = /^\s+-\s+(.*)$/;

function scalar(raw) {
  const value = raw.trim();
  if (value === '') return null;
  if (/^(['"]).*\1$/.test(value)) return value.slice(1, -1);
  if (value === 'true' || value === 'false') return value === 'true';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function parseFrontmatter(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0].trim() !== '---') throw new Error('does not start with a --- frontmatter block');
  const end = lines.indexOf('---', 1);
  if (end === -1) throw new Error('frontmatter block is not closed with ---');
  const data = {};
  let listKey = null;
  lines.slice(1, end).forEach((line, index) => {
    if (line.trim() === '' || line.trimStart().startsWith('#')) return;
    const item = LIST_ITEM.exec(line);
    if (item && listKey) {
      data[listKey] = [...(data[listKey] ?? []), scalar(item[1])];
      return;
    }
    const pair = KEY_LINE.exec(line);
    if (!pair) throw new Error(`frontmatter line ${index + 2} is not "key: value": ${line.trim()}`);
    const [, key, raw = ''] = pair;
    if (key in data) throw new Error(`frontmatter key "${key}" appears twice`);
    data[key] = scalar(raw);
    listKey = raw.trim() === '' ? key : null;
  });
  return data;
}

// A value written so that parseFrontmatter reads it back unchanged. Text that would read as
// something else (a number, true/false, empty, quoted, padded) is wrapped in double quotes.
function writeScalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);
  return scalar(value) === value ? value : `"${value}"`;
}

// A document with `data` as its frontmatter block (null values written empty) and `body` after it.
export function writeDocument(data, body) {
  const block = Object.entries(data).map(([key, value]) => (Array.isArray(value)
    ? [`${key}:`, ...value.map((item) => `  - ${writeScalar(item)}`)].join('\n')
    : `${key}:${value === null ? '' : ` ${writeScalar(value)}`}`));
  return `---\n${block.join('\n')}\n---\n${body}`;
}

// The text after the frontmatter block of the document `text`.
export function documentBody(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  return lines.slice(lines.indexOf('---', 1) + 1).join('\n');
}

// The document `text` with its frontmatter block replaced by `data`; the body is kept as is.
export function replaceFrontmatter(text, data) {
  return writeDocument(data, documentBody(text));
}
