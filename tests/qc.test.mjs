// Seam 1 — the deterministic CLI, for the technical QC (ticket #12): `qc` holds one render of the
// edit against the Vídeo's Master — duration within one frame, a Formato's canvas, the edit's frame
// rate, her audio exactly once at the Master's loudness, no black or frozen stretch the Master does
// not have — and returns pass/fail with its reasons, the measurements (integrated loudness and true
// peak reported, never normalized) and photosensitivity as a check left to a person.
// Renders are made by ffmpeg during the test, each with one known flaw. Drives
// plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output.
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
let root;
let estudio;
let videoDir;

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

function ffmpeg(...args) {
  const r = spawnSync(tools.ffmpeg, ['-v', 'error', '-y', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

// Her recording: 3 s of moving picture at 30 fps in the 9:16 canvas, with her voice (a tone at
// about -22 LUFS stands in for it); `video` adds a filter to the picture.
function gravar(arquivo, video = null) {
  ffmpeg('-f', 'lavfi', '-i', 'testsrc2=s=1080x1920:r=30:d=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
    ...(video ? ['-vf', video] : []), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', arquivo);
}

// A fresh Estúdio with one Vídeo whose Master is `gravacao`.
function estudioCom(gravacao) {
  const dir = fs.mkdtempSync(path.join(root, 'estúdio '));
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const briefing = path.join(dir, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, gravacao).out.created, true);
  const video = path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
  fs.mkdirSync(path.join(video, 'revisao', 'v01'), { recursive: true });
  return { dir, video };
}

before(() => {
  if (needs.skip) return;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio qc '));
  const gravacao = path.join(root, 'gravação.mp4');
  gravar(gravacao);
  ({ dir: estudio, video: videoDir } = estudioCom(gravacao));
});
after(() => root && fs.rmSync(root, { recursive: true, force: true }));

// A render of the edit, inside the version folder: her Master re-encoded, as a render would, plus
// `extra` options that give it one flaw. Returns its path relative to the Vídeo folder.
function render(nome, ...extra) {
  const relativo = `revisao/v01/${nome}`;
  const master = fs.readdirSync(path.join(videoDir, 'original'))[0];
  ffmpeg('-i', path.join(videoDir, 'original', master), ...extra, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(videoDir, relativo));
  return relativo;
}

const qc = (relativo, dir = estudio) => run('qc', dir, PROJETO, VIDEO, relativo, tools.ffmpeg, tools.ffprobe).out;
const checks = (out) => out.problemas.map((p) => p.check);

test('a render that keeps the Master passes, with its measurements and photosensitivity left to a person', needs, () => {
  const out = qc(render('boa.mp4'));
  assert.equal(out.passed, true, JSON.stringify(out.problemas));
  assert.deepEqual(out.problemas, []);
  const { render: medido, master } = out.medidas;
  assert.equal(medido.largura, 1080);
  assert.equal(medido.altura, 1920);
  assert.equal(medido.fps, 30);
  assert.equal(medido.faixasDeAudio, 1);
  assert.ok(Math.abs(medido.duracao - 3) < 0.04, medido.duracao);
  // Loudness is measured and reported, never changed: the render's is her Master's.
  assert.ok(medido.loudnessIntegrado < -15 && medido.loudnessIntegrado > -30, medido.loudnessIntegrado);
  assert.ok(Math.abs(medido.loudnessIntegrado - master.loudnessIntegrado) < 1, JSON.stringify(out.medidas));
  assert.equal(typeof medido.truePeak, 'number');
  assert.deepEqual(out.verificacaoManual.map((v) => v.check), ['photosensitivity']);
});

test('her mono recording rendered in stereo, as Remotion renders it, keeps her loudness', needs, () => {
  const out = qc(render('estereo.mp4', '-af', 'pan=stereo|c0=c0|c1=c0'));
  assert.equal(out.passed, true, JSON.stringify(out.problemas));
  assert.ok(Math.abs(out.medidas.render.loudnessIntegrado - out.medidas.master.loudnessIntegrado) < 0.5, JSON.stringify(out.medidas));
});

test('a render shorter than the Master by more than one frame fails on duration', needs, () => {
  const out = qc(render('curta.mp4', '-t', '2.8'));
  assert.equal(out.passed, false);
  assert.deepEqual(checks(out), ['duration']);
  assert.match(out.problemas[0].message, /^lasts 2\.8 s, the Master 3 s/);
});

test('a render outside every Formato canvas fails on resolution', needs, () => {
  const out = qc(render('pequena.mp4', '-vf', 'scale=720:1280'));
  assert.deepEqual(checks(out), ['resolution']);
  assert.match(out.problemas[0].message, /^is 720×1280/);
});

test('a render at another frame rate than the edit fails on frame rate', needs, () => {
  const out = qc(render('25fps.mp4', '-vf', 'fps=25'));
  assert.deepEqual(checks(out), ['frame-rate']);
  assert.match(out.problemas[0].message, /^runs at 25 fps/);
});

test('a render without her audio, or with it twice, fails on audio tracks', needs, () => {
  const muda = qc(render('muda.mp4', '-an'));
  assert.deepEqual(muda.problemas, [{ check: 'audio-tracks', message: 'has 0 audio tracks; her original audio must play exactly once' }]);
  const dobrada = qc(render('dobrada.mp4', '-map', '0:v', '-map', '0:a', '-map', '0:a'));
  assert.deepEqual(checks(dobrada), ['audio-tracks']);
});

test('a render louder than the Master, or silent, fails on loudness; nothing is normalized', needs, () => {
  const alta = qc(render('alta.mp4', '-af', 'volume=6dB'));
  assert.deepEqual(checks(alta), ['loudness']);
  const { render: medido, master } = alta.medidas;
  assert.ok(medido.loudnessIntegrado - master.loudnessIntegrado > 5, JSON.stringify(alta.medidas));
  assert.ok(medido.truePeak > master.truePeak, JSON.stringify(alta.medidas));
  // A render whose one audio track is silent (Remotion adds one when the Master is muted).
  const silenciosa = qc(render('silenciosa.mp4', '-af', 'volume=0'));
  assert.deepEqual(checks(silenciosa), ['loudness']);
  assert.match(silenciosa.problemas[0].message, /^measures silence LUFS/);
});

test('a render that turns black where the Master does not fails on black frames', needs, () => {
  const out = qc(render('preta.mp4', '-vf', "drawbox=c=black:t=fill:enable='between(t,1,2)'"));
  assert.deepEqual(checks(out), ['black-frames']);
  assert.match(out.problemas[0].message, /^turns black at 1–2\.0\d+ s/);
});

test('a render whose picture stands still where the Master moves fails on frozen frames', needs, () => {
  const out = qc(render('congelada.mp4', '-vf', 'trim=0:0.5,tpad=stop_mode=clone:stop_duration=2.5'));
  assert.deepEqual(checks(out), ['frozen-frames']);
  assert.match(out.problemas[0].message, /^stands still at 0\.\d+–3 s/);
});

test('black the Master already has is not the render\'s fault', needs, () => {
  const gravacao = path.join(root, 'gravação com preto.mp4');
  gravar(gravacao, "drawbox=c=black:t=fill:enable='between(t,1,2)'");
  const { dir, video } = estudioCom(gravacao);
  const relativo = 'revisao/v01/render.mp4';
  ffmpeg('-i', gravacao, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(video, relativo));
  const out = qc(relativo, dir);
  assert.equal(out.passed, true, JSON.stringify(out.problemas));
  assert.equal(out.medidas.render.pretos.length, 1);
});

test('a render that is missing or unreadable is refused with its reason', needs, () => {
  assert.equal(qc('revisao/v01/nada.mp4').reason, 'no-render');
  fs.writeFileSync(path.join(videoDir, 'revisao', 'v01', 'quebrada.mp4'), 'not a video');
  assert.equal(qc('revisao/v01/quebrada.mp4').reason, 'probe-failed');
  assert.equal(run('qc', estudio, PROJETO, 'Outro vídeo', 'x.mp4', tools.ffmpeg, tools.ffprobe).out.reason, 'unknown-video');
});
