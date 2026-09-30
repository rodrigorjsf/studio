// Seam 1 — the deterministic CLI, for Projetos and their Kit de marca (`novo-projeto`,
// `aprovar-kit`, and the Kit schema as `estado` validates it). Drives
// plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// exit code and the files it produces.
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

// A fresh Estúdio with a Perfil, under a path with spaces and accents as on her Mac.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio projeto '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.writeFileSync(path.join(dir, 'perfil.md'), '---\nautonomia: media\n---\n# Perfil\n');
  return dir;
}

const projetoDir = (dir, nome) => path.join(dir, 'projetos', nome);
// Stands in for the Entrevistador answering every section of the Grilling.
function answerBriefing(dir, nome) {
  const file = path.join(projetoDir(dir, nome), 'projeto.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
}
const readKit = (dir, nome) => JSON.parse(fs.readFileSync(path.join(projetoDir(dir, nome), 'kit.json'), 'utf8'));

test('novo-projeto creates the briefing, a Kit with the defaults and the assets folder, and the Grilling comes next', () => {
  const dir = estudio();
  const { code, out } = run('novo-projeto', dir, 'Minha Empresa');
  assert.equal(code, 0);
  assert.equal(out.created, true);
  assert.equal(out.projeto, 'Minha Empresa');

  const kit = readKit(dir, 'Minha Empresa');
  assert.equal(kit.formato, '9:16');
  assert.equal(kit.musica.politica, 'no-app');
  assert.equal(kit.aprovadoEm, null);
  assert.ok(fs.statSync(path.join(projetoDir(dir, 'Minha Empresa'), 'kit')).isDirectory());
  assert.ok(fs.existsSync(path.join(projetoDir(dir, 'Minha Empresa'), 'projeto.md')));

  const state = run('estado', dir).out;
  assert.deepEqual(state.errors, []);
  assert.deepEqual(state.projetos, [{ id: 'Minha Empresa', briefing: 'incompleto', kit: 'aguardando-aprovacao', videos: [] }]);
  assert.deepEqual(state.nextStep, { action: 'concluir-projeto', projeto: 'Minha Empresa' });
});

test('estado validates the Kit schema field by field and holds the Projeto until it is fixed', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Pessoal');
  const kit = readKit(dir, 'Pessoal');
  kit.formato = '4:3';
  kit.cores.destaque = 'amarelo';
  delete kit.cores.fundo;
  kit.legendas.palavrasPorVez = 0;
  kit.musica.politica = 'biblioteca';
  kit.creditos.porVideo = -5;
  kit.entregaveis.formatos = [];
  kit.ativos.logos = ['kit/logo.png', '../fora.png'];
  delete kit.glossario;
  fs.writeFileSync(path.join(projetoDir(dir, 'Pessoal'), 'kit.json'), JSON.stringify(kit));

  const { out } = run('estado', dir);
  assert.deepEqual(out.errors.map((e) => e.file), Array(10).fill('projetos/Pessoal/kit.json'));
  assert.deepEqual(out.errors.map((e) => e.message), [
    'formato must be one of: 9:16, 16:9, 1:1',
    'cores.fundo is missing',
    'cores.destaque must be a color like "#1A2B3C"',
    'legendas.palavrasPorVez must be a whole number above 0',
    'musica.politica must be one of: no-app, arquivo-dela, sem-musica',
    'entregaveis.formatos must list at least one',
    'creditos.porVideo must be a number of credits (0 or more) or null',
    'glossario is missing',
    'ativos.logos[0] file not found: kit/logo.png',
    'ativos.logos[1] must be a path inside the "kit/" folder, like "kit/logo.png"',
  ]);
  assert.equal(out.projetos[0].kit, 'invalido');
  assert.deepEqual(out.nextStep, { action: 'corrigir-erros' });
});

test('reference images and brand assets stored in the kit folder make a valid Kit', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Pessoal');
  const assets = path.join(projetoDir(dir, 'Pessoal'), 'kit');
  fs.mkdirSync(path.join(assets, 'referencias'));
  for (const file of ['referencias/estilo que eu amo.jpg', 'logo.png', 'Fonte Título.ttf', 'cartão final.mp4']) {
    fs.writeFileSync(path.join(assets, file), 'bytes');
  }
  const kit = readKit(dir, 'Pessoal');
  kit.referencias = [{ arquivo: 'kit/referencias/estilo que eu amo.jpg', nota: 'cores quentes e legenda grande' }];
  kit.ativos = { logos: ['kit/logo.png'], fontes: ['kit/Fonte Título.ttf'], cartaoFinal: 'kit/cartão final.mp4', outros: [] };
  kit.tipografia.titulo.arquivo = 'kit/Fonte Título.ttf';
  kit.zonaDoRosto = { 'selfie na mesa': { x: 0.3, y: 0.1, largura: 0.4, altura: 0.35 } };
  fs.writeFileSync(path.join(projetoDir(dir, 'Pessoal'), 'kit.json'), JSON.stringify(kit));

  const { out } = run('estado', dir);
  assert.deepEqual(out.errors, []);
  assert.equal(out.projetos[0].kit, 'aguardando-aprovacao');
});

