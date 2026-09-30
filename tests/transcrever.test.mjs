// The transcriber (ticket #9): plugin/estudio/scripts/transcrever.py, run by the Python the
// installer provisions (the one holding faster-whisper), on a synthetic clip ffmpeg makes during
// the test. Asserts only on the JSON it prints and the files it writes.
//
// The tools come from the computer check (verificar.sh --json), exactly as the Diretor gets
// them: point ESTUDIO_DADOS at a plugin data folder the installer filled. The transcription test
// also needs ESTUDIO_MODELOS, a folder for the speech model (downloaded on first use), and uses
// the small model named by ESTUDIO_MODELO_TESTE (default "tiny", ~75 MB). Without them the tests
// are skipped with the reason.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const transcrever = path.join(pluginRoot, 'scripts', 'transcrever.py');

const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
const needsPython = tools.python ? {} : { skip: 'no provisioned Python (set ESTUDIO_DADOS to an installed plugin data folder)' };
const ready = tools.python && tools.ffmpeg && process.env.ESTUDIO_MODELOS;
const needsModel = ready ? {} : { skip: 'set ESTUDIO_DADOS and ESTUDIO_MODELOS (a folder for the speech model) to run a real transcription' };

let root;
before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio transcrição '));
});
after(() => root && fs.rmSync(root, { recursive: true, force: true }));

test('a usage error names what is missing and loads no model', needsPython, () => {
  const r = spawnSync(tools.python, [transcrever, path.join(root, 'não existe.mp4'), path.join(root, 'saída'), '--modelos', path.join(root, 'modelos')], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /video not found/);
  assert.equal(fs.existsSync(path.join(root, 'saída')), false, 'nothing written');
});

test('a real transcription writes a word-timed palavras.json and a transcript', needsModel, () => {
  // 2 s of a tone over a still frame: no speech, so any word found must still be well formed.
  const clip = path.join(root, 'Minha gravação.mp4');
  const made = spawnSync(tools.ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=gray:s=320x240:r=25:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-shortest', '-pix_fmt', 'yuv420p', clip,
  ], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const kit = path.join(root, 'kit.json');
  fs.writeFileSync(kit, JSON.stringify({ glossario: ['Estúdio', 'Remotion'] }));

  const out = path.join(root, 'transcricao');
  const r = spawnSync(tools.python, [transcrever, clip, out, '--modelos', process.env.ESTUDIO_MODELOS, '--kit', kit,
    '--modelo', process.env.ESTUDIO_MODELO_TESTE ?? 'tiny'], { encoding: 'utf8', timeout: 600000 });
  assert.equal(r.status, 0, r.stderr);
  const summary = JSON.parse(r.stdout);
  assert.ok(Math.abs(summary.duracao - 2) < 0.1, `duration of the clip (got ${summary.duracao})`);
  assert.equal(summary.dispositivo, summary.dispositivo === 'cuda' ? 'cuda' : 'cpu');

  const words = JSON.parse(fs.readFileSync(path.join(out, 'palavras.json'), 'utf8'));
  assert.ok(Array.isArray(words));
  assert.equal(words.length, summary.palavras);
  for (const word of words) {
    assert.equal(typeof word.w, 'string');
    assert.ok(word.s <= word.e && word.e <= summary.duracao + 0.5, JSON.stringify(word));
  }
  assert.match(fs.readFileSync(path.join(out, 'transcript.md'), 'utf8'), /^<!-- .+ \| (cuda|cpu) \| 2\.\d+s -->/);
});
