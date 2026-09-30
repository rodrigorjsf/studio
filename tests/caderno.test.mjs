// Seam 1 — the deterministic CLI, for the Caderno (ticket #40): `caderno` appends an entry to the
// Estúdio's or a Projeto's Caderno, replaces or removes one by its identifier, and refuses what it
// does not know without touching a file. Drives plugin/estudio/scripts/estudio.mjs as a process
// against a temporary Estúdio and asserts only on its JSON output, exit code and the files it writes.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

const PROJETO = 'Minha Empresa';
const VIDEO = 'Dica rápida';

// An Estúdio with one approved Projeto holding one Vídeo.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio caderno '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(path.join(dir, 'projetos'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const briefing = path.join(dir, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  return dir;
}

const caderno = (dir, input) => run('caderno', dir, JSON.stringify(input));
const estudioFile = (dir) => path.join(dir, 'caderno.md');
const projetoFile = (dir) => path.join(dir, 'projetos', PROJETO, 'caderno.md');
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// Every file under `dir`, by relative path, with its content: to prove a refusal changed nothing.
function snapshot(dir) {
  const files = {};
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[path.relative(dir, full)] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return files;
}

// The lines under a `## <heading>` of a Caderno, up to the next heading.
function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `no "## ${heading}" in the Caderno`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => line.trim() !== '');
}

const ISO_DAY = /\d{4}-\d{2}-\d{2}/;

test('an entry is appended to the Estúdio\'s Caderno under its section, stamped with persona, Vídeo and date', () => {
  const dir = estudio();
  const { code, out } = caderno(dir, {
    acao: 'anexar', camada: 'estudio', secao: 'elogios', texto: 'Adorou que o Diretor já sugeriu os prints.', persona: 'diretor', projeto: PROJETO, video: VIDEO,
  });
  assert.equal(code, 0);
  assert.equal(out.written, true);
  assert.equal(out.camada, 'estudio');
  assert.equal(out.secao, 'elogios');
  assert.equal(out.id, 1);
  assert.match(out.data, ISO_DAY);

  const text = read(estudioFile(dir));
  assert.equal(section(text, 'Elogios').length, 1);
  const [entry] = section(text, 'Elogios');
  assert.ok(entry.includes('Adorou que o Diretor já sugeriu os prints.'));
  assert.ok(entry.includes('diretor'));
  assert.ok(entry.includes(VIDEO));
  assert.ok(entry.includes(out.data));
  assert.deepEqual(section(text, 'Queixas'), []);
  assert.deepEqual(section(text, 'Soluções'), []);
});

const SECOES = [['elogios', 'Elogios'], ['queixas', 'Queixas'], ['solucoes', 'Soluções']];

for (const camada of ['estudio', 'projeto']) {
  for (const [secao, heading] of SECOES) {
    test(`an entry goes into the ${camada} layer's ${heading} section, in that layer's file only`, () => {
      const dir = estudio();
      const { out } = caderno(dir, { acao: 'anexar', camada, secao, texto: `Texto de ${heading}.`, persona: 'motion-designer', projeto: PROJETO, video: VIDEO });
      assert.equal(out.written, true);
      const [mine, other] = camada === 'estudio' ? [estudioFile(dir), projetoFile(dir)] : [projetoFile(dir), estudioFile(dir)];
      assert.equal(fs.existsSync(other), false, 'the other layer must stay untouched');
      const text = read(mine);
      for (const [, other] of SECOES) assert.equal(section(text, other).length, other === heading ? 1 : 0);
      const [entry] = section(text, heading);
      assert.ok(entry.includes(`Texto de ${heading}.`));
      assert.ok(entry.includes('motion-designer'));
      assert.ok(entry.includes(VIDEO));
      assert.ok(entry.includes(out.data));
    });
  }
}

test('entries accumulate with their own identifiers, each under its section', () => {
  const dir = estudio();
  const add = (secao, texto) => caderno(dir, { acao: 'anexar', camada: 'estudio', secao, texto, persona: 'diretor' }).out;
  assert.equal(add('queixas', 'Muitas perguntas.').id, 1);
  assert.equal(add('elogios', 'Gostou dos prints.').id, 2);
  assert.equal(add('queixas', 'Zoom rápido demais.').id, 3);
  const text = read(estudioFile(dir));
  assert.equal(section(text, 'Queixas').length, 2);
  assert.equal(section(text, 'Elogios').length, 1);
  assert.ok(section(text, 'Queixas')[1].includes('Zoom rápido demais.'));
});

