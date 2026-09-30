// Seam 1 — the deterministic CLI, for the Criadora's review in Rodadas (ticket #11):
// `nova-versao` gives the Motion designer the next versioned review folder (v01, v02…),
// `abrir-revisao` opens her review of that version's stills (Status Revisão, Rodada N) and
// `decidir-revisao` records one of her three decisions with her notes consolidated into one list.
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// the Vídeo's record as `estado` reports it, and the files it writes.
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

// A fresh Estúdio (a path with spaces and accents, as on her Mac) with one approved Projeto and
// one Vídeo whose Plano is approved: the Status the build starts from.
function videoEmConstrucao() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio revisão '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const briefing = path.join(dir, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  const video = path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
  const doc = path.join(video, 'video.md');
  fs.writeFileSync(doc, fs.readFileSync(doc, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, '{"nivel": 1, "status": "Construção"}').out.recorded, true);
  return { dir, video };
}

// The Vídeo as `estado` reports it.
const noEstado = (dir) => run('estado', dir).out.projetos[0].videos[0];

// The Motion designer's work for one version: the version folder and its key stills.
function versaoConstruida(dir) {
  const { out } = run('nova-versao', dir, PROJETO, VIDEO);
  assert.equal(out.ready, true, JSON.stringify(out));
  for (const nome of ['01-abertura.png', '02-numero.png']) fs.writeFileSync(path.join(out.pasta, nome), 'still');
  // The three Críticos approve it (ticket #13): her review opens only after them.
  const aprovado = { veredito: 'aprovado', motivos: [] };
  const vereditos = { 'qc-tecnico': aprovado, 'guardiao-da-marca': aprovado, 'revisor-de-plataforma': aprovado };
  assert.equal(run('qc-interno', dir, PROJETO, VIDEO, JSON.stringify({ vereditos, custo: { tokens: 0, segundos: 0 } })).out.recorded, true);
  return out;
}

const decidir = (dir, decisao) => run('decidir-revisao', dir, PROJETO, VIDEO, JSON.stringify(decisao));

test('each version of the edit gets its own review folder, v01 first, inside the Vídeo', () => {
  const { dir, video } = videoEmConstrucao();
  const { code, out } = run('nova-versao', dir, PROJETO, VIDEO);
  assert.equal(code, 0);
  assert.equal(out.ready, true);
  assert.equal(out.versao, 'v01');
  assert.equal(out.pasta, path.join(video, 'revisao', 'v01'));
  assert.ok(fs.statSync(out.pasta).isDirectory());
});

test('asking again before her review reuses the open version instead of skipping a number', () => {
  const { dir } = videoEmConstrucao();
  run('nova-versao', dir, PROJETO, VIDEO);
  const { out } = run('nova-versao', dir, PROJETO, VIDEO);
  assert.equal(out.versao, 'v01');
  assert.equal(out.criada, false);
});

test('opening her review needs the stills: a version with no still is refused and nothing changes', () => {
  const { dir } = videoEmConstrucao();
  run('nova-versao', dir, PROJETO, VIDEO);
  const { out } = run('abrir-revisao', dir, PROJETO, VIDEO);
  assert.equal(out.opened, false);
  assert.equal(out.reason, 'no-stills');
  assert.equal(noEstado(dir).status, 'Construção');
});

test('opening her review moves the Vídeo from Construção to Revisão, Rodada 1, waiting for her', () => {
  const { dir } = videoEmConstrucao();
  versaoConstruida(dir);
  const { out } = run('abrir-revisao', dir, PROJETO, VIDEO);
  assert.equal(out.opened, true);
  assert.equal(out.status, 'Revisão');
  assert.equal(out.rodada, 1);
  assert.equal(out.versao, 'v01');
  assert.deepEqual(out.stills, ['revisao/v01/01-abertura.png', 'revisao/v01/02-numero.png']);
  const video = noEstado(dir);
  assert.equal(video.status, 'Revisão');
  assert.equal(video.rodada, 1);
  assert.equal(video.waitingForCriadora, true);
  assert.deepEqual(video.versao, { nome: 'v01', decisao: null });
});

test('her notes, given all at once, are consolidated into one numbered list: blanks and repeats dropped', () => {
  const { dir, video } = videoEmConstrucao();
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  const { out } = decidir(dir, {
    decisao: 'pedir-mudancas',
    notas: ['Legenda maior', '  ', 'Tirar o logo do começo', 'legenda  MAIOR'],
    mudancasDeEscopo: [],
  });
  assert.equal(out.decided, true);
  assert.deepEqual(out.notas, ['Legenda maior', 'Tirar o logo do começo']);
  const md = fs.readFileSync(path.join(video, 'revisao', 'v01', 'notas.md'), 'utf8');
  assert.match(md, /1\. Legenda maior/);
  assert.match(md, /2\. Tirar o logo do começo/);
  assert.doesNotMatch(md, /legenda {2}MAIOR/);
});

