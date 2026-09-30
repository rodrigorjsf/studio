// Seam 1 — the deterministic CLI, for starting a Vídeo (ticket #9): `novo-video` (the Original
// kept untouched, the Vídeo document with Status, Nível and metric counters, the briefing that
// asks only what the Kit does not answer), `registrar-video` (Nível and counters as the
// Diretor records them) and `zona-do-rosto` (the Zona do rosto from per-frame measurements over
// the whole clip). Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on
// its JSON output, exit code and the files it produces.
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

// The real sampler test needs the provisioned programs, found as the Diretor finds them
// (see tests/amostrar.test.mjs); without them it is skipped with the reason.
const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
const needsTools = tools.python && tools.ffmpeg && tools.ffprobe ? {} : { skip: 'no provisioned Python/ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)' };

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// A fresh Estúdio with a Perfil and one approved Projeto ("Minha Empresa"), under a path with
// spaces and accents as on her Mac, plus a recording of hers outside the Estúdio.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio vídeo '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  aprovado(dir, 'Minha Empresa');
  return { root, dir };
}

// A Projeto whose Grilling is answered and whose Kit is approved: usable for Vídeos.
function aprovado(dir, nome) {
  run('novo-projeto', dir, nome);
  const file = path.join(dir, 'projetos', nome, 'projeto.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, nome).out.approved, true);
}

// A recording of hers: arbitrary bytes stand in for the video (the CLI never decodes it).
function gravacao(root, nome = 'Gravação de terça.mp4', bytes = 'vídeo gravado pela Criadora') {
  const file = path.join(root, 'Downloads', nome);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return file;
}

const videoDir = (dir, projeto, video) => path.join(dir, 'projetos', projeto, 'videos', video);

test('novo-video stores the Original untouched and opens the Vídeo in Briefing, waiting for her', () => {
  const { root, dir } = estudio();
  const recording = gravacao(root);
  const before = sha256(recording);

  const { code, out } = run('novo-video', dir, 'Minha Empresa', 'Dica rápida', recording);
  assert.equal(code, 0);
  assert.equal(out.created, true);
  assert.equal(out.projeto, 'Minha Empresa');
  assert.equal(out.video, 'Dica rápida');
  assert.equal(out.original, 'original/Gravação de terça.mp4');

  const stored = path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'original', 'Gravação de terça.mp4');
  assert.equal(sha256(stored), before, 'the Original is byte-identical to her recording');
  assert.equal(sha256(recording), before, 'her own file is left exactly as it was');
  // Ready for the ingest: where her Prints go, and where the frames the studio watches go.
  for (const folder of ['prints', 'frames/visao-geral', 'frames/zona-do-rosto']) {
    assert.ok(fs.statSync(path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), folder)).isDirectory(), folder);
  }

  const state = run('estado', dir).out;
  assert.deepEqual(state.errors, []);
  const video = state.projetos[0].videos[0];
  assert.equal(video.id, 'Dica rápida');
  assert.equal(video.status, 'Briefing');
  assert.equal(video.nivel, null, 'the Nível is chosen in the briefing');
  assert.equal(video.waitingForCriadora, true);
  assert.deepEqual(state.waiting, [{ projeto: 'Minha Empresa', video: 'Dica rápida', status: 'Briefing' }]);
});

test('two recordings make two Vídeos, and a Vídeo never takes a second recording', () => {
  const { root, dir } = estudio();
  const primeira = gravacao(root, 'parte 1.mov', 'primeira gravação');
  const segunda = gravacao(root, 'parte 2.mov', 'segunda gravação');

  assert.equal(run('novo-video', dir, 'Minha Empresa', 'Receita', primeira).out.created, true);
  assert.equal(run('novo-video', dir, 'Minha Empresa', 'Receita parte 2', segunda).out.created, true);
  const originals = (video) => fs.readdirSync(path.join(videoDir(dir, 'Minha Empresa', video), 'original'));
  assert.deepEqual(originals('Receita'), ['parte 1.mov']);
  assert.deepEqual(originals('Receita parte 2'), ['parte 2.mov']);

  // The second recording offered to the first Vídeo, under its name: refused, nothing changes.
  const { code, out } = run('novo-video', dir, 'Minha Empresa', 'Receita', segunda);
  assert.equal(code, 0);
  assert.deepEqual(out, { created: false, reason: 'already-exists', projeto: 'Minha Empresa', video: 'Receita' });
  assert.deepEqual(originals('Receita'), ['parte 1.mov']);
  const stored = path.join(videoDir(dir, 'Minha Empresa', 'Receita'), 'original', 'parte 1.mov');
  assert.equal(fs.readFileSync(stored, 'utf8'), 'primeira gravação');

  const videos = run('estado', dir).out.projetos[0].videos.map((v) => v.id);
  assert.deepEqual(videos, ['Receita', 'Receita parte 2']);
});