// Two conflicting Queixas and an Elogio in the Estúdio's Caderno, the way the Diretor would have written them.
function conflicting() {
  const dir = estudio();
  const add = (secao, texto) => caderno(dir, { acao: 'anexar', camada: 'estudio', secao, texto, persona: 'diretor' }).out.id;
  return { dir, velha: add('queixas', 'Quer poucas perguntas.'), elogio: add('elogios', 'Gostou dos prints.'), nova: add('queixas', 'Quer mais perguntas.') };
}

test('an entry is replaced by its identifier: same place, new text, new stamp, nothing else moves', () => {
  const { dir, velha, elogio, nova } = conflicting();
  const { code, out } = caderno(dir, { acao: 'substituir', camada: 'estudio', id: velha, texto: 'Prefere decidir tudo sozinha.', persona: 'diretor', projeto: PROJETO, video: VIDEO });
  assert.equal(code, 0);
  assert.equal(out.written, true);
  assert.equal(out.id, velha);
  assert.equal(out.secao, 'queixas');
  const text = read(estudioFile(dir));
  const queixas = section(text, 'Queixas');
  assert.equal(queixas.length, 2);
  assert.ok(queixas[0].startsWith(`- **#${velha}** Prefere decidir tudo sozinha.`));
  assert.ok(queixas[0].includes(VIDEO));
  assert.ok(!text.includes('Quer poucas perguntas.'));
  assert.ok(queixas[1].startsWith(`- **#${nova}** Quer mais perguntas.`));
  assert.ok(section(text, 'Elogios')[0].startsWith(`- **#${elogio}** Gostou dos prints.`));
});

test('an entry is removed by its identifier and the others keep theirs', () => {
  const { dir, velha, elogio, nova } = conflicting();
  const { code, out } = caderno(dir, { acao: 'remover', camada: 'estudio', id: velha });
  assert.equal(code, 0);
  assert.equal(out.written, true);
  assert.equal(out.id, velha);
  const text = read(estudioFile(dir));
  assert.ok(!text.includes('Quer poucas perguntas.'));
  assert.equal(section(text, 'Queixas').length, 1);
  assert.ok(section(text, 'Queixas')[0].startsWith(`- **#${nova}**`));
  assert.ok(section(text, 'Elogios')[0].startsWith(`- **#${elogio}**`));
  assert.equal(caderno(dir, { acao: 'anexar', camada: 'estudio', secao: 'queixas', texto: 'Outra.', persona: 'diretor' }).out.id, nova + 1);
});

test('replacing or removing an identifier that is not in the Caderno changes nothing', () => {
  const { dir, nova } = conflicting();
  const before = snapshot(dir);
  for (const input of [
    { acao: 'substituir', camada: 'estudio', id: nova + 5, texto: 'Nova.', persona: 'diretor' },
    { acao: 'remover', camada: 'estudio', id: nova + 5 },
    { acao: 'remover', camada: 'projeto', id: 1, projeto: PROJETO },
  ]) {
    const { code, out } = caderno(dir, input);
    assert.equal(code, 0);
    assert.equal(out.written, false);
    assert.equal(out.reason, 'unknown-entry');
    assert.deepEqual(snapshot(dir), before);
  }
});

const VALID = { acao: 'anexar', camada: 'projeto', secao: 'queixas', texto: 'Zoom rápido demais.', persona: 'diretor', projeto: PROJETO, video: VIDEO };

test('an unknown layer, section, Projeto or Vídeo is refused with its own code and no file changes', () => {
  const dir = estudio();
  caderno(dir, { ...VALID, camada: 'estudio' });
  const before = snapshot(dir);
  const cases = [
    ['unknown-layer', { camada: 'empresa' }],
    ['unknown-layer', { camada: undefined }],
    ['unknown-section', { secao: 'dicas' }],
    ['unknown-section', { secao: 'Elogios' }],
    ['unknown-projeto', { projeto: 'Outra Empresa' }],
    ['unknown-projeto', { camada: 'estudio', projeto: 'Outra Empresa', video: undefined }],
    ['unknown-video', { video: 'Vídeo que não existe' }],
    ['unknown-video', { camada: 'estudio', video: 'Vídeo que não existe' }],
  ];
  for (const [reason, change] of cases) {
    const { code, out } = caderno(dir, { ...VALID, ...change });
    assert.equal(code, 0, reason);
    assert.equal(out.written, false, reason);
    assert.equal(out.reason, reason, JSON.stringify(change));
    assert.deepEqual(snapshot(dir), before, `${reason} must change nothing`);
  }
  assert.equal(fs.existsSync(projetoFile(dir)), false);
});

