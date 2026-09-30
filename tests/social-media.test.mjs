// The Social media persona and the Texto do post in the docs (ticket #44): static checks over the
// shipped files, never over their wording. The persona is pinned like every persona (full model ID,
// effort, tools allowlist, display color); the edicao skill spawns it beside the Finalizador and
// shows the text at the close; the README and the wiki name the new actor. The mechanical check the
// persona runs is covered at the CLI seam in `texto-do-post.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Normalize CRLF: a checkout under core.autocrlf=true yields CRLF.
const shipped = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n');

const persona = shipped('plugin', 'estudio', 'agents', 'social-media.md');
const fields = Object.fromEntries([...persona.match(/^---\n([\s\S]*?)\n---/)[1].matchAll(/^([\w-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]));

test('the Social media is pinned to Sonnet 5.5 at medium effort, with Bash, Read and Write and a display color', () => {
  assert.equal(fields.name, 'social-media');
  assert.equal(fields.model, 'claude-sonnet-5-5');
  assert.equal(fields.effort, 'medium');
  assert.deepEqual(fields.tools.split(/\s*,\s*/), ['Bash', 'Read', 'Write']);
  assert.match(fields.color, /^(red|blue|green|yellow|purple|orange|pink|cyan)$/);
});

test('the Social media reads what the ticket lists and runs the mechanical check', () => {
  for (const token of [
    'texto-do-post',                       // the command it reruns until it passes
    'platform-rules.md',                   // the bundled reference
    '<caderno-estudio>', '<caderno-projeto>', 'caderno-proposto',
    'plataformas',                         // the Kit's platforms, one section each
    'transcricao/palavras.json',           // the transcript: every claim comes from it
    'plano.json', 'perfil.md',
    '<resumos-notion>',                    // the Resumos Notion
    'entrega/texto-do-post.md',            // where it writes
  ]) assert.ok(persona.includes(token), `the Social media prompt never mentions ${token}`);
});

test('the Social media never writes the Caderno, the Kit or the renders, and its check stops after three rounds', () => {
  assert.match(persona, /three rounds|3 rounds/i);
  assert.match(persona, /never (write|touch|change)/i);
});

test('the edicao skill spawns the Social media beside the Finalizador and shows the text at the close', () => {
  const edicao = shipped('plugin', 'estudio', 'skills', 'edicao', 'SKILL.md');
  assert.ok(edicao.includes('`social-media` agent'), 'the edicao skill never spawns the social-media agent');
  assert.ok(edicao.includes('texto-do-post.md'), 'the edicao skill never names the Texto do post file');
  assert.ok(edicao.includes('texto-do-post'), 'the edicao skill never runs the check');
  // Spawned in the Entrega step, in parallel with the Finalizador, not before she approves.
  const entrega = edicao.slice(edicao.indexOf('## 5. The Entrega'), edicao.indexOf('## 6. '));
  assert.ok(entrega.includes('social-media'), 'the Social media is not spawned in the Entrega step');
  assert.match(entrega, /parallel|same time|beside/i);
  // The close never calls the text "legenda": that is the caption burned into the video.
  assert.match(entrega, /never[^\n]*legenda|legenda[^\n]*never/i);
});

test('the README names the Social media in the actors table and the diagram', () => {
  const readme = shipped('README.md');
  const actors = readme.slice(readme.indexOf('\n## Quem trabalha em cada etapa\n'));
  const section = actors.slice(0, actors.indexOf('\n## ', 10));
  assert.ok(section.includes('`social-media`'), 'the actors table has no `social-media` row');
  assert.ok(section.includes('Texto do post'), 'the README actors section never names the Texto do post');
  const diagram = section.match(/```mermaid\n([\s\S]*?)```/)[1];
  assert.ok(diagram.includes('Social media'), 'the diagram never names the Social media');
});

test('the wiki records the Social media as built and the log says so', () => {
  const personas = shipped('wiki', 'entities', 'studio-personas.md');
  assert.ok(personas.includes('social-media.md'), 'the personas page never points to the persona file');
  assert.ok(!/Planned \(2026-09-30 grilling, not built\): \*\*Social media/.test(personas), 'the personas page still says the Social media is not built');
  const concept = shipped('wiki', 'concepts', 'post-copy.md');
  assert.ok(concept.includes('texto-do-post'), 'the Texto do post page never names the command');
  assert.ok(!concept.includes('Planned (not built)'), 'the Texto do post page still says it is not built');
  assert.match(shipped('wiki', 'log.md'), /^## \[\d{4}-\d{2}-\d{2}\] update \| .*Social media.*\(ticket #44\)$/m);
});
