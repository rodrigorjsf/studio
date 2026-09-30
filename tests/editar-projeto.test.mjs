// Seam 1 — the deterministic CLI, for changing an approved Projeto's Kit de marca
// (`editar-kit`) and opting an existing Vídeo into the new Kit (`atualizar-kit-video`).
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON
// output, exit code and the files it produces.
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

// An Estúdio with one Projeto whose Grilling is done and whose Kit she approved, under a
// path with spaces and accents as on her Mac.
function estudioAprovado(nome = 'Minha Empresa') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio editar '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, nome);
  const briefing = path.join(dir, 'projetos', nome, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, nome).out.approved, true);
  return dir;
}

const kitFile = (dir, projeto, video) => (video
  ? path.join(dir, 'projetos', projeto, 'videos', video, 'kit.json')
  : path.join(dir, 'projetos', projeto, 'kit.json'));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function addVideo(dir, projeto, video, status) {
  const folder = path.join(dir, 'projetos', projeto, 'videos', video);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'video.md'), `---\nstatus: ${status}\nrodada: 0\nnivel: 1\n---\n# ${video}\n`);
}

test('a valid Kit edit is applied and re-approved, and existing Vídeos keep the Kit they started with', () => {
  const dir = estudioAprovado();
  addVideo(dir, 'Minha Empresa', 'Lançamento', 'Planejamento');
  addVideo(dir, 'Minha Empresa', 'Receita antiga', 'Entregue');
  const before = readJson(kitFile(dir, 'Minha Empresa'));

  const { code, out } = run('editar-kit', dir, 'Minha Empresa', '{"legendas": {"cor": "#00FF88"}, "fazer": ["logo no fim"]}');
  assert.equal(code, 0);
  assert.equal(out.edited, true);
  assert.equal(out.projeto, 'Minha Empresa');
  assert.deepEqual(out.videosKeepingTheirKit, ['Lançamento', 'Receita antiga']);

  const after = readJson(kitFile(dir, 'Minha Empresa'));
  assert.equal(after.legendas.cor, '#00FF88');
  assert.equal(after.legendas.tamanho, before.legendas.tamanho, 'untouched fields keep their value');
  assert.deepEqual(after.fazer, ['logo no fim']);
  assert.equal(after.aprovadoEm, out.aprovadoEm);
  assert.ok(Date.parse(after.aprovadoEm) >= Date.parse(before.aprovadoEm));

  for (const video of ['Lançamento', 'Receita antiga']) {
    assert.deepEqual(readJson(kitFile(dir, 'Minha Empresa', video)), before, `${video} keeps the pre-edit Kit`);
  }
  const state = run('estado', dir).out;
  assert.deepEqual(state.errors, []);
  assert.equal(state.projetos[0].kit, 'ok');
});

test('an edit that breaks the Kit is refused with its problems, and nothing changes', () => {
  const dir = estudioAprovado();
  addVideo(dir, 'Minha Empresa', 'Lançamento', 'Planejamento');
  const before = fs.readFileSync(kitFile(dir, 'Minha Empresa'), 'utf8');

  const { code, out } = run('editar-kit', dir, 'Minha Empresa', '{"formato": "16:9", "cores": {"destaque": "amarelo"}, "ativos": {"logos": ["kit/logo novo.png"]}}');
  assert.equal(code, 0);
  assert.deepEqual(out, {
    edited: false,
    reason: 'invalid',
    projeto: 'Minha Empresa',
    errors: [
      'cores.destaque must be a color like "#1A2B3C"',
      'ativos.logos[0] file not found: kit/logo novo.png',
      'formato "16:9" must be listed in entregaveis.formatos',
    ],
  });
  assert.equal(fs.readFileSync(kitFile(dir, 'Minha Empresa'), 'utf8'), before);
  assert.equal(fs.existsSync(kitFile(dir, 'Minha Empresa', 'Lançamento')), false, 'a refused edit freezes nothing');
});

test('an edit must be a JSON object of Kit fields, and cannot touch the approval stamp or the schema version', () => {
  const dir = estudioAprovado();
  const before = fs.readFileSync(kitFile(dir, 'Minha Empresa'), 'utf8');
  for (const [edit, message] of [
    ['{"legendas": ', /^not valid JSON/],
    ['["9:16"]', /^must be a JSON object/],
    ['{"aprovadoEm": null}', /^aprovadoEm cannot be edited/],
    ['{"schemaVersion": 2, "formato": "9:16"}', /^schemaVersion cannot be edited/],
  ]) {
    const { code, out } = run('editar-kit', dir, 'Minha Empresa', edit);
    assert.equal(code, 0);
    assert.equal(out.edited, false, edit);
    assert.equal(out.reason, 'invalid-edit', edit);
    assert.match(out.message, message);
  }
  assert.equal(fs.readFileSync(kitFile(dir, 'Minha Empresa'), 'utf8'), before);
});

