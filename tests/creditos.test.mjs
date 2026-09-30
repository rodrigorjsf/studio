// Seam 1 — the deterministic CLI, for Nível 2's Higgsfield credits (ticket #15):
// `aprovar-creditos` records her credit Gate (the balance she has, checked against the Plano's
// estimate and the Kit's budget) and `gastar-creditos` holds every generation before it is paid:
// the balance must cover it, its prompt must forbid text in the image, and spending about 20%
// over the approved estimate stops the work until she approves again.
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// the Vídeo's record as `estado` reports it, and the files it writes.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseFrontmatter } from '../plugin/estudio/scripts/lib/frontmatter.mjs';

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
const SEM_TEXTO = 'Absolutely no text, no letters, no numbers, no logos, no watermark.';

// A fresh Estúdio (a path with spaces and accents, as on her Mac) with one approved Projeto and one
// Vídeo whose Plano she approved: Nível 2, in Construção, the Plano expecting `estimados` credits.
function videoNivel2({ estimados = 100, nivel = 2, planoAprovado = true, creditos } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio créditos '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const projetoDir = path.join(dir, 'projetos', PROJETO);
  const briefing = path.join(projetoDir, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  if (creditos) {
    const kitFile = path.join(projetoDir, 'kit.json');
    const kit = JSON.parse(fs.readFileSync(kitFile, 'utf8'));
    fs.writeFileSync(kitFile, JSON.stringify({ ...kit, creditos }, null, 2));
  }
  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  const video = path.join(projetoDir, 'videos', VIDEO);
  fs.writeFileSync(path.join(video, 'plano.json'), JSON.stringify({
    schemaVersion: 1,
    tempoEstimadoMin: 30,
    creditosEstimados: estimados,
    aprovadoEm: planoAprovado ? '2026-09-30T10:00:00.000Z' : null,
    quadrosAprovadosEm: planoAprovado ? '2026-09-30T10:00:00.000Z' : null,
  }, null, 2));
  const status = planoAprovado ? 'Construção' : 'Planejamento';
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, JSON.stringify({ nivel, status })).out.recorded, true);
  return { dir, video };
}

const aprovar = (dir, input) => run('aprovar-creditos', dir, PROJETO, VIDEO, JSON.stringify(input)).out;
// The Vídeo's record, as the frontmatter of video.md holds it.
const registro = (video) => parseFrontmatter(fs.readFileSync(path.join(video, 'video.md'), 'utf8'));

test('her credit Gate records the Plano\'s estimate once her balance covers it, and counts the Gate', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  const out = aprovar(dir, { saldo: 500 });
  assert.equal(out.approved, true, JSON.stringify(out));
  assert.equal(out.creditosEstimados, 100);
  assert.equal(out.limite, 120);
  assert.equal(out.saldo, 500);
  assert.equal(out.gates, 1);
  const record = registro(video);
  assert.equal(record.creditosEstimados, 100);
  assert.equal(record.creditosGastos, 0);
  assert.ok(!Number.isNaN(Date.parse(record.creditosAprovadosEm)));
  assert.equal(record.gate, null);
  assert.deepEqual(run('estado', dir).out.errors, []);
});

test('a balance below the estimate is refused before anything is spent, and nothing changes', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  const out = aprovar(dir, { saldo: 99 });
  assert.equal(out.approved, false);
  assert.equal(out.reason, 'saldo-insuficiente');
  assert.equal(out.saldo, 99);
  assert.equal(out.creditosEstimados, 100);
  const record = registro(video);
  assert.equal(record.creditosAprovadosEm, undefined);
  assert.equal(record.gates, 0);
});

test('only a Nível 2 Vídeo whose Plano she approved reaches the credit Gate', () => {
  const nivel1 = videoNivel2({ nivel: 1 });
  assert.equal(aprovar(nivel1.dir, { saldo: 500 }).reason, 'not-nivel-2');
  const rascunho = videoNivel2({ planoAprovado: false });
  assert.equal(aprovar(rascunho.dir, { saldo: 500 }).reason, 'plano-not-approved');
  assert.equal(registro(rascunho.video).gates, 0);
});