test('novo-video refuses a Projeto that cannot take a Vídeo yet, and a recording that is not there', () => {
  const { root, dir } = estudio();
  const recording = gravacao(root);
  run('novo-projeto', dir, 'Pessoal');

  assert.deepEqual(run('novo-video', dir, 'Pessoal', 'Primeiro', recording).out,
    { created: false, reason: 'kit-not-approved', projeto: 'Pessoal', kit: 'aguardando-aprovacao' });
  assert.deepEqual(run('novo-video', dir, 'Outro', 'Primeiro', recording).out, { created: false, reason: 'unknown-projeto' });
  const missing = path.join(root, 'Downloads', 'não existe.mp4');
  assert.deepEqual(run('novo-video', dir, 'Minha Empresa', 'Primeiro', missing).out,
    { created: false, reason: 'recording-not-found', recording: missing });
  assert.equal(run('novo-video', dir, 'Minha Empresa', 'a/b', recording).out.reason, 'invalid-name');
  assert.equal(fs.existsSync(path.join(dir, 'projetos', 'Pessoal', 'videos')), false, 'nothing was created');
  assert.equal(fs.existsSync(path.join(dir, 'projetos', 'Minha Empresa', 'videos')), false, 'nothing was created');
});

test('the Vídeo briefing asks only what the Kit does not answer, and waits until it is answered', () => {
  const { root, dir } = estudio();
  // Her Kit settled everything except how she behaves on camera: that one gap is asked again.
  const kitFile = path.join(dir, 'projetos', 'Minha Empresa', 'kit.json');
  const kit = JSON.parse(fs.readFileSync(kitFile, 'utf8'));
  kit.camera = { comportamento: '', enquadramento: 'selfie na mesa, rosto no terço superior' };
  kit.imagens.interacao = 'tela dividida';
  fs.writeFileSync(kitFile, JSON.stringify(kit));

  const { out } = run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  assert.deepEqual(out.briefing.perguntas, ['objetivo', 'chamada-para-acao', 'momentos-chave', 'o-que-muda-do-kit', 'nivel']);
  assert.deepEqual(out.briefing.lacunasDoKit, ['camera.comportamento']);

  // The document holds one pt-BR section per answer she gives, none per Kit topic.
  const doc = fs.readFileSync(path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'video.md'), 'utf8');
  const headings = [...doc.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, ['Objetivo', 'Chamada para ação', 'Momentos-chave', 'O que muda do Kit', 'Prints que ajudariam']);

  let video = run('estado', dir).out.projetos[0].videos[0];
  assert.equal(video.briefing, 'incompleto');
  fs.writeFileSync(path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'video.md'), doc.replaceAll('_A preencher na entrevista._', 'Respondido.'));
  video = run('estado', dir).out.projetos[0].videos[0];
  assert.equal(video.briefing, 'completo');
});

// The Vídeo document's frontmatter, read as the plain `key: value` lines she could open.
function record(dir, projeto, video) {
  const text = fs.readFileSync(path.join(videoDir(dir, projeto, video), 'video.md'), 'utf8');
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)[1];
  return Object.fromEntries(block.split('\n').map((line) => /^([\w-]+):\s?(.*)$/.exec(line).slice(1)));
}

test('the Vídeo document records Status, Nível, cost and the metric counters from the start', () => {
  const { root, dir } = estudio();
  const before = Date.now();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  const fields = record(dir, 'Minha Empresa', 'Dica rápida');

  assert.equal(fields.status, 'Briefing');
  assert.equal(fields.nivel, '');
  assert.equal(fields.original, 'original/Gravação de terça.mp4');
  assert.equal(fields.master, 'original/Gravação de terça.mp4', 'the Master is the Original until a Pré-corte');
  assert.equal(fields.creditosEstimados, '');
  assert.equal(fields.creditosGastos, '0');
  assert.equal(fields.perguntas, '0');
  assert.equal(fields.gates, '0');
  assert.equal(fields.aprovacoesAutomaticas, '0');
  assert.ok(Date.parse(fields.iniciadoEm) >= before - 1000, `iniciadoEm is when the Vídeo started (got ${fields.iniciadoEm})`);
  assert.equal(fields.entregueEm, '');
});

