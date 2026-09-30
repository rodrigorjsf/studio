// The frame sampler (ticket #23): plugin/estudio/scripts/frames/amostrar.py, run by the
// Python the installer provisions, on a synthetic clip ffmpeg makes during the test.
// Asserts only on the JSON it prints and the image files it leaves.
//
// The tools come from the computer check (verificar.sh --json), exactly as the Diretor gets
// them. Point ESTUDIO_DADOS at a plugin data folder the installer filled (or have ffmpeg and a
// Python with faster-whisper on PATH); otherwise these tests are skipped with the reason.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const amostrar = path.join(pluginRoot, 'scripts', 'frames', 'amostrar.py');

const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
const ready = tools.python && tools.ffmpeg && tools.ffprobe;
const needsTools = ready ? {} : { skip: 'no provisioned Python/ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)' };

// The clip: 1.5 s of a static red frame, then a hard cut to 1.5 s of static blue. 3 s at 25 fps.
const CUT = 1.5;
const DURATION = 3;
let root;
let clip;

before(() => {
  if (!ready) return;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio amostras '));
  clip = path.join(root, 'Minha gravação.mp4');
  const made = spawnSync(tools.ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `color=c=red:s=320x240:r=25:d=${CUT}`,
    '-f', 'lavfi', '-i', `color=c=blue:s=320x240:r=25:d=${DURATION - CUT}`,
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1[v]', '-map', '[v]', '-pix_fmt', 'yuv420p', clip,
  ], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
});
after(() => root && fs.rmSync(root, { recursive: true, force: true }));

function sample(out, ...args) {
  const r = spawnSync(tools.python, [amostrar, clip, path.join(root, out), '--ffmpeg', tools.ffmpeg, '--ffprobe', tools.ffprobe, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

const stamps = (result) => result.frames.map((f) => f.timestamp_seconds);
const isChronological = (ts) => ts.every((t, i) => i === 0 || t > ts[i - 1]);

test('overview mode keeps one frame per distinct moment, the scene cut included', needsTools, () => {
  const overview = sample('visão geral', '--modo', 'visao-geral');
  const faceZone = sample('zona do rosto', '--modo', 'zona-do-rosto', '--fps', '2');
  const ts = stamps(overview);

  assert.equal(overview.dedup, true);
  assert.ok(overview.deduped_count > 0, 'near-identical frames of the static segments are dropped');
  assert.ok(overview.frames.length < faceZone.frames.length, 'fewer frames than the uniform, undeduplicated pass');
  assert.ok(ts.some((t) => t < CUT), 'a frame before the cut');
  assert.ok(ts.some((t) => t >= CUT && t < CUT + 0.5), `a frame right at the cut (got ${ts})`);
  assert.ok(isChronological(ts), `chronological (got ${ts})`);
  for (const frame of overview.frames) assert.ok(fs.existsSync(frame.path), `${frame.path} was written`);
});

test('face zone mode samples uniformly over the whole clip and keeps identical frames', needsTools, () => {
  const faceZone = sample('rosto', '--modo', 'zona-do-rosto');
  const ts = stamps(faceZone);

  assert.equal(faceZone.dedup, false);
  assert.equal(faceZone.deduped_count, 0);
  assert.equal(faceZone.fps, 1, 'default rate: one frame per second');
  // One frame at the start of every second of the clip, from 0 s to its last second.
  const seconds = Math.floor(faceZone.meta.duration_seconds) + 1;
  assert.deepEqual(ts.map((t) => Math.round(t * 100) / 100), [...Array(seconds).keys()], `uniform over the whole clip (got ${ts})`);
  assert.equal(fs.readdirSync(path.join(root, 'rosto')).filter((f) => f.endsWith('.jpg')).length, seconds);
});

test('timestamps are source-relative when sampling a window, in both modes', needsTools, () => {
  for (const modo of ['visao-geral', 'zona-do-rosto']) {
    const result = sample(`janela ${modo}`, '--modo', modo, '--start', '1', '--end', '3');
    const ts = stamps(result);
    assert.ok(ts.length > 0);
    assert.ok(ts.every((t) => t >= 1 && t <= DURATION), `${modo}: times stay on the source clock (got ${ts})`);
    assert.ok(isChronological(ts), `${modo}: chronological (got ${ts})`);
  }
});

test('overview mode pins a frame at each requested cue time', needsTools, () => {
  const result = sample('momentos', '--modo', 'visao-geral', '--cues', '0:02.5');
  const cue = result.frames.find((f) => f.reason === 'transcript-cue');
  assert.ok(cue, 'a cue frame is present');
  assert.ok(Math.abs(cue.timestamp_seconds - 2.5) < 0.1, `cue at 2.5 s (got ${cue.timestamp_seconds})`);
  assert.ok(isChronological(stamps(result)));
});

test('a bad mode is a usage error with a plain message', needsTools, () => {
  const r = spawnSync(tools.python, [amostrar, clip, path.join(root, 'x'), '--modo', 'tudo'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--modo/);
});