test('the Kit approval Gate: an invalid Kit is refused, a valid one is approved and the Projeto becomes usable', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Minha Empresa');
  answerBriefing(dir, 'Minha Empresa');
  const kitFile = path.join(projetoDir(dir, 'Minha Empresa'), 'kit.json');
  const valid = fs.readFileSync(kitFile, 'utf8');
  fs.writeFileSync(kitFile, valid.replace('"9:16"', '"quadrado"'));

  let { code, out } = run('aprovar-kit', dir, 'Minha Empresa');
  assert.equal(code, 0);
  assert.equal(out.approved, false);
  assert.equal(out.reason, 'invalid');
  assert.deepEqual(out.errors, ['kit.json: formato must be one of: 9:16, 16:9, 1:1']);
  assert.equal(readKit(dir, 'Minha Empresa').aprovadoEm, null);

  fs.writeFileSync(kitFile, valid);
  ({ code, out } = run('aprovar-kit', dir, 'Minha Empresa'));
  assert.equal(out.approved, true);
  assert.equal(readKit(dir, 'Minha Empresa').aprovadoEm, out.aprovadoEm);
  assert.equal(readKit(dir, 'Minha Empresa').formato, '9:16');

  const state = run('estado', dir).out;
  assert.equal(state.projetos[0].kit, 'ok');
  assert.deepEqual(state.nextStep, { action: 'novo-video' });
});

test('aprovar-kit refuses a Projeto that does not exist or has no briefing', () => {
  const dir = estudio();
  assert.deepEqual(run('aprovar-kit', dir, 'Fantasma').out, { approved: false, reason: 'unknown-projeto' });
  run('novo-projeto', dir, 'Pessoal');
  fs.rmSync(path.join(projetoDir(dir, 'Pessoal'), 'projeto.md'));
  const { out } = run('aprovar-kit', dir, 'Pessoal');
  assert.equal(out.approved, false);
  assert.deepEqual(out.errors, ['projeto.md: missing: every Projeto needs its briefing document']);
});

test('several Projetos coexist in one Estúdio, each with its own Kit and its own Gate', () => {
  const dir = estudio();
  assert.equal(run('novo-projeto', dir, 'Minha Empresa').out.created, true);
  assert.equal(run('novo-projeto', dir, 'Instagram Pessoal').out.created, true);
  answerBriefing(dir, 'Minha Empresa');
  answerBriefing(dir, 'Instagram Pessoal');
  run('aprovar-kit', dir, 'Minha Empresa');

  const kitFile = path.join(projetoDir(dir, 'Instagram Pessoal'), 'kit.json');
  const kit = readKit(dir, 'Instagram Pessoal');
  kit.cores.primaria = '#D97757';
  fs.writeFileSync(kitFile, JSON.stringify(kit));

  let state = run('estado', dir).out;
  assert.deepEqual(state.errors, []);
  assert.deepEqual(state.projetos.map((p) => [p.id, p.kit]), [
    ['Instagram Pessoal', 'aguardando-aprovacao'],
    ['Minha Empresa', 'ok'],
  ]);
  assert.deepEqual(state.nextStep, { action: 'aprovar-kit', projeto: 'Instagram Pessoal' });
  assert.equal(readKit(dir, 'Minha Empresa').cores.primaria, '#111111');

  run('aprovar-kit', dir, 'Instagram Pessoal');
  state = run('estado', dir).out;
  assert.deepEqual(state.projetos.map((p) => p.kit), ['ok', 'ok']);
  assert.deepEqual(state.nextStep, { action: 'novo-video' });
});

test('novo-projeto never overwrites a Projeto, even one whose name a Mac stored decomposed', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Lançamentos');
  const kitFile = path.join(projetoDir(dir, 'Lançamentos'), 'kit.json');
  fs.writeFileSync(kitFile, fs.readFileSync(kitFile, 'utf8').replace('"#111111"', '"#222222"'));
  const before = fs.readFileSync(kitFile, 'utf8');

  for (const nome of ['Lançamentos', 'Lançamentos'.normalize('NFD')]) {
    const { code, out } = run('novo-projeto', dir, nome);
    assert.equal(code, 0);
    assert.deepEqual(out, { created: false, reason: 'already-exists', projeto: 'Lançamentos' });
  }
  assert.equal(fs.readFileSync(kitFile, 'utf8'), before);
});

