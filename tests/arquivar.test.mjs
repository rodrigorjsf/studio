// Seam 1 — the deterministic CLI, for the Kit learnings and the archive (ticket #17): after the
// Entrega, `arquivar` records the learnings the Diretor proposed, applies to the Projeto's Kit
// only the ones she approved (re-validated, existing Vídeos keeping their Kit), and moves the
// Vídeo to Arquivado. Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on
// its JSON output, exit code and the files it produces.
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
const OUTRO = 'Próximo vídeo';

// An Estúdio with one approved Projeto, the Vídeo `VIDEO` in `status` and another Vídeo in progress.
function estudio(status = 'Entregue') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio arquivar '));
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
  for (const nome of [VIDEO, OUTRO]) assert.equal(run('novo-video', dir, PROJETO, nome, recording).out.created, true);
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, JSON.stringify({ status })).out.recorded, true);
  return dir;
}

const projetoDir = (dir) => path.join(dir, 'projetos', PROJETO);
const videoDir = (dir, nome = VIDEO) => path.join(projetoDir(dir), 'videos', nome);
const kitDe = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const statusDe = (dir, nome = VIDEO) => run('estado', dir).out.projetos[0].videos.find((v) => v.id === nome).status;

const LEGENDA = { descricao: 'Ela prefere duas palavras por vez na legenda.', kit: { legendas: { palavrasPorVez: 2 } }, aprovado: true };
const FAZER = { descricao: 'Abrir sempre com o número em destaque.', kit: { fazer: ['abrir com o número em destaque'] }, aprovado: false };

test('only the learnings she approved reach the Kit; the Vídeo is archived with every proposal recorded', () => {
  const dir = estudio();
  const kitAntes = kitDe(path.join(projetoDir(dir), 'kit.json'));
  const { code, out } = run('arquivar', dir, PROJETO, VIDEO, JSON.stringify({ aprendizados: [LEGENDA, FAZER] }));
  assert.equal(code, 0);
  assert.equal(out.archived, true);
  assert.equal(out.status, 'Arquivado');
  assert.equal(out.aplicados, 1);
  assert.equal(out.kitEditado, true);

  const kit = kitDe(path.join(projetoDir(dir), 'kit.json'));
  assert.equal(kit.legendas.palavrasPorVez, 2);
  assert.deepEqual(kit.fazer, kitAntes.fazer);
  assert.notEqual(kit.aprovadoEm, kitAntes.aprovadoEm);

  const registro = JSON.parse(fs.readFileSync(path.join(videoDir(dir), 'aprendizados.json'), 'utf8'));
  assert.deepEqual(registro.aprendizados, [LEGENDA, FAZER]);
  assert.equal(registro.kitAprovadoEm, kit.aprovadoEm);
  assert.equal(statusDe(dir), 'Arquivado');
  assert.match(fs.readFileSync(path.join(videoDir(dir), 'video.md'), 'utf8'), /^arquivadoEm: \d{4}-/m);
  assert.deepEqual(run('estado', dir).out.errors, []);
});

test('estado lists a delivered Vídeo until its Kit learnings are answered, whatever else is in progress', () => {
  const dir = estudio();
  assert.deepEqual(run('estado', dir).out.aprendizadosPendentes, [{ projeto: PROJETO, video: VIDEO }]);
  run('arquivar', dir, PROJETO, VIDEO, '{"aprendizados": []}');
  assert.deepEqual(run('estado', dir).out.aprendizadosPendentes, []);
});

test('the other Vídeos and the archived one keep the Kit they started with', () => {
  const dir = estudio();
  const kitAntes = fs.readFileSync(path.join(projetoDir(dir), 'kit.json'), 'utf8');
  run('arquivar', dir, PROJETO, VIDEO, JSON.stringify({ aprendizados: [LEGENDA] }));
  for (const nome of [VIDEO, OUTRO]) assert.equal(fs.readFileSync(path.join(videoDir(dir, nome), 'kit.json'), 'utf8'), kitAntes);
});

test('with nothing approved the Kit is untouched, and the Vídeo is still archived', () => {
  for (const aprendizados of [[], [FAZER]]) {
    const dir = estudio();
    const kitAntes = fs.readFileSync(path.join(projetoDir(dir), 'kit.json'), 'utf8');
    const { out } = run('arquivar', dir, PROJETO, VIDEO, JSON.stringify({ aprendizados }));
    assert.equal(out.archived, true);
    assert.equal(out.aplicados, 0);
    assert.equal(out.kitEditado, false);
    assert.equal(fs.readFileSync(path.join(projetoDir(dir), 'kit.json'), 'utf8'), kitAntes);
    assert.equal(statusDe(dir), 'Arquivado');
  }
});

test('an approved learning that would break the Kit is refused, and nothing changes', () => {
  const dir = estudio();
  const kitAntes = fs.readFileSync(path.join(projetoDir(dir), 'kit.json'), 'utf8');
  const quebrado = { descricao: 'Legenda em cor nenhuma.', kit: { legendas: { cor: 'amarelo' } }, aprovado: true };
  const { out } = run('arquivar', dir, PROJETO, VIDEO, JSON.stringify({ aprendizados: [LEGENDA, quebrado] }));
  assert.equal(out.archived, false);
  assert.equal(out.reason, 'invalid-learning');
  assert.match(out.errors.join('\n'), /legendas\.cor/);
  assert.equal(fs.readFileSync(path.join(projetoDir(dir), 'kit.json'), 'utf8'), kitAntes);
  assert.equal(fs.existsSync(path.join(videoDir(dir), 'aprendizados.json')), false);
  assert.equal(statusDe(dir), 'Entregue');
});

test('only a delivered Vídeo is archived, once', () => {
  const emAndamento = estudio('Construção');
  assert.equal(run('arquivar', emAndamento, PROJETO, VIDEO, '{"aprendizados": []}').out.reason, 'not-delivered');
  const dir = estudio();
  assert.equal(run('arquivar', dir, PROJETO, VIDEO, '{"aprendizados": []}').out.archived, true);
  assert.equal(run('arquivar', dir, PROJETO, VIDEO, '{"aprendizados": []}').out.reason, 'not-delivered');
  assert.equal(run('arquivar', dir, PROJETO, 'Nenhum', '{"aprendizados": []}').out.reason, 'unknown-video');
});

test('each learning needs its description, its Kit change and her answer; the approval stamp is never a learning', () => {
  const dir = estudio();
  for (const input of [
    'not json',
    '{}',
    JSON.stringify({ aprendizados: [{ kit: {}, aprovado: true }] }),
    JSON.stringify({ aprendizados: [{ descricao: 'x', kit: {} }] }),
    JSON.stringify({ aprendizados: [{ descricao: 'x', kit: 'fazer mais', aprovado: true }] }),
    JSON.stringify({ aprendizados: [{ descricao: 'x', kit: { aprovadoEm: null }, aprovado: true }] }),
  ]) {
    const { out } = run('arquivar', dir, PROJETO, VIDEO, input);
    assert.equal(out.archived, false, input);
    assert.equal(out.reason, 'invalid-input', input);
  }
  assert.equal(statusDe(dir), 'Entregue');
});