test('registrar-video records the Nível chosen per Vídeo and adds up the questions and Gates', () => {
  const { root, dir } = estudio();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root, 'a.mp4'));
  run('novo-video', dir, 'Minha Empresa', 'Lançamento', gravacao(root, 'b.mp4'));

  let { code, out } = run('registrar-video', dir, 'Minha Empresa', 'Dica rápida', '{"nivel": 1, "somar": {"perguntas": 4, "gates": 1}}');
  assert.equal(code, 0);
  assert.equal(out.recorded, true);
  ({ out } = run('registrar-video', dir, 'Minha Empresa', 'Dica rápida', '{"status": "Planejamento", "somar": {"perguntas": 1}}'));
  assert.equal(out.recorded, true);
  run('registrar-video', dir, 'Minha Empresa', 'Lançamento', '{"nivel": 2, "somar": {"perguntas": 2, "aprovacoesAutomaticas": 1}}');

  const dica = record(dir, 'Minha Empresa', 'Dica rápida');
  assert.deepEqual([dica.status, dica.nivel, dica.perguntas, dica.gates, dica.aprovacoesAutomaticas], ['Planejamento', '1', '5', '1', '0']);
  const lancamento = record(dir, 'Minha Empresa', 'Lançamento');
  assert.deepEqual([lancamento.status, lancamento.nivel, lancamento.perguntas, lancamento.aprovacoesAutomaticas], ['Briefing', '2', '2', '1']);
  assert.equal(lancamento.original, 'original/b.mp4', 'the rest of the record is kept');
  const doc = fs.readFileSync(path.join(videoDir(dir, 'Minha Empresa', 'Lançamento'), 'video.md'), 'utf8');
  assert.match(doc, /## Momentos-chave/, 'the briefing body is kept');

  const state = run('estado', dir).out;
  assert.deepEqual(state.errors, []);
  assert.deepEqual(state.projetos[0].videos.map((v) => [v.id, v.status, v.nivel]), [['Dica rápida', 'Planejamento', 1], ['Lançamento', 'Briefing', 2]]);
});

test('registrar-video refuses what is not a valid record and changes nothing', () => {
  const { root, dir } = estudio();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  const doc = path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'video.md');
  const untouched = fs.readFileSync(doc, 'utf8');

  for (const [edit, message] of [
    ['{"nivel": 3}', 'nivel must be 1 or 2'],
    ['{"status": "Pronto"}', 'status must be one of: Briefing, Planejamento, Construção, QC interno, Revisão, Ajustes, Aprovado, Entregue, Arquivado'],
    ['{"somar": {"perguntas": -1}}', 'somar.perguntas must be a whole number, 0 or more'],
    ['{"somar": {"minutos": 3}}', 'somar.minutos is not a counter (perguntas, gates, aprovacoesAutomaticas)'],
    ['{"original": "outro.mp4"}', 'original cannot be recorded here (nivel, status, somar)'],
    ['nível um', 'not valid JSON'],
  ]) {
    const { out } = run('registrar-video', dir, 'Minha Empresa', 'Dica rápida', edit);
    assert.equal(out.recorded, false, edit);
    assert.equal(out.reason, 'invalid-record', edit);
    assert.ok(out.message.startsWith(message), `${edit}: ${out.message}`);
  }
  assert.deepEqual(run('registrar-video', dir, 'Minha Empresa', 'Outro', '{"nivel": 1}').out, { recorded: false, reason: 'unknown-video', projeto: 'Minha Empresa' });
  assert.equal(fs.readFileSync(doc, 'utf8'), untouched);
});

test('estado holds a Vídeo whose counters or timestamps are malformed', () => {
  const { root, dir } = estudio();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  const doc = path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'video.md');
  fs.writeFileSync(doc, fs.readFileSync(doc, 'utf8').replace('perguntas: 0', 'perguntas: -2').replace(/iniciadoEm: .*/, 'iniciadoEm: ontem'));

  const { out } = run('estado', dir);
  assert.deepEqual(out.errors, [
    { file: 'projetos/Minha Empresa/videos/Dica rápida/video.md', message: 'perguntas -2 must be a whole number, 0 or more' },
    { file: 'projetos/Minha Empresa/videos/Dica rápida/video.md', message: 'iniciadoEm "ontem" must be a date (ISO)' },
  ]);
  assert.deepEqual(out.nextStep, { action: 'corrigir-erros' });
});