test('an input that is not a well-formed entry is refused and no file changes', () => {
  const dir = estudio();
  const before = snapshot(dir);
  for (const input of [
    { ...VALID, texto: '   ' },
    { ...VALID, persona: '' },
    { ...VALID, projeto: undefined },
    { ...VALID, camada: 'estudio', projeto: undefined },
    { ...VALID, acao: 'apagar-tudo' },
    { acao: 'substituir', camada: 'estudio', id: 'um', texto: 'x', persona: 'diretor' },
  ]) {
    const { out } = caderno(dir, input);
    assert.equal(out.written, false, JSON.stringify(input));
    assert.equal(out.reason, 'invalid-input', JSON.stringify(input));
    assert.deepEqual(snapshot(dir), before);
  }
  const { out } = run('caderno', dir, 'isto não é JSON');
  assert.equal(out.reason, 'invalid-input');
  assert.deepEqual(snapshot(dir), before);
});

test('a folder that is not an Estúdio is refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pasta qualquer '));
  tempRoots.push(dir);
  const { out } = caderno(dir, { ...VALID, camada: 'estudio', projeto: undefined, video: undefined });
  assert.equal(out.written, false);
  assert.equal(out.reason, 'not-estudio');
  assert.deepEqual(fs.readdirSync(dir), []);
});

// ---- the shipped prompts and docs: static checks over the files, never over their wording ----
// Normalize CRLF: a checkout under core.autocrlf=true yields CRLF.
const shipped = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n');
const agentsDir = path.join(repoRoot, 'plugin', 'estudio', 'agents');
const agents = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));

test('every persona prompt names both Caderno paths and the report field for proposed entries', () => {
  assert.ok(agents.length >= 11);
  for (const file of agents) {
    const text = shipped('plugin', 'estudio', 'agents', file);
    for (const token of ['<caderno-estudio>', '<caderno-projeto>', 'caderno-proposto']) {
      assert.ok(text.includes(token), `${file} never mentions ${token}`);
    }
  }
});

test('the Diretor\'s skills hand both Caderno paths to the personas and point to how the Caderno is kept', () => {
  const reference = shipped('plugin', 'estudio', 'skills', 'estudio', 'references', 'caderno.md');
  for (const token of ['Elogios', 'Queixas', 'Soluções', '"acao": "anexar"', '"acao": "substituir"', '"acao": "remover"', 'caderno-proposto']) {
    assert.ok(reference.includes(token), `the Caderno reference never mentions ${token}`);
  }
  for (const skill of ['estudio', 'novo-video', 'plano', 'edicao']) {
    const text = shipped('plugin', 'estudio', 'skills', skill, 'SKILL.md');
    assert.ok(text.includes('caderno.md'), `the ${skill} skill never points to the Caderno reference`);
  }
  for (const skill of ['novo-video', 'plano', 'edicao']) {
    const text = shipped('plugin', 'estudio', 'skills', skill, 'SKILL.md');
    assert.ok(text.includes('<caderno-estudio>') || text.includes('the two Caderno paths'), `the ${skill} skill never hands the Caderno paths to a persona`);
  }
});

test('the README actors section and the wiki describe the Caderno as built', () => {
  const readme = shipped('README.md');
  const actors = readme.slice(readme.indexOf('\n## Quem trabalha em cada etapa\n'));
  const section = actors.slice(0, actors.indexOf('\n## ', 10));
  assert.match(section, /Caderno/);
  for (const word of ['Elogios', 'Queixas', 'Soluções']) assert.ok(section.includes(word), `the README actors section never names ${word}`);
  const wiki = shipped('wiki', 'concepts', 'caderno.md');
  assert.doesNotMatch(wiki, /Planned \(not built\)/);
  assert.match(wiki, /caderno/);
});
