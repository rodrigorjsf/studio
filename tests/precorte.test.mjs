// Seam 1 — the deterministic CLI, for the Pré-corte (ticket #14): `pausas` (the warning that a
// Master looks untrimmed, from the long pauses in its word-timed transcript) and `precorte` (a
// new Master written from the approved kept segments, the Original left byte-identical).
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// exit code and the files it produces. Most tests use a synthetic clip ffmpeg makes during
// the test, with the programs the computer check finds (set ESTUDIO_DADOS to an
// installed plugin data folder); without them they are skipped with the reason.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const cli = path.join(pluginRoot, 'scripts', 'estudio.mjs');

const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
const needsTools = tools.ffmpeg && tools.ffprobe ? {} : { skip: 'no provisioned ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)' };

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// An Estúdio with one approved Projeto ("Minha Empresa") and one Vídeo ("Dica rápida") made from
// `recording`, under a path with spaces and accents as on her Mac.
function estudioComVideo(recordingBytes) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio pré-corte '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(path.join(dir, 'projetos'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, 'Minha Empresa');
  const briefing = path.join(dir, 'projetos', 'Minha Empresa', 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, 'Minha Empresa').out.approved, true);

  const recording = path.join(root, 'Downloads', 'Gravação de terça.mp4');
  fs.mkdirSync(path.dirname(recording), { recursive: true });
  if (typeof recordingBytes === 'function') recordingBytes(recording);
  else fs.writeFileSync(recording, recordingBytes);
  assert.equal(run('novo-video', dir, 'Minha Empresa', 'Dica rápida', recording).out.created, true);
  const video = path.join(dir, 'projetos', 'Minha Empresa', 'videos', 'Dica rápida');
  return { dir, video, recording };
}