// What the frame sampler prints in face-zone mode (tests/amostrar.test.mjs holds it to this
// shape), for a clip of `duration` seconds sampled at the given timestamps.
function amostras(duration, timestamps, extra = {}) {
  return {
    modo: 'zona-do-rosto',
    meta: { duration_seconds: duration, width: 1080, height: 1920, codec: 'h264', size_bytes: 1, has_audio: true, has_video: true },
    dedup: false,
    fps: 1,
    engine: 'uniform',
    frames: timestamps.map((t, index) => ({ index, timestamp_seconds: t, path: `frame_${index}.jpg`, reason: 'uniform' })),
    ...extra,
  };
}

// The Assistente de edição's work, stood in for: the sampler's JSON and one face box per frame.
function medir(dir, video, samples, measurements) {
  const faces = path.join(videoDir(dir, 'Minha Empresa', video), 'frames', 'zona-do-rosto');
  fs.mkdirSync(faces, { recursive: true });
  fs.writeFileSync(path.join(faces, 'amostras.json'), JSON.stringify(samples));
  fs.writeFileSync(path.join(faces, 'medicoes.json'), JSON.stringify(measurements));
}

test('zona-do-rosto joins the face measured on every frame of the whole clip into one Zona do rosto', () => {
  const { root, dir } = estudio();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  // She leans from the center to the right; at 3 s she steps out of frame for a moment.
  medir(dir, 'Dica rápida', amostras(4.2, [0, 1, 2, 3, 4]), [
    { t: 0, rosto: { x: 0.35, y: 0.2, largura: 0.3, altura: 0.2 } },
    { t: 1, rosto: { x: 0.4, y: 0.22, largura: 0.3, altura: 0.2 } },
    { t: 2, rosto: { x: 0.5, y: 0.25, largura: 0.3, altura: 0.21 } },
    { t: 3, rosto: null },
    { t: 4, rosto: { x: 0.45, y: 0.2, largura: 0.3, altura: 0.2 } },
  ]);

  const { code, out } = run('zona-do-rosto', dir, 'Minha Empresa', 'Dica rápida');
  assert.equal(code, 0);
  assert.equal(out.measured, true);
  // The union of every box (x 0.35–0.8, y 0.2–0.46), widened by a 0.05 margin on each side.
  assert.deepEqual(out.zona, { x: 0.3, y: 0.15, largura: 0.55, altura: 0.36 });
  assert.equal(out.margem, 0.05);
  assert.equal(out.quadros, 5);
  assert.equal(out.quadrosComRosto, 4);
  assert.equal(out.duracao, 4.2);

  const stored = JSON.parse(fs.readFileSync(path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'zona-do-rosto.json'), 'utf8'));
  assert.deepEqual(stored.zona, out.zona);
  assert.ok(!Number.isNaN(Date.parse(stored.medidoEm)));
});

test('zona-do-rosto refuses a measurement that does not cover the whole clip, frame by frame', () => {
  const { root, dir } = estudio();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  const face = { x: 0.3, y: 0.2, largura: 0.3, altura: 0.2 };
  const zona = () => run('zona-do-rosto', dir, 'Minha Empresa', 'Dica rápida').out;

  assert.equal(zona().reason, 'no-samples', 'nothing sampled yet');

  // Only the second half of a 10 s clip was sampled.
  medir(dir, 'Dica rápida', amostras(10, [5, 6, 7, 8, 9]), [5, 6, 7, 8, 9].map((t) => ({ t, rosto: face })));
  assert.equal(zona().reason, 'not-whole-clip');

  // The overview pass (near-duplicates dropped) is not a face-zone measurement.
  medir(dir, 'Dica rápida', amostras(3, [0, 1, 2], { modo: 'visao-geral', dedup: true }), [0, 1, 2].map((t) => ({ t, rosto: face })));
  assert.equal(zona().reason, 'not-whole-clip');

  // Every frame sampled, but the face was not measured on two of them.
  medir(dir, 'Dica rápida', amostras(4, [0, 1, 2, 3]), [{ t: 0, rosto: face }, { t: 2, rosto: face }]);
  assert.deepEqual(zona(), { measured: false, reason: 'unmeasured-frames', timestamps: [1, 3] });

  // A box that leaves the frame.
  medir(dir, 'Dica rápida', amostras(2, [0, 1]), [{ t: 0, rosto: face }, { t: 1, rosto: { x: 0.8, y: 0.2, largura: 0.3, altura: 0.2 } }]);
  assert.deepEqual(zona(), { measured: false, reason: 'invalid-measurements', errors: ['t=1: the box leaves the frame (x + largura above 1)'] });

  assert.equal(fs.existsSync(path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'zona-do-rosto.json')), false);
});

