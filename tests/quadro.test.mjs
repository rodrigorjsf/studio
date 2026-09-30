// Seam 2 — the Remotion template, for the Quadros de estilo (ticket #10). Scaffolds a real
// Estúdio with `criar`, puts a recording of a known solid color in as a Vídeo's Master and
// renders the `QuadroDeEstilo` composition as a still through the Remotion CLI, as the Diretor
// de arte does. Asserts only on the PNG: its size (the Formato of the Kit the Vídeo follows) and
// the color at its center — her recording's color, not the Kit's background — proof the Quadro
// is drawn on a real frame of her video.
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
const kitFixtures = path.join(repoRoot, 'tests', 'fixtures', 'kits');
const remotionCli = path.join(repoRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');

// The render needs the template's dependencies (`npm ci`) and an ffmpeg to make the recording,
// found as the Diretor finds it; without them this seam cannot run, and says so.
const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
let skip = null;
if (!fs.existsSync(remotionCli)) skip = 'run `npm ci` first: the Remotion dependencies are missing';
else if (!tools.ffmpeg) skip = 'no provisioned ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)';
const needs = skip ? { skip } : {};

const PROJETO = 'Minha Empresa';
// Her recording: two seconds of one color, as a phone records it (H.264, vertical).
const COR_DA_GRAVACAO = [0x20, 0xa0, 0x60];
let estudio;
const renders = {};

function videoDe(nome) {
  const dir = path.join(estudio, 'projetos', PROJETO, 'videos', nome);
  fs.mkdirSync(path.join(dir, 'original'), { recursive: true });
  const hex = COR_DA_GRAVACAO.map((c) => c.toString(16).padStart(2, '0')).join('');
  const made = spawnSync(tools.ffmpeg, [
    '-v', 'error', '-f', 'lavfi', '-i', `color=c=0x${hex}:s=1080x1920:r=30:d=2`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(dir, 'original', 'gravação.mp4'),
  ], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  return dir;
}

// The color of one pixel of a PNG, read back through ffmpeg.
function pixel(file, x, y) {
  const r = spawnSync(tools.ffmpeg, ['-v', 'error', '-i', file, '-vf', `crop=1:1:${x}:${y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer' });
  assert.equal(r.status, 0, String(r.stderr));
  return [...r.stdout];
}

function size(file) {
  const png = fs.readFileSync(file);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function still(label, props) {
  const out = path.join(estudio, 'saida', `${label}.png`);
  await promisify(execFile)(process.execPath, [
    remotionCli, 'still', 'src/index.ts', 'QuadroDeEstilo', out, `--props=${JSON.stringify(props)}`, '--frame=30',
  ], { cwd: estudio, maxBuffer: 64 * 1024 * 1024 });
  renders[label] = { ...size(out), centro: pixel(out, size(out).width / 2, size(out).height / 2) };
}

before(async () => {
  if (skip) return;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio quadro '));
  estudio = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(estudio);
  const created = spawnSync(process.execPath, [cli, 'criar', estudio], { encoding: 'utf8' });
  assert.equal(created.status, 0, created.stderr);
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(estudio, 'node_modules'), 'junction');
  const projeto = path.join(estudio, 'projetos', PROJETO);
  fs.mkdirSync(path.join(projeto, 'kit'), { recursive: true });
  fs.copyFileSync(path.join(kitFixtures, 'vertical.json'), path.join(projeto, 'kit.json'));

  videoDe('Dica rápida');
  // A Vídeo that keeps its own Kit (its Kit snapshot): a horizontal one.
  const proprio = videoDe('Vídeo antigo');
  fs.copyFileSync(path.join(kitFixtures, 'horizontal.json'), path.join(proprio, 'kit.json'));

  const props = (video) => ({ projeto: PROJETO, video, master: 'original/gravação.mp4', duracao: 2, titulo: 'Direção A' });
  await Promise.all([still('dica', props('Dica rápida')), still('antigo', props('Vídeo antigo'))]);
});

after(() => {
  if (estudio) fs.rmSync(path.dirname(estudio), { recursive: true, force: true });
});

// H.264 stores color in limited-range YUV: a round trip moves each channel by up to ~16.
const near = (actual, expected) => actual.every((c, i) => Math.abs(c - expected[i]) <= 24);

test('a Quadro de estilo is drawn on a real frame of her recording, in the Formato of her Kit', needs, () => {
  const kit = JSON.parse(fs.readFileSync(path.join(kitFixtures, 'vertical.json'), 'utf8'));
  assert.deepEqual([renders.dica.width, renders.dica.height], [1080, 1920]);
  assert.ok(near(renders.dica.centro, COR_DA_GRAVACAO), `center ${renders.dica.centro} is not her recording's color`);
  const fundo = [1, 3, 5].map((i) => parseInt(kit.cores.fundo.slice(i, i + 2), 16));
  assert.ok(!near(renders.dica.centro, fundo), 'the center must be her frame, not the Kit background');
});

test('a Vídeo that keeps its own Kit is framed by that Kit, not the Projeto\'s', needs, () => {
  assert.deepEqual([renders.antigo.width, renders.antigo.height], [1920, 1080]);
  assert.ok(near(renders.antigo.centro, COR_DA_GRAVACAO), `center ${renders.antigo.centro} is not her recording's color`);
});