// Her recording: `seconds` at 25 fps, with a tone unless `silent`, so a cut has picture and
// sound to keep. A silent one lasts exactly `seconds` (no audio padding).
const clipOf = (seconds, { silent = false } = {}) => (file) => {
  const made = spawnSync(tools.ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `testsrc=s=160x120:r=25:d=${seconds}`,
    ...(silent ? [] : ['-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=48000:d=${seconds}`, '-c:a', 'aac', '-shortest']),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', file,
  ], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
};
const clip = clipOf(3);

function transcricao(video, words) {
  fs.mkdirSync(path.join(video, 'transcricao'), { recursive: true });
  fs.writeFileSync(path.join(video, 'transcricao', 'palavras.json'), JSON.stringify(words));
}

const pausas = (dir) => run('pausas', dir, 'Minha Empresa', 'Dica rápida', tools.ffprobe);

test('pausas warns that a Master with long pauses looks untrimmed, naming each pause', needsTools, () => {
  const { dir, video } = estudioComVideo(clipOf(10, { silent: true }));
  // She starts talking after 2 s, stops twice for about 2 s, and lets the camera run 1.6 s after
  // her last word: a raw, untrimmed recording.
  transcricao(video, [
    { w: 'Oi,', s: 2.0, e: 2.3 }, { w: 'tudo', s: 2.4, e: 2.7 }, { w: 'bem?', s: 2.8, e: 3.1 },
    { w: 'Hoje', s: 5.3, e: 5.6 }, { w: 'eu', s: 5.7, e: 5.8 },
    { w: 'mostro', s: 8.0, e: 8.4 },
  ]);

  const { code, out } = pausas(dir);
  assert.equal(code, 0);
  assert.equal(out.semCorte, true);
  assert.deepEqual(out.pausas, [
    { inicio: 0, fim: 2, duracao: 2 },
    { inicio: 3.1, fim: 5.3, duracao: 2.2 },
    { inicio: 5.8, fim: 8, duracao: 2.2 },
    { inicio: 8.4, fim: 10, duracao: 1.6 },
  ]);
  assert.equal(out.totalPausas, 8);
});

test('pausas counts the silence after her last word', needsTools, () => {
  const { dir, video } = estudioComVideo(clipOf(5, { silent: true }));
  // She speaks from the first frame without a pause, then the camera runs 4 s after she ends.
  transcricao(video, [{ w: 'Oi,', s: 0.05, e: 0.3 }, { w: 'tudo', s: 0.35, e: 0.6 }, { w: 'bem?', s: 0.7, e: 1.0 }]);

  const { out } = pausas(dir);
  assert.equal(out.semCorte, true);
  assert.deepEqual(out.pausas, [{ inicio: 1, fim: 5, duracao: 4 }]);
});

test('pausas stays quiet on a Master she already trimmed', needsTools, () => {
  const { dir, video } = estudioComVideo(clipOf(4.1, { silent: true }));
  // Jump cuts: speech from the first frame, only breaths between sentences, one short pause.
  transcricao(video, [
    { w: 'Oi,', s: 0.05, e: 0.3 }, { w: 'tudo', s: 0.35, e: 0.6 }, { w: 'bem?', s: 0.7, e: 1.0 },
    { w: 'Hoje', s: 1.4, e: 1.7 }, { w: 'eu', s: 1.8, e: 1.9 }, { w: 'mostro', s: 3.6, e: 4.0 },
  ]);

  const { out } = pausas(dir);
  assert.equal(out.semCorte, false);
  assert.deepEqual(out.pausas, [{ inicio: 1.9, fim: 3.6, duracao: 1.7 }]);
});

test('pausas needs the word-timed transcript of the ingest', () => {
  const { dir } = estudioComVideo('gravação');
  const { code, out } = run('pausas', dir, 'Minha Empresa', 'Dica rápida', 'ffprobe');
  assert.equal(code, 0);
  assert.deepEqual(out, { analyzed: false, reason: 'no-transcript' });
});

function probe(file) {
  const r = spawnSync(tools.ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  return { duration: Number(data.format.duration), streams: data.streams.map((s) => s.codec_type).sort() };
}

// "um" (kept) — a fumble "ééé" in the silence from 1 s to 2 s (cut) — "dois" (kept).
const FALA = [{ w: 'um', s: 0.2, e: 0.6 }, { w: 'ééé', s: 1.2, e: 1.6 }, { w: 'dois', s: 2.2, e: 2.6 }];
const MANTER = JSON.stringify({ manter: [{ inicio: 0, fim: 1 }, { inicio: 2, fim: 3 }] });

const masterField = (video) => /^master: (.*)$/m.exec(fs.readFileSync(path.join(video, 'video.md'), 'utf8'))[1];

test('precorte writes a new Master from the kept segments and leaves the Original byte-identical', needsTools, () => {
  const { dir, video, recording } = estudioComVideo(clip);
  const original = path.join(video, 'original', 'Gravação de terça.mp4');
  const before = sha256(original);
  transcricao(video, FALA);

  const { code, out } = run('precorte', dir, 'Minha Empresa', 'Dica rápida', MANTER, tools.ffmpeg, tools.ffprobe);
  assert.equal(code, 0);
  assert.equal(out.cut, true, JSON.stringify(out));
  assert.equal(out.original, 'original/Gravação de terça.mp4');
  assert.equal(out.master, 'master/Gravação de terça.mp4');
  assert.deepEqual(out.segmentos, [
    { original: { inicio: 0, fim: 1 }, master: { inicio: 0, fim: 1 } },
    { original: { inicio: 2, fim: 3 }, master: { inicio: 1, fim: 2 } },
  ]);

  // The new Master: 2 s (±1 frame at 25 fps), picture and sound, and the duration it reports.
  const made = probe(path.join(video, 'master', 'Gravação de terça.mp4'));
  assert.ok(Math.abs(made.duration - 2) <= 0.04 + 0.01, `new Master lasts ${made.duration} s`);
  assert.ok(Math.abs(out.duracao - made.duration) < 0.001);
  assert.deepEqual(made.streams, ['audio', 'video']);

  // The Original, and her own file, untouched.
  assert.equal(sha256(original), before);
  assert.equal(sha256(recording), before);

  // The approved result is the Vídeo's Master from now on; the Original stays recorded as such.
  assert.equal(masterField(video), 'master/Gravação de terça.mp4');
  assert.match(fs.readFileSync(path.join(video, 'video.md'), 'utf8'), /^original: original\/Gravação de terça\.mp4$/m);

  // Every word time now follows the Master's clock; the Original's transcript is kept aside.
  const palavras = (rel) => JSON.parse(fs.readFileSync(path.join(video, 'transcricao', ...rel), 'utf8'));
  assert.deepEqual(palavras(['palavras.json']), [{ w: 'um', s: 0.2, e: 0.6 }, { w: 'dois', s: 1.2, e: 1.6 }]);
  assert.deepEqual(palavras(['original', 'palavras.json']), FALA);
  const transcript = fs.readFileSync(path.join(video, 'transcricao', 'transcript.md'), 'utf8');
  assert.deepEqual(transcript.split('\n').filter((line) => line.startsWith('[')), ['[00:00.200] um', '[00:01.200] dois']);
  assert.deepEqual(run('estado', dir).out.errors, []);
});

test('precorte never cuts a word in half, and then writes nothing', needsTools, () => {
  const { dir, video } = estudioComVideo(clip);
  transcricao(video, FALA);
  // The first kept segment ends at 0.4 s, in the middle of "um" (0.2–0.6 s).
  const manter = JSON.stringify({ manter: [{ inicio: 0, fim: 0.4 }, { inicio: 2, fim: 3 }] });

  const { code, out } = run('precorte', dir, 'Minha Empresa', 'Dica rápida', manter, tools.ffmpeg, tools.ffprobe);
  assert.equal(code, 0);
  assert.equal(out.cut, false);
  assert.equal(out.reason, 'cuts-a-word');
  assert.deepEqual(out.palavras, [{ w: 'um', s: 0.2, e: 0.6, corte: 0.4 }]);
  assert.equal(fs.existsSync(path.join(video, 'master')), false);
  assert.equal(masterField(video), 'original/Gravação de terça.mp4');
});

test('once the Pré-corte is applied the Master is locked: it is never cut again', needsTools, () => {
  const { dir, video } = estudioComVideo(clip);
  transcricao(video, FALA);
  assert.equal(run('precorte', dir, 'Minha Empresa', 'Dica rápida', MANTER, tools.ffmpeg, tools.ffprobe).out.cut, true);
  const master = sha256(path.join(video, 'master', 'Gravação de terça.mp4'));

  const again = JSON.stringify({ manter: [{ inicio: 0, fim: 1 }] });
  const { out } = run('precorte', dir, 'Minha Empresa', 'Dica rápida', again, tools.ffmpeg, tools.ffprobe);
  assert.equal(out.cut, false);
  assert.equal(out.reason, 'master-locked');
  assert.equal(sha256(path.join(video, 'master', 'Gravação de terça.mp4')), master);
  assert.equal(masterField(video), 'master/Gravação de terça.mp4');
});

test('precorte refuses a Vídeo already in the Plano: the Plano is timed on its Master', () => {
  const { dir, video } = estudioComVideo('gravação');
  transcricao(video, FALA);
  assert.equal(run('registrar-video', dir, 'Minha Empresa', 'Dica rápida', '{"status": "Planejamento"}').out.recorded, true);

  const { out } = run('precorte', dir, 'Minha Empresa', 'Dica rápida', MANTER, 'ffmpeg', 'ffprobe');
  assert.deepEqual(out, {
    cut: false, reason: 'master-locked', projeto: 'Minha Empresa', video: 'Dica rápida',
    master: 'original/Gravação de terça.mp4', status: 'Planejamento',
  });
  assert.equal(masterField(video), 'original/Gravação de terça.mp4');
});

test('precorte takes only kept segments in order, without overlaps', () => {
  const { dir, video } = estudioComVideo('gravação');
  transcricao(video, FALA);
  const refused = (manter) => run('precorte', dir, 'Minha Empresa', 'Dica rápida', manter, 'ffmpeg', 'ffprobe').out;

  assert.equal(refused('{"manter": []}').reason, 'invalid-segments');
  assert.equal(refused('not json').reason, 'invalid-segments');
  assert.match(refused('{"manter": [{"inicio": 1, "fim": 0.5}]}').message, /fim after inicio/);
  assert.match(refused('{"manter": [{"inicio": 0, "fim": 2}, {"inicio": 1, "fim": 3}]}').message, /overlaps/);
  assert.equal(masterField(video), 'original/Gravação de terça.mp4');
});