test('estado tells what of the ingest is done, so an interrupted Vídeo resumes where it stopped', () => {
  const { root, dir } = estudio();
  run('novo-video', dir, 'Minha Empresa', 'Dica rápida', gravacao(root));
  const ingest = () => run('estado', dir).out.projetos[0].videos[0].ingest;
  assert.deepEqual(ingest(), { transcricao: false, zonaDoRosto: false });

  const transcricao = path.join(videoDir(dir, 'Minha Empresa', 'Dica rápida'), 'transcricao');
  fs.mkdirSync(transcricao);
  fs.writeFileSync(path.join(transcricao, 'palavras.json'), JSON.stringify([{ w: 'Oi', s: 0.1, e: 0.4 }, { w: 'gente', s: 0.45, e: 0.9 }]));
  assert.deepEqual(ingest(), { transcricao: true, zonaDoRosto: false });

  medir(dir, 'Dica rápida', amostras(2, [0, 1]), [{ t: 0, rosto: null }, { t: 1, rosto: null }]);
  assert.equal(run('zona-do-rosto', dir, 'Minha Empresa', 'Dica rápida').out.zona, null, 'no face on screen: nothing to keep free');
  assert.deepEqual(ingest(), { transcricao: true, zonaDoRosto: true });

  // A transcript that is not word-timed is an error, not a finished ingest.
  fs.writeFileSync(path.join(transcricao, 'palavras.json'), JSON.stringify([{ w: 'Oi' }]));
  const state = run('estado', dir).out;
  assert.deepEqual(state.errors, [{ file: 'projetos/Minha Empresa/videos/Dica rápida/transcricao/palavras.json', message: 'word 0 must be {w, s, e}: the word, its start and its end in seconds' }]);
  assert.equal(state.projetos[0].videos[0].ingest.transcricao, false);
});

test('a real face-zone run of the sampler, saved as the Assistente de edição does, is accepted as covering the whole clip', needsTools, () => {
  const { root, dir } = estudio();
  const clip = path.join(root, 'Downloads', 'Gravação vertical.mp4');
  fs.mkdirSync(path.dirname(clip), { recursive: true });
  const made = spawnSync(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=s=180x320:r=25:d=3.5', '-pix_fmt', 'yuv420p', clip], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const { original } = run('novo-video', dir, 'Minha Empresa', 'Vertical', clip).out;

  const video = videoDir(dir, 'Minha Empresa', 'Vertical');
  const faces = path.join(video, 'frames', 'zona-do-rosto');
  const sampled = spawnSync(tools.python, [path.join(pluginRoot, 'scripts', 'frames', 'amostrar.py'), path.join(video, ...original.split('/')), faces,
    '--modo', 'zona-do-rosto', '--ffmpeg', tools.ffmpeg, '--ffprobe', tools.ffprobe], { encoding: 'utf8' });
  assert.equal(sampled.status, 0, sampled.stderr);
  fs.writeFileSync(path.join(faces, 'amostras.json'), sampled.stdout);
  const frames = JSON.parse(sampled.stdout).frames;
  fs.writeFileSync(path.join(faces, 'medicoes.json'), JSON.stringify(frames.map((f) => ({ t: f.timestamp_seconds, rosto: { x: 0.3, y: 0.1, largura: 0.4, altura: 0.25 } }))));

  const { out } = run('zona-do-rosto', dir, 'Minha Empresa', 'Vertical');
  assert.equal(out.measured, true, JSON.stringify(out));
  assert.equal(out.quadros, frames.length);
  assert.deepEqual(out.zona, { x: 0.25, y: 0.05, largura: 0.5, altura: 0.35 });
});
