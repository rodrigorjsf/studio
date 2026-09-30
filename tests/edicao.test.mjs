// Seam 2 — the Remotion template, for the edit and its Entrega (ticket #11). Scaffolds a real
// Estúdio with `criar`, puts a 2 s recording with her voice (a tone) in as a Vídeo's Master,
// renders the `EdicaoComLegendas` composition — the base every Vídeo's edit is built on — into
// the Vídeo's `entrega/` folder through the Remotion CLI, as the Finalizador does, then runs
// `entregar` on it. Asserts only on the delivered MP4 (duration, audio tracks, loudness, size)
// and on the CLI's JSON: the edit lasts as long as the Master and her voice plays once.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const cli = path.join(pluginRoot, 'scripts', 'estudio.mjs');
const remotionCli = path.join(repoRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');

const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
let skip = null;
if (!fs.existsSync(remotionCli)) skip = 'run `npm ci` first: the Remotion dependencies are missing';
else if (!tools.ffmpeg || !tools.ffprobe) skip = 'no provisioned ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)';
const needs = skip ? { skip } : {};

const PROJETO = 'Minha Empresa';
const VIDEO = 'Dica rápida';
let root;
let estudio;
let entregue;
let arquivo;
let sobreposicao;

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function probe(file) {
  const r = spawnSync(tools.ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,duration,width,height,pix_fmt', '-of', 'json', file], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).streams;
}

// Mean loudness in dB, as ffmpeg's volumedetect measures it.
function meanVolume(file) {
  const r = spawnSync(tools.ffmpeg, ['-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1]);
}

let gravacao;
before(async () => {
  if (skip) return;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio edição '));
  estudio = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(estudio);
  assert.equal(run('criar', estudio).created, true);
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(estudio, 'node_modules'), 'junction');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(estudio, 'perfil.md'));
  run('novo-projeto', estudio, PROJETO);
  const briefing = path.join(estudio, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', estudio, PROJETO).approved, true);

  // Her recording: 2 s at 30 fps, vertical, with her voice.
  gravacao = path.join(root, 'gravação.mp4');
  const made = spawnSync(tools.ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x20a060:s=1080x1920:r=30:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', gravacao], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const novo = run('novo-video', estudio, PROJETO, VIDEO, gravacao);
  assert.equal(novo.created, true);
  // The review is approved: the edit goes to the Entrega.
  assert.equal(run('registrar-video', estudio, PROJETO, VIDEO, '{"nivel": 1, "status": "Aprovado"}').recorded, true);

  arquivo = path.join(estudio, 'projetos', PROJETO, 'videos', VIDEO, 'entrega', 'Dica rápida 9x16.mp4');
  const props = { projeto: PROJETO, video: VIDEO, master: novo.original, duracao: 2, legenda: [{ texto: 'Olá!', inicio: 0.2 }] };
  // She also asked for the overlay, to finish in another editor: transparent, as the Finalizador renders it.
  sobreposicao = path.join(path.dirname(arquivo), 'Dica rápida sobreposição.mov');
  const renderizar = (saida, extra) => promisify(execFile)(process.execPath, [
    remotionCli, 'render', 'src/index.ts', 'EdicaoComLegendas', saida, '--log=error', ...extra,
  ], { cwd: estudio, maxBuffer: 64 * 1024 * 1024 });
  await Promise.all([
    renderizar(arquivo, [`--props=${JSON.stringify(props)}`]),
    renderizar(sobreposicao, [`--props=${JSON.stringify({ ...props, sobreposicao: true })}`,
      '--codec=prores', '--prores-profile=4444', '--pixel-format=yuva444p10le', '--image-format=png', '--muted']),
  ]);
  entregue = run('entregar', estudio, PROJETO, VIDEO, tools.ffmpeg, tools.ffprobe);
});

after(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

test('the edit lasts exactly as long as her Master, in the vertical Formato of her Kit', needs, () => {
  const picture = probe(arquivo).find((s) => s.codec_type === 'video');
  assert.ok(Math.abs(Number(picture.duration) - 2) <= 1 / 30, `lasts ${picture.duration} s, the Master 2 s`);
  assert.deepEqual([picture.width, picture.height], [1080, 1920]);
});

test('her original audio plays exactly once: one track, as loud as her recording, neither doubled nor lost', needs, () => {
  assert.equal(probe(arquivo).filter((s) => s.codec_type === 'audio').length, 1);
  // Two copies of her voice would be about 6 dB louder; a muted Master would be silence.
  const diferenca = meanVolume(arquivo) - meanVolume(gravacao);
  assert.ok(Math.abs(diferenca) <= 1.5, `the edit is ${diferenca.toFixed(1)} dB off her recording`);
});

test('the overlay she asked for is transparent, silent and as long as her Master', needs, () => {
  const streams = probe(sobreposicao);
  const picture = streams.find((s) => s.codec_type === 'video');
  assert.match(picture.pix_fmt, /^yuva/);
  assert.ok(Math.abs(Number(picture.duration) - 2) <= 1 / 30, `lasts ${picture.duration} s, the Master 2 s`);
  assert.equal(streams.filter((s) => s.codec_type === 'audio').length, 0);
});

test('the rendered edit passes the Entrega: the Vídeo is Entregue and the delivery folder is named for opening', needs, () => {
  assert.equal(entregue.delivered, true, JSON.stringify(entregue));
  assert.equal(entregue.status, 'Entregue');
  assert.deepEqual(entregue.arquivos, ['Dica rápida 9x16.mp4', 'Dica rápida sobreposição.mov']);
  assert.equal(entregue.pasta, path.dirname(arquivo));
});
