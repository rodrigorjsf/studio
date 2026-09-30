// Seam 1 — the deterministic CLI (`estado`, `criar`). Drives
// plugin/estudio/scripts/estudio.mjs as a process against fixture Estúdio folders and
// asserts only on its JSON output, exit code and the files it produces.
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

// Every fixture runs from a path with spaces and accents, as on the Criadora's Mac.
function folder(fixtureName, leaf = 'Meu Estúdio de Vídeos') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio teste '));
  tempRoots.push(root);
  const dir = path.join(root, leaf);
  if (fixtureName) fs.cpSync(path.join(fixtures, fixtureName), dir, { recursive: true });
  else fs.mkdirSync(dir);
  return dir;
}

function run(command, dir) {
  const r = spawnSync(process.execPath, [cli, command, dir], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

test('an empty folder is not an Estúdio yet and the next step is to create one', () => {
  const { code, out } = run('estado', folder(null));
  assert.equal(code, 0);
  assert.equal(out.isEstudio, false);
  assert.equal(out.isEmpty, true);
  assert.deepEqual(out.errors, []);
  assert.equal(out.nextStep.action, 'criar-estudio');
});

test('criar turns an empty folder into an Estúdio: marker, layout and Remotion template', () => {
  const dir = folder(null);
  const { code, out } = run('criar', dir);
  assert.equal(code, 0);
  assert.equal(out.created, true);

  const marker = JSON.parse(fs.readFileSync(path.join(dir, 'estudio.json'), 'utf8'));
  assert.equal(marker.schemaVersion, 1);
  assert.ok(fs.statSync(path.join(dir, 'projetos')).isDirectory());
  for (const file of ['package.json', 'tsconfig.json', 'remotion.config.ts', 'src/index.ts', 'src/Root.tsx',
    'src/_shared/synchronized-split.tsx', 'src/estilos/VerticalLegendas.tsx']) {
    assert.ok(fs.existsSync(path.join(dir, file)), `missing ${file}`);
  }
  assert.ok(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).dependencies.remotion);

  const after = run('estado', dir).out;
  assert.equal(after.isEstudio, true);
  assert.deepEqual(after.errors, []);
  assert.equal(after.nextStep.action, 'perfil');
});

test('an existing Estúdio is recognized and never re-scaffolded', () => {
  const dir = folder(null);
  run('criar', dir);
  const marker = fs.readFileSync(path.join(dir, 'estudio.json'), 'utf8');
  fs.writeFileSync(path.join(dir, 'src', 'Root.tsx'), '// her own compositions\n');
  fs.rmSync(path.join(dir, 'tsconfig.json'));

  const { code, out } = run('criar', dir);
  assert.equal(code, 0);
  assert.equal(out.created, false);
  assert.equal(out.reason, 'already-estudio');
  assert.equal(fs.readFileSync(path.join(dir, 'estudio.json'), 'utf8'), marker);
  assert.equal(fs.readFileSync(path.join(dir, 'src', 'Root.tsx'), 'utf8'), '// her own compositions\n');
  assert.equal(fs.existsSync(path.join(dir, 'tsconfig.json')), false);
  assert.equal(run('estado', dir).out.isEstudio, true);
});

test('a folder with her own files is not empty, and criar keeps every file she had', () => {
  const dir = folder(null);
  fs.writeFileSync(path.join(dir, 'gravação 1.mp4'), 'her recording');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"hers"}');
  fs.writeFileSync(path.join(dir, '.DS_Store'), '');

  const before = run('estado', dir).out;
  assert.equal(before.isEstudio, false);
  assert.equal(before.isEmpty, false);
  assert.equal(before.nextStep.action, 'criar-estudio');

  assert.equal(run('criar', dir).out.created, true);
  assert.equal(fs.readFileSync(path.join(dir, 'gravação 1.mp4'), 'utf8'), 'her recording');
  assert.equal(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), '{"name":"hers"}');
  assert.ok(fs.existsSync(path.join(dir, 'src', 'Root.tsx')));
});

