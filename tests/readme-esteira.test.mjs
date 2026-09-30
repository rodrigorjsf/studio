// Docs seam — the README section that names every actor of the Esteira, draws the call chain
// and lists the Gates. Static checks over the shipped files: the persona roster is derived from
// `plugin/estudio/agents/` and `plugin/estudio/skills/`, so a new persona without a README row fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8');

const readme = read('README.md');
const SECTION_HEADING = '## Quem trabalha em cada etapa';
const SECTION_ANCHOR = '#quem-trabalha-em-cada-etapa';

const H3 = '\n### ';

// The text from `heading` up to the next heading of the same level (or the end of `text`).
function slice(text, heading, level) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `README has no "${heading.trim()}"`);
  const rest = text.slice(start + 1);
  const next = rest.indexOf(level, heading.length);
  return next === -1 ? rest : rest.slice(0, next);
}

const section = () => slice(readme, `\n${SECTION_HEADING}\n`, '\n## ');
const h3 = (body, title) => slice(body, `${H3}${title}`, H3);

const cells = (line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const tableLines = (part) => part.split('\n').filter((l) => l.startsWith('|'));
const tableHeader = (part) => cells(tableLines(part)[0]);
const tableRows = (part) => tableLines(part).slice(2).map(cells);

const agentSlugs = fs.readdirSync(path.join(repoRoot, 'plugin/estudio/agents'))
  .filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

test('the section sits right after "Como um vídeo anda pelo estúdio"', () => {
  const headings = [...readme.matchAll(/^## .+$/gm)].map((m) => m[0]);
  const at = headings.indexOf('## Como um vídeo anda pelo estúdio');
  assert.notEqual(at, -1);
  assert.equal(headings[at + 1], SECTION_HEADING);
});

test('the actors table has one row per skill persona and per plugin agent', () => {
  const part = h3(section(), 'Quem é quem');
  assert.deepEqual(tableHeader(part), [
    'Persona', 'Tipo', 'Etapa da Esteira', 'O que faz', 'Quem chama',
    'O que devolve', 'Se aprova', 'Se reprova ou falha', 'Nível',
  ]);
  const rows = tableRows(part);
  for (const row of rows) assert.equal(row.length, 9, `row "${row[0]}" has ${row.length} cells`);
  const text = rows.map((r) => r.join(' ')).join('\n');
  for (const slug of [...agentSlugs, 'estudio', 'perfil']) {
    assert.ok(text.includes(`\`${slug}\``), `no actors-table row names \`${slug}\``);
  }
  assert.equal(rows.length, agentSlugs.length + 2, 'one row per agent plus the Diretor and the Entrevistador');
  for (const row of rows) for (const cell of row) assert.notEqual(cell, '', `an empty cell in the row of ${row[0]}`);
  for (const row of rows) assert.match(row[8], /^(1|2|1 e 2)$/, `Nível of ${row[0]}`);
});

test('the diagram is a top-down flowchart in the README colors and names every actor', () => {
  const m = section().match(/```mermaid\n([\s\S]*?)```/);
  assert.ok(m, 'no mermaid block in the section');
  const diagram = m[1];
  assert.match(diagram, /^flowchart TD\b/);
  for (const cls of ['ela', 'estudio', 'fim']) assert.match(diagram, new RegExp(`classDef ${cls} `));
  assert.match(diagram, /fill:#FFE8A3/);
  assert.match(diagram, /fill:#DCEBFF/);
  assert.match(diagram, /fill:#D6F5DD/);
  for (const persona of [
    'Diretor', 'Entrevistador', 'Assistente de edição', 'Editor de pré-corte', 'Roteirista-estrategista',
    'Diretor de arte', 'Motion designer', 'Guardião da marca', 'Revisor de plataforma', 'QC técnico',
    'Finalizador', 'Artista generativo', 'Montador Higgsedit', 'Criadora', 'Autonomia',
  ]) assert.ok(diagram.includes(persona), `the diagram never names ${persona}`);
  assert.match(diagram, /\{"[^}]*✋/, 'no Gate drawn as a decision node');
});

test('the Gates table says what she sees, what approval unlocks, what rejection triggers and whether Autonomia can approve', () => {
  const part = h3(section(), 'Os Gates');
  assert.deepEqual(tableHeader(part), [
    'Gate', 'O que você vê', 'O que a aprovação libera', 'O que a rejeição faz', 'A Autonomia aprova?',
  ]);
  const rows = tableRows(part);
  assert.ok(rows.length >= 10);
  for (const row of rows) {
    assert.equal(row.length, 5, `Gate row "${row[0]}"`);
    assert.match(row[4], /^(Sim|Não)/, `Autonomia cell of ${row[0]}`);
  }
});

test('the wiki personas page links to the README section, and the log records the update', () => {
  const personas = read('wiki/entities/studio-personas.md');
  assert.ok(personas.includes(`../../README.md${SECTION_ANCHOR}`), 'personas page does not link to the README section');
  assert.ok(!personas.includes('| Persona | Kind |') && !personas.includes('Se aprova'), 'the personas page repeats the README tables');
  const log = read('wiki/log.md');
  assert.match(log, /^## \[\d{4}-\d{2}-\d{2}\] update \| .*Esteira.*README.*\(ticket #36\)$/m);
});