test('only an approved Kit is edited here: an unknown Projeto or one still in its Grilling is refused', () => {
  const dir = estudioAprovado();
  run('novo-projeto', dir, 'Pessoal');
  assert.deepEqual(run('editar-kit', dir, 'Inexistente', '{"fazer": []}').out, { edited: false, reason: 'unknown-projeto' });
  assert.deepEqual(run('editar-kit', dir, 'Pessoal', '{"fazer": []}').out,
    { edited: false, reason: 'kit-not-approved', projeto: 'Pessoal', kit: 'aguardando-aprovacao' });
});

test('a Vídeo keeps its own Kit across later edits, and one started after an edit keeps the Kit in force when it started', () => {
  const dir = estudioAprovado();
  addVideo(dir, 'Minha Empresa', 'Lançamento', 'Construção');
  const original = readJson(kitFile(dir, 'Minha Empresa'));
  run('editar-kit', dir, 'Minha Empresa', '{"legendas": {"cor": "#00FF88"}}');
  addVideo(dir, 'Minha Empresa', 'Dica rápida', 'Briefing');

  const { out } = run('editar-kit', dir, 'Minha Empresa', '{"legendas": {"cor": "#FF0000"}}');
  assert.deepEqual(out.videosKeepingTheirKit, ['Dica rápida', 'Lançamento']);
  assert.deepEqual(readJson(kitFile(dir, 'Minha Empresa', 'Lançamento')), original, 'still the Kit it started with');
  assert.equal(readJson(kitFile(dir, 'Minha Empresa', 'Dica rápida')).legendas.cor, '#00FF88', 'the Kit in force when it started');
});

test('an existing Vídeo follows the new Kit only when she opts in', () => {
  const dir = estudioAprovado();
  addVideo(dir, 'Minha Empresa', 'Lançamento', 'Revisão');
  run('editar-kit', dir, 'Minha Empresa', '{"cores": {"destaque": "#00FF88"}}');

  const { code, out } = run('atualizar-kit-video', dir, 'Minha Empresa', 'Lançamento');
  assert.equal(code, 0);
  assert.equal(out.updated, true);
  assert.equal(out.projeto, 'Minha Empresa');
  assert.equal(out.video, 'Lançamento');
  assert.deepEqual(readJson(kitFile(dir, 'Minha Empresa', 'Lançamento')), readJson(kitFile(dir, 'Minha Empresa')));
  assert.equal(out.aprovadoEm, readJson(kitFile(dir, 'Minha Empresa')).aprovadoEm);
});

test('a delivered Vídeo, an unknown Vídeo or an unapproved Kit is never pushed onto a Vídeo', () => {
  const dir = estudioAprovado();
  addVideo(dir, 'Minha Empresa', 'Receita antiga', 'Entregue');
  run('editar-kit', dir, 'Minha Empresa', '{"cores": {"destaque": "#00FF88"}}');
  const delivered = fs.readFileSync(kitFile(dir, 'Minha Empresa', 'Receita antiga'), 'utf8');

  assert.deepEqual(run('atualizar-kit-video', dir, 'Minha Empresa', 'Receita antiga').out,
    { updated: false, reason: 'finished', projeto: 'Minha Empresa', video: 'Receita antiga', status: 'Entregue' });
  assert.equal(fs.readFileSync(kitFile(dir, 'Minha Empresa', 'Receita antiga'), 'utf8'), delivered);
  assert.deepEqual(run('atualizar-kit-video', dir, 'Minha Empresa', 'Outro').out,
    { updated: false, reason: 'unknown-video', projeto: 'Minha Empresa' });
  assert.deepEqual(run('atualizar-kit-video', dir, 'Inexistente', 'Outro').out, { updated: false, reason: 'unknown-projeto' });
  run('novo-projeto', dir, 'Pessoal');
  addVideo(dir, 'Pessoal', 'Rascunho', 'Briefing');
  assert.deepEqual(run('atualizar-kit-video', dir, 'Pessoal', 'Rascunho').out,
    { updated: false, reason: 'kit-not-approved', projeto: 'Pessoal', kit: 'aguardando-aprovacao' });
  assert.equal(fs.existsSync(kitFile(dir, 'Pessoal', 'Rascunho')), false);
});