test('hidden and system files do not make a folder non-empty', () => {
  const dir = folder(null);
  for (const name of ['.DS_Store', '.claude', 'Thumbs.db', 'desktop.ini']) fs.writeFileSync(path.join(dir, name), '');
  assert.equal(run('estado', dir).out.isEmpty, true);
});

test('a valid Estúdio reports each Projeto and Vídeo, what waits for the Criadora and the next step', () => {
  const { code, out } = run('estado', folder('valido'));
  assert.equal(code, 0);
  assert.equal(out.isEstudio, true);
  assert.deepEqual(out.errors, []);
  assert.equal(out.perfil.present, true);
  // Vídeos from before the ingest existed: nothing ingested, no briefing section left open, no Plano.
  // No Página Notion linked anywhere: zero links is a valid choice.
  const semNotion = { paginas: 0, resumo: 'sem-paginas' };
  const pre = {
    briefing: 'completo', ingest: { transcricao: false, zonaDoRosto: false }, plano: 'ausente', quadros: 'ausentes', versao: null, notion: semNotion,
  };
  assert.deepEqual(out.projetos, [
    {
      id: 'Minha Empresa', briefing: 'completo', kit: 'ok', notion: semNotion,
      videos: [
        { id: 'Dica rápida', status: 'Construção', rodada: null, nivel: 1, ...pre, waitingForCriadora: false },
        { id: 'Lançamento', status: 'Revisão', rodada: 2, nivel: 1, ...pre, waitingForCriadora: true },
      ],
    },
    {
      id: 'Pessoal', briefing: 'completo', kit: 'ok', notion: semNotion,
      videos: [{ id: 'Receita antiga', status: 'Arquivado', rodada: 1, nivel: 2, ...pre, waitingForCriadora: false }],
    },
  ]);
  assert.deepEqual(out.waiting, [{ projeto: 'Minha Empresa', video: 'Lançamento', status: 'Revisão' }]);
  assert.deepEqual(out.nextStep, { action: 'continuar-video', projeto: 'Minha Empresa', video: 'Lançamento', status: 'Revisão' });
});

test('malformed documents come back as validation errors, file by file, and must be fixed first', () => {
  const { code, out } = run('estado', folder('malformado'));
  assert.equal(code, 0);
  assert.equal(out.isEstudio, true);
  const byFile = (file) => out.errors.filter((e) => e.file === file).map((e) => e.message);
  assert.match(byFile('perfil.md').join(), /not closed/);
  assert.match(byFile('projetos/Empresa/kit.json').join(), /not valid JSON/);
  assert.match(byFile('projetos/Empresa/videos/Vídeo sem status/video.md').join(), /status null is not one of/);
  const invented = byFile('projetos/Empresa/videos/Status inventado/video.md').join('\n');
  assert.match(invented, /status "Pronto" is not one of/);
  assert.match(invented, /rodada "dois" must be a whole number/);
  assert.match(invented, /nivel 3 must be 1 or 2/);
  assert.match(byFile('projetos/Sem briefing/projeto.md').join(), /missing/);
  assert.equal(out.errors.length, 7);
  assert.deepEqual(out.nextStep, { action: 'corrigir-erros' });
});

test('a marker from a newer schema version is reported, not silently read', () => {
  const dir = folder('valido');
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 2}');
  const { out } = run('estado', dir);
  assert.deepEqual(out.errors, [{ file: 'estudio.json', message: 'schemaVersion 2 is not supported (expected 1)' }]);
  fs.writeFileSync(path.join(dir, 'estudio.json'), 'not json');
  assert.match(run('estado', dir).out.errors[0].message, /not valid JSON/);
});

