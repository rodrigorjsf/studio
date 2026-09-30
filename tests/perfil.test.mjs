// Seam 1 — the deterministic CLI, Perfil part. `estado` validates the Perfil document the
// Entrevistador writes (and `/estudio:perfil` edits) and reports its Autonomia, tone and the
// answers the Criadora left to the Diretor ("decide você"). Asserts only on the JSON output.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');
const fixtures = path.join(repoRoot, 'tests', 'fixtures', 'estudios');

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

// A copy of the valid fixture Estúdio under a path with spaces and accents.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio perfil '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.cpSync(path.join(fixtures, 'valido'), dir, { recursive: true });
  return dir;
}

function estado(dir) {
  const r = spawnSync(process.execPath, [cli, 'estado', dir], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  assert.equal(r.status, 0);
  return JSON.parse(r.stdout);
}

test('a complete Perfil is valid and reports Autonomia, tone and the answers left to the Diretor', () => {
  const out = estado(estudio());
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.perfil, { present: true, autonomia: 'média', tom: 'explicar mais', nivelTecnico: 'iniciante', decideVoce: ['tom', 'autonomia'] });
});

const writePerfil = (dir, frontmatter) =>
  fs.writeFileSync(path.join(dir, 'perfil.md'), `---\n${frontmatter}\n---\n# Perfil\n`);

const COMPLETE = [
  'quem-sou: Dona de uma confeitaria',
  'trabalho: Reels da confeitaria',
  'rotina: Edita à noite',
  'tempo-para-aprovar: 5 minutos',
  'nivel-tecnico: intermediário',
  'tom: decidir mais',
  'autonomia: alta',
];

test('with no Perfil, the first run starts the Perfil Grilling', () => {
  const dir = estudio();
  fs.rmSync(path.join(dir, 'perfil.md'));
  const out = estado(dir);
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.perfil, { present: false });
  assert.deepEqual(out.nextStep, { action: 'perfil' });
});

test('a Perfil with every question answered by her has nothing left to the Diretor', () => {
  const dir = estudio();
  writePerfil(dir, COMPLETE.join('\n'));
  const out = estado(dir);
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.perfil, { present: true, autonomia: 'alta', tom: 'decidir mais', nivelTecnico: 'intermediário', decideVoce: [] });
});

test('an unanswered question or an answer outside the options is a validation error to fix first', () => {
  const dir = estudio();
  writePerfil(dir, [
    'quem-sou: Dona de uma confeitaria',
    'trabalho:',
    'tempo-para-aprovar: 5 minutos',
    'nivel-tecnico: expert',
    'tom: decidir mais',
    'autonomia: total',
  ].join('\n'));
  const out = estado(dir);
  const messages = out.errors.filter((e) => e.file === 'perfil.md').map((e) => e.message);
  assert.deepEqual(messages.sort(), [
    'autonomia "total" must be one of: baixa, média, alta',
    'missing answer "rotina"',
    'missing answer "trabalho"',
    'nivel-tecnico "expert" must be one of: iniciante, intermediário, avançado',
  ]);
  assert.deepEqual(out.nextStep, { action: 'corrigir-erros' });
});

test('"decide você" may only name the Perfil questions', () => {
  const dir = estudio();
  writePerfil(dir, [...COMPLETE, 'decide-voce:', '  - autonomia', '  - cor-favorita'].join('\n'));
  assert.deepEqual(estado(dir).errors, [
    { file: 'perfil.md', message: 'decide-voce names an unknown question "cor-favorita"' },
  ]);
  writePerfil(dir, [...COMPLETE, 'decide-voce: autonomia'].join('\n'));
  assert.deepEqual(estado(dir).errors, [
    { file: 'perfil.md', message: 'decide-voce must be a list of question keys' },
  ]);
});

test('choices typed without accents or in capitals, or saved decomposed on a Mac, read as the canonical answer', () => {
  const dir = estudio();
  const lines = COMPLETE.filter((line) => !/^(autonomia|tom|nivel-tecnico):/.test(line));
  writePerfil(dir, [...lines, 'autonomia: media', 'tom: Explicar Mais', `nivel-tecnico: ${'avançado'.normalize('NFD')}`].join('\n'));
  const out = estado(dir);
  assert.deepEqual(out.errors, []);
  assert.equal(out.perfil.autonomia, 'média');
  assert.equal(out.perfil.tom, 'explicar mais');
  assert.equal(out.perfil.nivelTecnico, 'avançado');
});