test('asking for changes moves the Vídeo to Ajustes; the next version opens Rodada 2 in v02', () => {
  const { dir, video } = videoEmConstrucao();
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  const { out } = decidir(dir, { decisao: 'pedir-mudancas', notas: ['Legenda maior'] });
  assert.equal(out.status, 'Ajustes');
  assert.equal(noEstado(dir).waitingForCriadora, false);

  const v02 = versaoConstruida(dir);
  assert.equal(v02.versao, 'v02');
  const reaberta = run('abrir-revisao', dir, PROJETO, VIDEO).out;
  assert.equal(reaberta.status, 'Revisão');
  assert.equal(reaberta.rodada, 2);
  // Every version is kept, so she can compare or go back.
  assert.ok(fs.existsSync(path.join(video, 'revisao', 'v01', '01-abertura.png')));
  assert.ok(fs.existsSync(path.join(video, 'revisao', 'v02', '01-abertura.png')));
});

test('approving moves the Vídeo to Aprovado without another Rodada, and counts the Gate', () => {
  const { dir } = videoEmConstrucao();
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  const { out } = decidir(dir, { decisao: 'aprovar' });
  assert.equal(out.decided, true);
  assert.equal(out.status, 'Aprovado');
  assert.equal(out.rodada, 1);
  assert.equal(out.gates, 1);
  const video = noEstado(dir);
  assert.equal(video.status, 'Aprovado');
  assert.equal(video.waitingForCriadora, false);
  assert.deepEqual(video.versao, { nome: 'v01', decisao: 'aprovar' });
});

test('approving with small changes goes straight to Aprovado with the fixes listed, not a new Rodada', () => {
  const { dir, video } = videoEmConstrucao();
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  const { out } = decidir(dir, { decisao: 'aprovar-com-ajustes', notas: ['Trocar "vc" por "você" na legenda'] });
  assert.equal(out.status, 'Aprovado');
  assert.equal(out.rodada, 1);
  assert.deepEqual(out.ajustesAntesDaEntrega, ['Trocar "vc" por "você" na legenda']);
  assert.equal(fs.existsSync(path.join(video, 'revisao', 'v02')), false);
  const decisao = JSON.parse(fs.readFileSync(path.join(video, 'revisao', 'v01', 'decisao.json'), 'utf8'));
  assert.equal(decisao.decisao, 'aprovar-com-ajustes');
});

test('a new idea is named as a scope change in her list, never slipped in as a small fix', () => {
  const { dir, video } = videoEmConstrucao();
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  const escondida = decidir(dir, { decisao: 'aprovar-com-ajustes', notas: ['Cor da legenda'], mudancasDeEscopo: ['Uma versão 16:9 também'] }).out;
  assert.equal(escondida.decided, false);
  assert.equal(escondida.reason, 'scope-change');
  assert.equal(noEstado(dir).status, 'Revisão');

  const { out } = decidir(dir, { decisao: 'pedir-mudancas', notas: ['Cor da legenda'], mudancasDeEscopo: ['Uma versão 16:9 também'] });
  assert.equal(out.decided, true);
  assert.deepEqual(out.mudancasDeEscopo, ['Uma versão 16:9 também']);
  const md = fs.readFileSync(path.join(video, 'revisao', 'v01', 'notas.md'), 'utf8');
  assert.match(md, /2\. Uma versão 16:9 também \(mudança de escopo/);
});

test('changes without a single note, or a plain approval carrying notes, are refused unchanged', () => {
  const { dir } = videoEmConstrucao();
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  assert.equal(decidir(dir, { decisao: 'pedir-mudancas', notas: [' '] }).out.reason, 'no-notes');
  assert.equal(decidir(dir, { decisao: 'aprovar-com-ajustes', notas: [] }).out.reason, 'no-notes');
  assert.equal(decidir(dir, { decisao: 'aprovar', notas: ['Legenda maior'] }).out.reason, 'notes-on-plain-approval');
  assert.equal(decidir(dir, { decisao: 'talvez' }).out.reason, 'invalid-decision');
  assert.equal(noEstado(dir).status, 'Revisão');
});

test('a decision needs an open review, and a version is decided only once', () => {
  const { dir } = videoEmConstrucao();
  assert.equal(decidir(dir, { decisao: 'aprovar' }).out.reason, 'not-in-review');
  versaoConstruida(dir);
  run('abrir-revisao', dir, PROJETO, VIDEO);
  assert.equal(decidir(dir, { decisao: 'pedir-mudancas', notas: ['Legenda maior'] }).out.decided, true);
  assert.equal(decidir(dir, { decisao: 'aprovar' }).out.reason, 'not-in-review');
});

test('a review opens only after the build: a Vídeo still in Planejamento is refused', () => {
  const { dir } = videoEmConstrucao();
  run('registrar-video', dir, PROJETO, VIDEO, '{"status": "Planejamento"}');
  assert.equal(run('nova-versao', dir, PROJETO, VIDEO).out.reason, 'not-building');
  assert.equal(run('abrir-revisao', dir, PROJETO, VIDEO).out.reason, 'not-building');
});
