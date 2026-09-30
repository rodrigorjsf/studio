// Seam 1 — the deterministic CLI, for the Kit de marca's `plataformas` field: the platforms a
// Projeto posts on, which decide whose Texto do post the studio writes. Drives
// plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output, exit
// code and the files it produces.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');
const TODAS = ['reels', 'tiktok', 'shorts'];

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

// An Estúdio with one Projeto whose Grilling is done and whose Kit is still waiting for her
// approval, under a path with spaces and accents as on her Mac.
function estudioComProjeto(nome = 'Minha Empresa') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio plataformas '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, nome);
  const briefing = path.join(dir, 'projetos', nome, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  return dir;
}

const kitFile = (dir, nome = 'Minha Empresa', video) => path.join(dir, 'projetos', nome, ...(video ? ['videos', video] : []), 'kit.json');
const readKit = (dir, nome, video) => JSON.parse(fs.readFileSync(kitFile(dir, nome, video), 'utf8'));
const writeKit = (dir, kit) => fs.writeFileSync(kitFile(dir), JSON.stringify(kit));
const kitState = (dir) => run('estado', dir).out.projetos[0].kit;
const kitErrors = (dir) => run('estado', dir).out.errors.map((e) => e.message);

function aprovado(dir) {
  assert.equal(run('aprovar-kit', dir, 'Minha Empresa').out.approved, true);
}

test('a new Projeto\'s Kit lists the three platforms, and a valid subset or order is accepted', () => {
  const dir = estudioComProjeto();
  assert.deepEqual(readKit(dir).plataformas, TODAS);

  for (const plataformas of [['reels'], ['shorts', 'tiktok'], TODAS]) {
    writeKit(dir, { ...readKit(dir), plataformas });
    assert.deepEqual(kitErrors(dir), [], JSON.stringify(plataformas));
    assert.equal(kitState(dir), 'aguardando-aprovacao');
  }
});

test('an empty list, an unknown value or a value that is not a list of names is refused, and aprovar-kit holds', () => {
  const dir = estudioComProjeto();
  for (const [plataformas, message] of [
    [[], 'plataformas must list at least one'],
    [['instagram'], 'plataformas[0] must be one of: reels, tiktok, shorts'],
    [['reels', 'youtube'], 'plataformas[1] must be one of: reels, tiktok, shorts'],
    [['reels', 'reels'], 'plataformas must not repeat a value'],
    ['reels', 'plataformas must be a list'],
    [null, 'plataformas must be a list'],
  ]) {
    writeKit(dir, { ...readKit(dir), plataformas });
    assert.deepEqual(kitErrors(dir), [message], JSON.stringify(plataformas));
    assert.equal(kitState(dir), 'invalido');
    const { out } = run('aprovar-kit', dir, 'Minha Empresa');
    assert.equal(out.approved, false);
    assert.deepEqual(out.errors, [`kit.json: ${message}`]);
    assert.equal(readKit(dir).aprovadoEm, null);
  }
});

test('a Kit without plataformas is valid and reads as all three platforms', () => {
  const dir = estudioComProjeto();
  const legacy = readKit(dir);
  delete legacy.plataformas;
  writeKit(dir, legacy);
  assert.deepEqual(kitErrors(dir), []);
  assert.equal(kitState(dir), 'aguardando-aprovacao');
  aprovado(dir);
  assert.equal('plataformas' in readKit(dir), false, 'approving does not invent the field');

  const { out } = run('editar-kit', dir, 'Minha Empresa', '{"fazer": ["logo no fim"]}');
  assert.equal(out.edited, true);
  assert.deepEqual(out.plataformas, TODAS);
});

test('editar-kit changes plataformas, refuses a bad list, and Vídeos already in progress keep their Kit', () => {
  const dir = estudioComProjeto();
  aprovado(dir);
  const video = path.join(dir, 'projetos', 'Minha Empresa', 'videos', 'Lançamento');
  fs.mkdirSync(video, { recursive: true });
  fs.writeFileSync(path.join(video, 'video.md'), '---\nstatus: Construção\nrodada: 0\nnivel: 1\n---\n# Lançamento\n');

  let { code, out } = run('editar-kit', dir, 'Minha Empresa', '{"plataformas": ["shorts"]}');
  assert.equal(code, 0);
  assert.equal(out.edited, true);
  assert.deepEqual(out.plataformas, ['shorts']);
  assert.deepEqual(readKit(dir).plataformas, ['shorts']);
  assert.deepEqual(readKit(dir, 'Minha Empresa', 'Lançamento').plataformas, TODAS, 'the Vídeo keeps the Kit it started with');
  assert.deepEqual(kitErrors(dir), []);

  const before = fs.readFileSync(kitFile(dir), 'utf8');
  for (const edit of ['{"plataformas": []}', '{"plataformas": ["instagram"]}']) {
    ({ code, out } = run('editar-kit', dir, 'Minha Empresa', edit));
    assert.equal(code, 0);
    assert.equal(out.edited, false, edit);
    assert.equal(out.reason, 'invalid', edit);
    assert.equal(fs.readFileSync(kitFile(dir), 'utf8'), before);
  }
});
