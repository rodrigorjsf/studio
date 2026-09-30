// Seam 1 — the deterministic CLI, for the Entrega (tickets #11, #12): `entregar` takes the files the
// Finalizador rendered into the Vídeo's `entrega/` folder, holds each against the Master (every MP4
// through the technical QC of `qc`: same duration ±1 frame, a Formato's canvas, 30 fps, her
// original audio exactly once, no black or frozen stretch; an overlay: same duration, no audio)
// and, when they pass, marks the Vídeo
// Entregue and says how to open the folder for her. Renders are made by ffmpeg during the test,
// each with one known flaw; the pass path through a real Remotion render is in edicao.test.mjs.
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output and
// the Vídeo's record as `estado` reports it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const cli = path.join(pluginRoot, 'scripts', 'estudio.mjs');

// ffmpeg and ffprobe, found as the Diretor finds them; without them this seam cannot run.
const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
const needs = tools.ffmpeg && tools.ffprobe ? {} : { skip: 'no provisioned ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)' };

const PROJETO = 'Minha Empresa';
const VIDEO = 'Dica rápida';
const tempRoots = [];
let gravacao;

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

function ffmpeg(...args) {
  const r = spawnSync(tools.ffmpeg, ['-v', 'error', '-y', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

before(() => {
  if (needs.skip) return;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio entrega '));
  tempRoots.push(root);
  // Her recording: 2 s at 30 fps in the 9:16 canvas with her voice (a tone stands in for it).
  gravacao = path.join(root, 'gravação.mp4');
  ffmpeg('-f', 'lavfi', '-i', 'color=c=0x20a060:s=1080x1920:r=30:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', gravacao);
});
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

// A fresh Estúdio whose Vídeo she approved at the review: the Status the Entrega starts from.
function videoAprovado({ status = 'Aprovado' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio entrega '));
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
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, gravacao).out.created, true);
  const video = path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
  const doc = path.join(video, 'video.md');
  fs.writeFileSync(doc, fs.readFileSync(doc, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, JSON.stringify({ nivel: 1, status })).out.recorded, true);
  fs.mkdirSync(path.join(video, 'entrega'));
  return { dir, entrega: path.join(video, 'entrega') };
}

const entregar = (dir) => run('entregar', dir, PROJETO, VIDEO, tools.ffmpeg, tools.ffprobe).out;
const noEstado = (dir) => run('estado', dir).out.projetos[0].videos[0];
// A render of the edit: her Master with its audio re-encoded, as a render would, plus `extra` options.
const render = (arquivo, ...extra) => ffmpeg('-i', gravacao, ...extra, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', arquivo);

test('a render as long as the Master, with her audio once, is delivered: Entregue, dated, the folder to open', needs, () => {
  const { dir, entrega } = videoAprovado();
  render(path.join(entrega, 'Dica rápida 9x16.mp4'));
  const out = entregar(dir);
  assert.equal(out.delivered, true, JSON.stringify(out));
  assert.equal(out.status, 'Entregue');
  assert.equal(out.pasta, entrega);
  assert.deepEqual(out.arquivos, ['Dica rápida 9x16.mp4']);
  // How to open the delivery folder on this computer: one program, the folder as its only argument.
  assert.ok(['open', 'explorer', 'explorer.exe', 'xdg-open'].includes(out.abrir.programa), out.abrir.programa);
  assert.equal(out.abrir.argumentos.length, 1);
  assert.match(out.abrir.argumentos[0], /entrega$/);
  const video = noEstado(dir);
  assert.equal(video.status, 'Entregue');
  assert.equal(video.waitingForCriadora, false);
  assert.ok(!Number.isNaN(Date.parse(out.entregueEm)));
});

test('a render shorter than the Master by more than one frame is refused, and the Vídeo stays Aprovado', needs, () => {
  const { dir, entrega } = videoAprovado();
  render(path.join(entrega, 'curto.mp4'), '-t', '1.8');
  const out = entregar(dir);
  assert.equal(out.delivered, false);
  assert.equal(out.reason, 'not-ready');
  assert.equal(out.problemas.length, 1);
  assert.match(out.problemas[0], /^curto\.mp4: lasts 1\.8 s, the Master 2 s/);
  assert.equal(noEstado(dir).status, 'Aprovado');
});

test('a render without her audio, or with it twice, is refused: her original audio plays exactly once', needs, () => {
  const { dir, entrega } = videoAprovado();
  render(path.join(entrega, 'mudo.mp4'), '-an');
  render(path.join(entrega, 'dobrado.mp4'), '-map', '0:v', '-map', '0:a', '-map', '0:a');
  const out = entregar(dir);
  assert.equal(out.delivered, false);
  assert.deepEqual(out.problemas, [
    'dobrado.mp4: has 2 audio tracks; her original audio must play exactly once',
    'mudo.mp4: has 0 audio tracks; her original audio must play exactly once',
  ]);
});

test('a render that fails the technical QC blocks the Entrega with its reasons', needs, () => {
  const { dir, entrega } = videoAprovado();
  render(path.join(entrega, 'escura.mp4'), '-vf', "drawbox=c=black:t=fill:enable='between(t,0.5,1.5)'");
  render(path.join(entrega, 'pequena.mp4'), '-vf', 'scale=720:1280');
  const out = entregar(dir);
  assert.equal(out.delivered, false);
  assert.equal(out.reason, 'not-ready');
  assert.equal(out.problemas.length, 2);
  assert.match(out.problemas[0], /^escura\.mp4: turns black at 0\.5–1\.5\d* s, where the Master does not$/);
  assert.match(out.problemas[1], /^pequena\.mp4: is 720×1280; a Formato's canvas is/);
  assert.equal(noEstado(dir).status, 'Aprovado');
});

test('transparent overlays she asked for are delivered silent, as long as the Master', needs, () => {
  const { dir, entrega } = videoAprovado();
  ffmpeg('-f', 'lavfi', '-i', 'color=c=black@0.0:s=1080x1920:r=30:d=2,format=yuva444p10le', '-c:v', 'prores_ks', '-profile:v', '4444', path.join(entrega, 'overlay.mov'));
  ffmpeg('-f', 'lavfi', '-i', 'color=c=black@0.0:s=1080x1920:r=30:d=2,format=yuva444p10le', '-f', 'lavfi', '-i', 'sine=duration=2',
    '-c:v', 'prores_ks', '-profile:v', '4444', '-c:a', 'pcm_s16le', path.join(entrega, 'overlay com som.mov'));
  // Overlays alone are not an Entrega: the full MP4 always goes with them.
  assert.equal(entregar(dir).reason, 'no-main-video');
  render(path.join(entrega, 'Dica rápida 9x16.mp4'));
  const out = entregar(dir);
  assert.deepEqual(out.problemas, ['overlay com som.mov: an overlay carries no audio (1 track); her voice is in the Master']);
  fs.rmSync(path.join(entrega, 'overlay com som.mov'));
  assert.equal(entregar(dir).delivered, true);
});

test('nothing rendered yet, or a Vídeo she has not approved, is refused unchanged', needs, () => {
  const vazio = videoAprovado();
  assert.equal(entregar(vazio.dir).reason, 'no-deliverable');
  const emRevisao = videoAprovado({ status: 'Revisão' });
  render(path.join(emRevisao.entrega, 'final.mp4'));
  const out = entregar(emRevisao.dir);
  assert.equal(out.reason, 'not-approved');
  assert.equal(noEstado(emRevisao.dir).status, 'Revisão');
});
