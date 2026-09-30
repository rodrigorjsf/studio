// Seam 2 — the Remotion template, for Nível 2's generated assets (ticket #15). Scaffolds a real
// Estúdio with `criar`, puts her recording in as a Vídeo's Master and a generated image and clip
// into the Vídeo's `gerados/` folder, then writes and registers a Vídeo composition built on
// <Edicao> with <Gerado>, as the Motion designer does, and renders it through the Remotion CLI.
// Asserts only on the rendered files: the generated image reaches the frame (its pixel color), and
// a generated clip's own sound never reaches the edit (her audio plays once, as loud as recorded).
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
let gravacao;
let still;
let edicao;

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function ffmpeg(...args) {
  const r = spawnSync(tools.ffmpeg, ['-v', 'error', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

// The top-left pixel of an image, as [r, g, b].
function pixel(file) {
  const r = spawnSync(tools.ffmpeg, ['-v', 'error', '-i', file, '-vf', 'crop=1:1:0:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1024 });
  assert.equal(r.status, 0, String(r.stderr));
  return [...r.stdout.subarray(0, 3)];
}

// Mean loudness in dB, as ffmpeg's volumedetect measures it.
function meanVolume(file) {
  const r = spawnSync(tools.ffmpeg, ['-i', file, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1]);
}

// A Vídeo composition as the Motion designer writes one: her Master, and a generated asset over it.
const COMPOSICAO = `import React from 'react';
import {Edicao, Gerado, PropsDaEdicao} from '../../_shared/edicao';

export const BrollGerado: React.FC<PropsDaEdicao & {arquivo: string}> = (props) => (
  <Edicao {...props}>
    <Gerado projeto={props.projeto} video={props.video} arquivo={props.arquivo} />
  </Edicao>
);
`;
const REGISTRO = `    <Composition
      id="BrollGerado"
      component={BrollGerado}
      width={1080}
      height={1920}
      fps={FPS_DA_EDICAO}
      durationInFrames={FPS_DA_EDICAO}
      defaultProps={{projeto: '', formato: null, video: '', master: '', duracao: 1, arquivo: ''}}
      calculateMetadata={calcularMetadadosDaEdicao}
    />
  </>
);`;

before(async () => {
  if (skip) return;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio gerados '));
  const estudio = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(estudio);
  assert.equal(run('criar', estudio).created, true);
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(estudio, 'node_modules'), 'junction');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(estudio, 'perfil.md'));
  run('novo-projeto', estudio, PROJETO);
  const briefing = path.join(estudio, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', estudio, PROJETO).approved, true);

  // Her recording: 2 s, green, with her voice (a quiet tone).
  gravacao = path.join(root, 'gravação.mp4');
  ffmpeg('-f', 'lavfi', '-i', 'color=c=0x20a060:s=1080x1920:r=30:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', gravacao);
  const novo = run('novo-video', estudio, PROJETO, VIDEO, gravacao);
  assert.equal(novo.created, true);

  // What the Artista generativo downloaded: a red image, and a blue clip that carries loud noise.
  const gerados = path.join(estudio, 'projetos', PROJETO, 'videos', VIDEO, 'gerados');
  fs.mkdirSync(gerados);
  ffmpeg('-f', 'lavfi', '-i', 'color=c=0xff0000:s=1080x1920', '-frames:v', '1', path.join(gerados, '01_fundo.png'));
  ffmpeg('-f', 'lavfi', '-i', 'color=c=0x0000ff:s=1080x1920:r=30:d=2', '-f', 'lavfi', '-i', 'anoisesrc=d=2:a=0.9',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path.join(gerados, '02_broll.mp4'));

  fs.mkdirSync(path.join(estudio, 'src', 'videos', 'teste-gerado'), { recursive: true });
  fs.writeFileSync(path.join(estudio, 'src', 'videos', 'teste-gerado', 'BrollGerado.tsx'), COMPOSICAO);
  const rootTsx = path.join(estudio, 'src', 'Root.tsx');
  const registrado = fs.readFileSync(rootTsx, 'utf8').replace(/\r?\n {2}<\/>\r?\n\);\s*$/, `\n${REGISTRO}\n`);
  fs.writeFileSync(rootTsx, `import {BrollGerado} from './videos/teste-gerado/BrollGerado';\n${registrado}`);

  const props = (arquivo) => `--props=${JSON.stringify({ projeto: PROJETO, video: VIDEO, master: novo.original, duracao: 2, arquivo })}`;
  still = path.join(root, 'still.png');
  edicao = path.join(root, 'edicao.mp4');
  const remotion = (...args) => promisify(execFile)(process.execPath, [remotionCli, ...args, '--log=error'], { cwd: estudio, maxBuffer: 64 * 1024 * 1024 });
  await Promise.all([
    remotion('still', 'src/index.ts', 'BrollGerado', still, '--frame=15', props('gerados/01_fundo.png')),
    remotion('render', 'src/index.ts', 'BrollGerado', edicao, props('gerados/02_broll.mp4')),
  ]);
});

after(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

test('a generated image saved in the Vídeo\'s gerados folder reaches the frame of the edit', needs, () => {
  const [r, g, b] = pixel(still);
  assert.ok(r > 200 && g < 60 && b < 60, `expected the generated red, got rgb(${r}, ${g}, ${b})`);
});

test('a generated clip is shown, silent: her original audio plays once, as loud as her recording', needs, () => {
  const meio = path.join(root, 'meio.png');
  ffmpeg('-ss', '1', '-i', edicao, '-frames:v', '1', meio);
  const [r, g, b] = pixel(meio);
  assert.ok(b > 200 && r < 60 && g < 60, `expected the generated blue, got rgb(${r}, ${g}, ${b})`);
  const diferenca = meanVolume(edicao) - meanVolume(gravacao);
  assert.ok(Math.abs(diferenca) <= 1.5, `the edit is ${diferenca.toFixed(1)} dB off her recording: the clip's sound leaked in`);
});