test('an estimate above the Kit\'s budget per Vídeo is refused: she set it so she never overspends', () => {
  const { dir, video } = videoNivel2({ estimados: 100, creditos: { porVideo: 80, porMes: null } });
  const out = aprovar(dir, { saldo: 500 });
  assert.equal(out.approved, false);
  assert.equal(out.reason, 'acima-do-orcamento');
  assert.deepEqual(out.orcamento, { porVideo: 80, porMes: null });
  assert.equal(registro(video).creditosAprovadosEm, undefined);
  assert.equal(aprovar(videoNivel2({ estimados: 80, creditos: { porVideo: 80, porMes: null } }).dir, { saldo: 500 }).approved, true);
});

test('the monthly budget counts the credits her other Vídeos of the Projeto were approved for this month', () => {
  const { dir } = videoNivel2({ estimados: 60, creditos: { porVideo: null, porMes: 100 } });
  // Another Vídeo of the same Projeto, approved for 50 credits this month.
  const outro = path.join(dir, 'projetos', PROJETO, 'videos', 'Outro vídeo');
  fs.mkdirSync(outro);
  const agora = new Date().toISOString();
  fs.writeFileSync(path.join(outro, 'video.md'),
    `---\nstatus: Entregue\nnivel: 2\ncreditosEstimados: 50\ncreditosGastos: 45\ncreditosAprovadosEm: ${agora}\n---\n# Outro vídeo\n`);
  const out = aprovar(dir, { saldo: 500 });
  assert.equal(out.approved, false);
  assert.equal(out.reason, 'acima-do-orcamento');
  assert.equal(aprovar(dir, { saldo: 500, creditosEstimados: 50 }).approved, true);
});

const gastar = (dir, input) => run('gastar-creditos', dir, PROJETO, VIDEO, JSON.stringify(input)).out;
const geracao = (arquivo, creditos, saldo = 500, prompt = `A paper-cut kitchen timer on a cream desk. ${SEM_TEXTO}`) => ({
  arquivo, creditos, saldo, modelo: 'nano_banana_pro', prompt,
});
const ledger = (video) => JSON.parse(fs.readFileSync(path.join(video, 'gerados', 'gerados.json'), 'utf8'));

test('nothing is generated before her credit Gate', () => {
  const { dir, video } = videoNivel2();
  const out = gastar(dir, geracao('gerados/01_timer.png', 2));
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'sem-aprovacao');
  assert.equal(registro(video).creditosGastos, 0);
  assert.equal(fs.existsSync(path.join(video, 'gerados', 'gerados.json')), false);
});

test('an approved generation is recorded before it is paid, and its file goes into the Vídeo folder', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  aprovar(dir, { saldo: 500 });
  const out = gastar(dir, geracao('gerados/01_timer.png', 30, 470));
  assert.equal(out.authorized, true, JSON.stringify(out));
  assert.equal(out.creditosGastos, 30);
  assert.equal(out.limite, 120);
  assert.equal(out.restante, 90);
  assert.equal(out.destino, path.join(video, 'gerados', '01_timer.png'));
  assert.ok(fs.statSync(path.join(video, 'gerados')).isDirectory());
  assert.equal(registro(video).creditosGastos, 30);
  const [entrada] = ledger(video);
  assert.equal(entrada.arquivo, 'gerados/01_timer.png');
  assert.equal(entrada.creditos, 30);
  assert.equal(entrada.modelo, 'nano_banana_pro');
  assert.match(entrada.prompt, /no text/);
  assert.deepEqual(run('estado', dir).out.errors, []);
});

test('the balance is read again before each generation: one it does not cover is refused', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  aprovar(dir, { saldo: 500 });
  const out = gastar(dir, geracao('gerados/01_timer.png', 30, 29));
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'saldo-insuficiente');
  assert.equal(registro(video).creditosGastos, 0);
});