test('novo-projeto refuses names that are not a single portable folder name, and folders that are not an Estúdio', () => {
  const dir = estudio();
  for (const nome of ['', '  ', '../fora', 'a/b', 'a\\b', 'Empresa: nova', '.oculto', 'fim.']) {
    const { out } = run('novo-projeto', dir, nome);
    assert.equal(out.created, false, `accepted "${nome}"`);
    assert.equal(out.reason, 'invalid-name', `"${nome}"`);
  }
  assert.deepEqual(fs.readdirSync(path.join(dir, 'projetos')), []);

  const plain = path.dirname(dir);
  assert.deepEqual(run('novo-projeto', plain, 'Empresa').out, { created: false, reason: 'not-estudio' });
});

test('novo-projeto without a name is a usage error', () => {
  const r = spawnSync(process.execPath, [cli, 'novo-projeto', estudio()], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(JSON.parse(r.stdout).error, /novo-projeto "<folder>" "<projeto>"/);
});

test('the briefing holds one pt-BR section per topic of the Projeto Grilling catalogue', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Minha Empresa');
  const text = fs.readFileSync(path.join(projetoDir(dir, 'Minha Empresa'), 'projeto.md'), 'utf8');
  const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  // The catalogue as the spec lists it: business, audience, tone, references, camera
  // behavior, framing, Prints, image interaction, animations, pacing, captions, color,
  // sound, music policy, deliverables, credit budget.
  assert.deepEqual(headings, [
    'Negócio', 'Público', 'Tom de voz', 'Referências', 'Comportamento de câmera', 'Enquadramento',
    'Prints', 'Interação com imagens', 'Animações', 'Ritmo', 'Legendas', 'Cores', 'Som', 'Música',
    'Entregáveis', 'Orçamento de créditos',
  ]);
  assert.match(text, /^---\nnome: "Minha Empresa"\n/);
});

test('an interrupted Projeto is completed: novo-projeto adds only the missing files and keeps her answers', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Pessoal');
  const briefingFile = path.join(projetoDir(dir, 'Pessoal'), 'projeto.md');
  fs.writeFileSync(briefingFile, '---\nnome: Pessoal\n---\n## Negócio\n\nReceitas de família.\n');
  fs.rmSync(path.join(projetoDir(dir, 'Pessoal'), 'kit.json'));
  assert.deepEqual(run('estado', dir).out.nextStep, { action: 'concluir-projeto', projeto: 'Pessoal' });

  const { out } = run('novo-projeto', dir, 'Pessoal');
  assert.deepEqual(out, { created: true, resumed: true, projeto: 'Pessoal', path: 'projetos/Pessoal' });
  assert.equal(fs.readFileSync(briefingFile, 'utf8'), '---\nnome: Pessoal\n---\n## Negócio\n\nReceitas de família.\n');
  assert.equal(readKit(dir, 'Pessoal').formato, '9:16');
  assert.deepEqual(run('estado', dir).out.nextStep, { action: 'aprovar-kit', projeto: 'Pessoal' });
});

test('a Grilling interrupted midway is resumed, not sent to approval: placeholders left in the briefing hold the Gate', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Pessoal');
  let state = run('estado', dir).out;
  assert.equal(state.projetos[0].briefing, 'incompleto');
  assert.deepEqual(state.nextStep, { action: 'concluir-projeto', projeto: 'Pessoal' });
  const refused = run('aprovar-kit', dir, 'Pessoal').out;
  assert.equal(refused.approved, false);
  assert.deepEqual(refused.errors, ['projeto.md: 16 sections still to fill in the interview']);

  answerBriefing(dir, 'Pessoal');
  state = run('estado', dir).out;
  assert.equal(state.projetos[0].briefing, 'completo');
  assert.deepEqual(state.nextStep, { action: 'aprovar-kit', projeto: 'Pessoal' });
  assert.equal(run('aprovar-kit', dir, 'Pessoal').out.approved, true);
});

test('the default Formato must be one of the Formatos the Projeto delivers', () => {
  const dir = estudio();
  run('novo-projeto', dir, 'Pessoal');
  const kit = readKit(dir, 'Pessoal');
  kit.formato = '16:9';
  fs.writeFileSync(path.join(projetoDir(dir, 'Pessoal'), 'kit.json'), JSON.stringify(kit));
  assert.deepEqual(run('estado', dir).out.errors.map((e) => e.message), ['formato "16:9" must be listed in entregaveis.formatos']);
});