test('the next step walks the Esteira: first Projeto, unfinished Kit, open Gate, Vídeo in progress, new Vídeo', () => {
  const dir = folder('valido');
  const projetos = path.join(dir, 'projetos');
  const doc = (projeto, video) => path.join(projetos, projeto, 'videos', video, 'video.md');

  fs.writeFileSync(doc('Minha Empresa', 'Lançamento'), '---\nstatus: Planejamento\ngate: aberto\n---\n');
  let out = run('estado', dir).out;
  assert.deepEqual(out.waiting, [{ projeto: 'Minha Empresa', video: 'Lançamento', status: 'Planejamento' }]);
  assert.equal(out.nextStep.video, 'Lançamento');

  fs.writeFileSync(doc('Minha Empresa', 'Lançamento'), '---\nstatus: Planejamento\n---\n');
  out = run('estado', dir).out;
  assert.deepEqual(out.waiting, []);
  assert.deepEqual(out.nextStep, { action: 'continuar-video', projeto: 'Minha Empresa', video: 'Dica rápida', status: 'Construção' });

  for (const video of ['Lançamento', 'Dica rápida']) fs.writeFileSync(doc('Minha Empresa', video), '---\nstatus: Arquivado\n---\n');
  assert.deepEqual(run('estado', dir).out.nextStep, { action: 'novo-video' });

  fs.rmSync(path.join(projetos, 'Pessoal', 'kit.json'));
  out = run('estado', dir).out;
  assert.equal(out.projetos.find((p) => p.id === 'Pessoal').kit, 'pendente');
  assert.deepEqual(out.nextStep, { action: 'concluir-projeto', projeto: 'Pessoal' });

  fs.rmSync(projetos, { recursive: true });
  fs.mkdirSync(projetos);
  assert.deepEqual(run('estado', dir).out.nextStep, { action: 'novo-projeto' });
});

test('names with decomposed accents, as a Mac stores them, are reported composed', () => {
  const dir = folder('valido', 'Estúdio da Criadora'.normalize('NFD'));
  const empresa = path.join(dir, 'projetos', 'Minha Empresa', 'videos');
  fs.renameSync(path.join(empresa, 'Lançamento'), path.join(empresa, 'Lançamento'.normalize('NFD')));
  const { out } = run('estado', dir);
  assert.deepEqual(out.errors, []);
  assert.equal(out.nextStep.video, 'Lançamento'.normalize('NFC'));
});

test('a usage error exits 2 with a JSON error', () => {
  const r = spawnSync(process.execPath, [cli, 'nada'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(JSON.parse(r.stdout).error, /usage/);
});

test('a folder that does not exist exits 2 with a JSON error', () => {
  const r = spawnSync(process.execPath, [cli, 'estado', path.join(folder(null), 'não existe')], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(JSON.parse(r.stdout).error, /not a folder/);
});

test('documents saved with Windows line endings read the same', () => {
  const dir = folder('valido');
  const doc = path.join(dir, 'projetos', 'Minha Empresa', 'videos', 'Lançamento', 'video.md');
  fs.writeFileSync(doc, '---\r\nstatus: Revisão\r\nrodada: 3\r\n---\r\n# Lançamento\r\n');
  const { out } = run('estado', dir);
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.waiting, [{ projeto: 'Minha Empresa', video: 'Lançamento', status: 'Revisão' }]);
});

test('a delivered Vídeo is finished: it waits for nobody and a new Vídeo comes next', () => {
  const dir = folder('valido');
  const videos = path.join(dir, 'projetos', 'Minha Empresa', 'videos');
  fs.writeFileSync(path.join(videos, 'Lançamento', 'video.md'), '---\nstatus: Entregue\n---\n');
  fs.writeFileSync(path.join(videos, 'Dica rápida', 'video.md'), '---\nstatus: Arquivado\n---\n');
  const { out } = run('estado', dir);
  assert.deepEqual(out.waiting, []);
  assert.deepEqual(out.nextStep, { action: 'novo-video' });
});

test('a Kit that is not valid JSON is reported as invalid, not ok', () => {
  const { out } = run('estado', folder('malformado'));
  assert.equal(out.projetos.find((p) => p.id === 'Empresa').kit, 'invalido');
  assert.equal(out.projetos.find((p) => p.id === 'Sem briefing').kit, 'ok');
});