test('a prompt that does not forbid text in the image is refused: all text goes in at the montage', () => {
  const { dir, video } = videoNivel2();
  aprovar(dir, { saldo: 500 });
  const out = gastar(dir, geracao('gerados/01_timer.png', 2, 500, 'A poster that says "Promoção" in big letters.'));
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'prompt-permite-texto');
  assert.equal(gastar(dir, geracao('gerados/01_timer.png', 2, 500, 'Um timer de papel. Sem texto, sem letras.')).authorized, true);
  assert.equal(registro(video).creditosGastos, 2);
});

test('spending up to ~20% over the estimate goes on; the generation that would pass it stops the work', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  aprovar(dir, { saldo: 500 });
  assert.equal(gastar(dir, geracao('gerados/01_fundo.png', 100)).authorized, true);
  assert.equal(gastar(dir, geracao('gerados/02_refeito.png', 20)).authorized, true);
  const out = gastar(dir, geracao('gerados/03_broll.mp4', 1));
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'acima-do-limite');
  assert.equal(out.creditosGastos, 120);
  assert.equal(out.limite, 120);
  assert.equal(registro(video).creditosGastos, 120);
  // Stopped: the Vídeo waits for her, and even a small generation waits for her new approval.
  const noEstado = run('estado', dir).out.projetos[0].videos[0];
  assert.equal(noEstado.waitingForCriadora, true);
  assert.equal(gastar(dir, geracao('gerados/03_broll.mp4', 0.5)).reason, 'aguardando-aprovacao');

  // She approves a new estimate, never below what was already spent; the work goes on.
  assert.equal(aprovar(dir, { saldo: 380, creditosEstimados: 110 }).reason, 'abaixo-do-gasto');
  const nova = aprovar(dir, { saldo: 380, creditosEstimados: 150 });
  assert.equal(nova.approved, true);
  assert.equal(nova.creditosGastos, 120);
  assert.equal(gastar(dir, geracao('gerados/03_broll.mp4', 1, 380)).authorized, true);
});

test('an estimate of zero credits lets nothing be spent', () => {
  const { dir } = videoNivel2({ estimados: 0 });
  assert.equal(aprovar(dir, { saldo: 0 }).approved, true);
  assert.equal(gastar(dir, geracao('gerados/01_timer.png', 1)).reason, 'acima-do-limite');
});

test('only the generation\'s own fields are written: a secret or any other key is refused unwritten', () => {
  const { dir, video } = videoNivel2();
  aprovar(dir, { saldo: 500 });
  const out = gastar(dir, { ...geracao('gerados/01_timer.png', 2), apiKey: 'hf-secret-123' });
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'invalid-input');
  assert.doesNotMatch(JSON.stringify(out), /hf-secret-123/);
  assert.equal(fs.existsSync(path.join(video, 'gerados', 'gerados.json')), false);
  assert.doesNotMatch(fs.readFileSync(path.join(video, 'video.md'), 'utf8'), /hf-secret-123/);
});

test('each generated file has its own name inside the Vídeo\'s gerados folder, never elsewhere or twice', () => {
  const { dir } = videoNivel2();
  aprovar(dir, { saldo: 500 });
  for (const arquivo of ['../gravação.png', 'gerados/../original/x.png', 'prints/x.png', 'gerados/sem-extensao', 'gerados/a/b.png']) {
    assert.equal(gastar(dir, geracao(arquivo, 2)).reason, 'invalid-input', arquivo);
  }
  assert.equal(gastar(dir, geracao('gerados/01_timer.png', 2)).authorized, true);
  assert.equal(gastar(dir, geracao('gerados/01_timer.png', 2)).reason, 'arquivo-repetido');
});

test('estado holds the credit Gate\'s date to the Vídeo document\'s schema', () => {
  const { dir, video } = videoNivel2();
  const doc = path.join(video, 'video.md');
  fs.writeFileSync(doc, fs.readFileSync(doc, 'utf8').replace('creditosGastos: 0', 'creditosGastos: 0\ncreditosAprovadosEm: ontem'));
  const { errors } = run('estado', dir).out;
  assert.deepEqual(errors.map((e) => e.message), ['creditosAprovadosEm "ontem" must be a date (ISO)']);
});
