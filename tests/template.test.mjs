// Seam 2 — the Remotion template. Scaffolds a real Estúdio with `criar`, drops fixture
// Kits into its Projetos and renders a still of the Kit-driven composition through the
// Remotion CLI, exactly as a build would. Asserts only on the PNG it produces: its size
// (the Formato) and its corner pixel (the Kit's background color) — proof the Kit reaches
// the frame. `npm run typecheck` (TypeScript plus the split-layout guard) is the other half
// of this seam and runs on its own.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { validateKit } from '../plugin/estudio/scripts/lib/kit.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');
const kitFixtures = path.join(repoRoot, 'tests', 'fixtures', 'kits');
const remotionCli = path.join(repoRoot, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const COMPOSITION = 'PreviaDoKit';

// The render needs the template's dependencies. They are the repo's own (same package.json
// pins), installed by `npm ci`; without them this seam cannot run, and says so.
const needsRemotion = fs.existsSync(remotionCli) ? {} : { skip: 'run `npm ci` first: the Remotion dependencies are missing' };

let estudio;
const renders = {};

// Reads width, height and the top-left pixel of a PNG. The first pixel of the first
// scanline is stored unfiltered by every PNG filter type, so no full decoder is needed.
function readPng(file) {
  const png = fs.readFileSync(file);
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG', `${file} is not a PNG`);
  const idat = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.subarray(at + 4, at + 8).toString('latin1');
    if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const pixels = zlib.inflateSync(Buffer.concat(idat));
  const hex = (byte) => byte.toString(16).padStart(2, '0');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    corner: `#${hex(pixels[1])}${hex(pixels[2])}${hex(pixels[3])}`.toUpperCase(),
  };
}

function addProjeto(name, kitFixture) {
  const dir = path.join(estudio, 'projetos', name);
  fs.mkdirSync(path.join(dir, 'kit'), { recursive: true });
  const kit = JSON.parse(fs.readFileSync(path.join(kitFixtures, kitFixture), 'utf8'));
  assert.deepEqual(validateKit(kit, dir), [], `fixture ${kitFixture} must be a valid Kit`);
  fs.writeFileSync(path.join(dir, 'kit.json'), `${JSON.stringify(kit, null, 2)}\n`);
  return kit;
}

async function still(label, props) {
  const out = path.join(estudio, 'saida', `${label}.png`);
  await promisify(execFile)(process.execPath, [
    remotionCli, 'still', 'src/index.ts', COMPOSITION, out, `--props=${JSON.stringify(props)}`, '--frame=20',
  ], { cwd: estudio, maxBuffer: 64 * 1024 * 1024 });
  renders[label] = readPng(out);
}

before(async () => {
  if (needsRemotion.skip) return;
  // A path with spaces and accents, as on the Criadora's Mac.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio template '));
  estudio = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(estudio);
  const created = spawnSync(process.execPath, [cli, 'criar', estudio], { encoding: 'utf8' });
  assert.equal(created.status, 0, created.stderr);
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(estudio, 'node_modules'), 'junction');

  addProjeto('Minha Empresa', 'vertical.json');
  addProjeto('Canal Pessoal', 'horizontal.json');
  // Renders run in parallel: each one bundles the template, the slow part of this seam.
  await Promise.all([
    still('empresa', { projeto: 'Minha Empresa' }),
    still('empresa-16x9', { projeto: 'Minha Empresa', formato: '16:9' }),
    still('pessoal', { projeto: 'Canal Pessoal' }),
    still('sem-projeto', { projeto: '' }),
  ]);
});

after(() => {
  if (estudio) fs.rmSync(path.dirname(estudio), { recursive: true, force: true });
});

test('a Projeto whose Kit keeps the default Formato renders vertical 9:16 in its own background color', needsRemotion, () => {
  const kit = JSON.parse(fs.readFileSync(path.join(kitFixtures, 'vertical.json'), 'utf8'));
  assert.equal(kit.formato, '9:16');
  assert.deepEqual(renders.empresa, { width: 1080, height: 1920, corner: kit.cores.fundo.toUpperCase() });
});

test('the 16:9 variant of the same Projeto renders horizontal and keeps its Kit', needsRemotion, () => {
  const kit = JSON.parse(fs.readFileSync(path.join(kitFixtures, 'vertical.json'), 'utf8'));
  assert.deepEqual(renders['empresa-16x9'], { width: 1920, height: 1080, corner: kit.cores.fundo.toUpperCase() });
});

test('another Projeto renders from its own Kit: its Formato and its colors, nothing hard-coded', needsRemotion, () => {
  const kit = JSON.parse(fs.readFileSync(path.join(kitFixtures, 'horizontal.json'), 'utf8'));
  assert.equal(kit.formato, '16:9');
  assert.deepEqual(renders.pessoal, { width: 1920, height: 1080, corner: kit.cores.fundo.toUpperCase() });
  assert.notEqual(renders.pessoal.corner, renders.empresa.corner);
});

test('with no Projeto chosen the preview draws the default Kit, vertical 9:16', needsRemotion, () => {
  const kitPadrao = JSON.parse(fs.readFileSync(path.join(repoRoot, 'plugin', 'estudio', 'template', 'src', '_shared', 'kit-padrao.json'), 'utf8'));
  assert.deepEqual(renders['sem-projeto'], { width: 1080, height: 1920, corner: kitPadrao.cores.fundo.toUpperCase() });
});
