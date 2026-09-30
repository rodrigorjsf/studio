// Seam 1 — the deterministic CLI, for Higgsedit on request (ticket #16): Higgsedit, Higgsfield's
// cloud editor, montages a part of the Vídeo (or all of it) only when the Criadora explicitly asks
// for one of its own effects. `aprovar-higgsedit` is its own cost Gate (her request in her words,
// the part of the Vídeo, the estimate, her balance, the Kit's budget) and `gastar-higgsedit` holds
// every paid Higgsedit run: nothing before that Gate, and ~20% over its estimate stops the work.
// The result then passes the same technical QC (`qc`) as any render of the edit.
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// the Vídeo's record as its document and `estado` report it, and the files it writes.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseFrontmatter } from '../plugin/estudio/scripts/lib/frontmatter.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const cli = path.join(pluginRoot, 'scripts', 'estudio.mjs');

// ffmpeg and ffprobe, found as the Diretor finds them; the QC seam cannot run without them.
const check = spawnSync('/bin/sh', [path.join(pluginRoot, 'scripts', 'verificar.sh'), '--json', process.env.ESTUDIO_DADOS ?? '', '.'], { encoding: 'utf8' });
const { tools } = JSON.parse(check.stdout || '{"tools":{}}');
const needsFfmpeg = tools.ffmpeg && tools.ffprobe ? {} : { skip: 'no provisioned ffmpeg (set ESTUDIO_DADOS to an installed plugin data folder)' };

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

const PROJETO = 'Minha Empresa';
const VIDEO = 'Dica rápida';
const PEDIDO = 'Quero aquele efeito de transição em 3D do Higgsedit na virada do gancho.';
const TRECHO = { inicio: 0.5, fim: 2.5 };

// A fresh Estúdio (a path with spaces and accents, as on her Mac) with one approved Projeto and one
// Vídeo whose Plano she approved: Nível 2, in Construção, the Plano expecting `estimados` credits
// of generation. `gravacao` is her recording (a stand-in file unless a real one is given).
function videoNivel2({ estimados = 100, nivel = 2, planoAprovado = true, creditos, gravacao } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio higgsedit '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const projetoDir = path.join(dir, 'projetos', PROJETO);
  const briefing = path.join(projetoDir, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  if (creditos) {
    const kitFile = path.join(projetoDir, 'kit.json');
    const kit = JSON.parse(fs.readFileSync(kitFile, 'utf8'));
    fs.writeFileSync(kitFile, JSON.stringify({ ...kit, creditos }, null, 2));
  }
  let recording = gravacao;
  if (!recording) {
    recording = path.join(root, 'gravação.mp4');
    fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  }
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  const video = path.join(projetoDir, 'videos', VIDEO);
  fs.writeFileSync(path.join(video, 'plano.json'), JSON.stringify({
    schemaVersion: 1,
    tempoEstimadoMin: 30,
    creditosEstimados: estimados,
    aprovadoEm: planoAprovado ? '2026-09-30T10:00:00.000Z' : null,
    quadrosAprovadosEm: planoAprovado ? '2026-09-30T10:00:00.000Z' : null,
  }, null, 2));
  const status = planoAprovado ? 'Construção' : 'Planejamento';
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, JSON.stringify({ nivel, status })).out.recorded, true);
  return { root, dir, video };
}

const aprovarCreditos = (dir, input) => run('aprovar-creditos', dir, PROJETO, VIDEO, JSON.stringify(input)).out;
const aprovarHiggsedit = (dir, input) => run('aprovar-higgsedit', dir, PROJETO, VIDEO, JSON.stringify(input)).out;
const pedido = (extra = {}) => ({ pedido: PEDIDO, trecho: TRECHO, creditosEstimados: 30, saldo: 500, ...extra });
// The Vídeo's record, as the frontmatter of video.md holds it.
const registro = (video) => parseFrontmatter(fs.readFileSync(path.join(video, 'video.md'), 'utf8'));
const pedidos = (video) => JSON.parse(fs.readFileSync(path.join(video, 'higgsedit', 'pedidos.json'), 'utf8'));

test('Higgsedit runs only on her explicit request: without her words its Gate refuses and nothing changes', () => {
  const { dir, video } = videoNivel2();
  const { pedido: _semPedido, ...semPedido } = pedido();
  for (const input of [semPedido, pedido({ pedido: '' }), pedido({ pedido: '   ' })]) {
    const out = aprovarHiggsedit(dir, input);
    assert.equal(out.approved, false, JSON.stringify(out));
    assert.equal(out.reason, 'no-request');
  }
  const record = registro(video);
  assert.equal(record.gates, 0);
  assert.equal(record.higgseditAprovadoEm, undefined);
  assert.equal(fs.existsSync(path.join(video, 'higgsedit')), false);
});

test('her Higgsedit cost Gate is its own: her request, the part of the Vídeo and its estimate, one more Gate, the generation credits untouched', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  assert.equal(aprovarCreditos(dir, { saldo: 500 }).gates, 1);
  const out = aprovarHiggsedit(dir, pedido());
  assert.equal(out.approved, true, JSON.stringify(out));
  assert.equal(out.pedido, PEDIDO);
  assert.deepEqual(out.trecho, TRECHO);
  assert.equal(out.creditosEstimados, 30);
  assert.equal(out.limite, 36);
  assert.equal(out.gates, 2);
  const record = registro(video);
  assert.equal(record.higgseditCreditosEstimados, 30);
  assert.equal(record.higgseditCreditosGastos, 0);
  assert.ok(!Number.isNaN(Date.parse(record.higgseditAprovadoEm)));
  // The generation credits keep their own Gate and estimate.
  assert.equal(record.creditosEstimados, 100);
  const [registrado] = pedidos(video);
  assert.equal(registrado.pedido, PEDIDO);
  assert.deepEqual(registrado.trecho, TRECHO);
  assert.equal(registrado.creditosEstimados, 30);
  assert.deepEqual(run('estado', dir).out.errors, []);
  // The whole Vídeo can be montaged in Higgsedit too, when that is what she asked for.
  const inteiro = aprovarHiggsedit(dir, pedido({ trecho: 'video-inteiro', creditosEstimados: 60 }));
  assert.equal(inteiro.approved, true, JSON.stringify(inteiro));
  assert.equal(inteiro.trecho, 'video-inteiro');
  assert.equal(pedidos(video).length, 2);
});

test('only a Nível 2 Vídeo whose Plano she approved, with a balance that covers it and a real stretch of her Master', () => {
  const nivel1 = videoNivel2({ nivel: 1 });
  assert.equal(aprovarHiggsedit(nivel1.dir, pedido()).reason, 'not-nivel-2');
  const rascunho = videoNivel2({ planoAprovado: false });
  assert.equal(aprovarHiggsedit(rascunho.dir, pedido()).reason, 'plano-not-approved');
  const { dir, video } = videoNivel2();
  const semSaldo = aprovarHiggsedit(dir, pedido({ saldo: 29 }));
  assert.equal(semSaldo.reason, 'insufficient-balance');
  for (const trecho of [{ inicio: 2, fim: 1 }, { inicio: -1, fim: 1 }, { inicio: 0 }, 'abertura', null]) {
    assert.equal(aprovarHiggsedit(dir, pedido({ trecho })).reason, 'invalid-input', JSON.stringify(trecho));
  }
  assert.equal(registro(video).gates, 0);
  assert.equal(fs.existsSync(path.join(video, 'higgsedit')), false);
});

test('the Kit\'s budget holds the generation credits and Higgsedit together, per Vídeo and per month', () => {
  const porVideo = videoNivel2({ estimados: 100, creditos: { porVideo: 120, porMes: null } });
  assert.equal(aprovarCreditos(porVideo.dir, { saldo: 500 }).approved, true);
  const out = aprovarHiggsedit(porVideo.dir, pedido({ creditosEstimados: 30 }));
  assert.equal(out.reason, 'over-budget');
  assert.equal(out.aprovadosNoVideo, 100);
  assert.equal(aprovarHiggsedit(porVideo.dir, pedido({ creditosEstimados: 20 })).approved, true);
  // Higgsedit approved first also counts when the generation credits come to her Gate.
  const primeiro = videoNivel2({ estimados: 100, creditos: { porVideo: 120, porMes: null } });
  assert.equal(aprovarHiggsedit(primeiro.dir, pedido({ creditosEstimados: 30 })).approved, true);
  assert.equal(aprovarCreditos(primeiro.dir, { saldo: 500 }).reason, 'over-budget');

  // Per month: another Vídeo of the Projeto was approved 50 credits of Higgsedit this month.
  const porMes = videoNivel2({ estimados: 60, creditos: { porVideo: null, porMes: 100 } });
  const outro = path.join(porMes.dir, 'projetos', PROJETO, 'videos', 'Outro vídeo');
  fs.mkdirSync(outro);
  fs.writeFileSync(path.join(outro, 'video.md'),
    `---\nstatus: Entregue\nnivel: 2\nhiggseditCreditosEstimados: 50\nhiggseditCreditosGastos: 40\nhiggseditAprovadoEm: ${new Date().toISOString()}\n---\n# Outro vídeo\n`);
  assert.equal(aprovarCreditos(porMes.dir, { saldo: 500 }).reason, 'over-budget');
  assert.equal(aprovarCreditos(porMes.dir, { saldo: 500, creditosEstimados: 40 }).approved, true);
  // Her own generation credits, approved this month, count against Higgsedit on the same Vídeo.
  assert.equal(aprovarHiggsedit(porMes.dir, pedido({ creditosEstimados: 11 })).reason, 'over-budget');
  assert.equal(aprovarHiggsedit(porMes.dir, pedido({ creditosEstimados: 10 })).approved, true);
});

const gastarHiggsedit = (dir, input) => run('gastar-higgsedit', dir, PROJETO, VIDEO, JSON.stringify(input)).out;
const execucao = (arquivo, creditos, saldo = 500) => ({ arquivo, creditos, saldo });
const execucoes = (video) => JSON.parse(fs.readFileSync(path.join(video, 'higgsedit', 'higgsedit.json'), 'utf8'));

test('nothing runs on Higgsedit before its own Gate, even with the generation credits approved', () => {
  const { dir, video } = videoNivel2();
  assert.equal(aprovarCreditos(dir, { saldo: 500 }).approved, true);
  const out = gastarHiggsedit(dir, execucao('higgsedit/01_transicao.mp4', 5));
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'no-higgsedit-approval');
  assert.equal(registro(video).higgseditCreditosGastos, undefined);
  assert.equal(fs.existsSync(path.join(video, 'higgsedit', 'higgsedit.json')), false);
});

test('each paid Higgsedit run is cleared first, and what it montages goes into the Vídeo\'s higgsedit folder, once', () => {
  const { dir, video } = videoNivel2();
  assert.equal(aprovarHiggsedit(dir, pedido({ creditosEstimados: 30 })).approved, true);
  const out = gastarHiggsedit(dir, execucao('higgsedit/01_transicao.mp4', 12, 470));
  assert.equal(out.authorized, true, JSON.stringify(out));
  assert.equal(out.creditosGastos, 12);
  assert.equal(out.limite, 36);
  assert.equal(out.restante, 24);
  assert.equal(out.destino, path.join(video, 'higgsedit', '01_transicao.mp4'));
  assert.equal(registro(video).higgseditCreditosGastos, 12);
  const [entrada] = execucoes(video);
  assert.equal(entrada.arquivo, 'higgsedit/01_transicao.mp4');
  assert.equal(entrada.creditos, 12);
  assert.deepEqual(run('estado', dir).out.errors, []);

  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/02_render.mp4', 10, 9)).reason, 'insufficient-balance');
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/01_transicao.mp4', 1)).reason, 'duplicate-file');
  for (const arquivo of ['gerados/01.mp4', 'higgsedit/../original/x.mp4', 'higgsedit/still.png', 'higgsedit/a/b.mp4', '../x.mp4']) {
    assert.equal(gastarHiggsedit(dir, execucao(arquivo, 1)).reason, 'invalid-input', arquivo);
  }
  const segredo = gastarHiggsedit(dir, { ...execucao('higgsedit/03.mp4', 1), apiKey: 'hf-secret-123' });
  assert.equal(segredo.reason, 'invalid-input');
  assert.doesNotMatch(fs.readFileSync(path.join(video, 'video.md'), 'utf8'), /hf-secret-123/);
});

test('spending ~20% over the Higgsedit estimate stops the work; only her new Higgsedit approval lifts it', () => {
  const { dir, video } = videoNivel2({ estimados: 100 });
  assert.equal(aprovarCreditos(dir, { saldo: 500 }).approved, true);
  assert.equal(aprovarHiggsedit(dir, pedido({ creditosEstimados: 30 })).approved, true);
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/01.mp4', 20)).authorized, true);
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/02.mp4', 16)).authorized, true);
  const out = gastarHiggsedit(dir, execucao('higgsedit/03.mp4', 1));
  assert.equal(out.authorized, false);
  assert.equal(out.reason, 'over-limit');
  assert.equal(out.creditosGastos, 36);
  assert.equal(out.limite, 36);
  // Stopped: the Vídeo waits for her, and nothing more is paid, generation included.
  assert.equal(run('estado', dir).out.projetos[0].videos[0].waitingForCriadora, true);
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/03.mp4', 0.5)).reason, 'awaiting-approval');
  const imagem = { arquivo: 'gerados/01.png', creditos: 2, saldo: 500, modelo: 'nano_banana_pro', prompt: 'A timer. No text.' };
  assert.equal(run('gastar-creditos', dir, PROJETO, VIDEO, JSON.stringify(imagem)).out.reason, 'awaiting-approval');
  // Approving the generation credits again, or closing the Gate by hand, does not lift it.
  assert.equal(aprovarCreditos(dir, { saldo: 500 }).approved, true);
  assert.equal(registro(video).gate, 'aberto');
  run('registrar-video', dir, PROJETO, VIDEO, '{"gate": null}');
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/03.mp4', 1)).reason, 'awaiting-approval');

  assert.equal(aprovarHiggsedit(dir, pedido({ creditosEstimados: 35 })).reason, 'below-spent');
  const nova = aprovarHiggsedit(dir, pedido({ creditosEstimados: 50 }));
  assert.equal(nova.approved, true);
  assert.equal(nova.creditosGastos, 36);
  assert.equal(registro(video).gate, null);
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/03.mp4', 1)).authorized, true);
});

test('with both budgets stopped, lifting one stop leaves the Vídeo waiting for her on the other', () => {
  const { dir, video } = videoNivel2({ estimados: 10 });
  assert.equal(aprovarCreditos(dir, { saldo: 500 }).approved, true);
  assert.equal(aprovarHiggsedit(dir, pedido({ creditosEstimados: 10 })).approved, true);
  const imagem = { arquivo: 'gerados/01.png', creditos: 13, saldo: 500, modelo: 'nano_banana_pro', prompt: 'A timer. No text.' };
  assert.equal(run('gastar-creditos', dir, PROJETO, VIDEO, JSON.stringify(imagem)).out.reason, 'over-limit');
  // She goes on without the missing imagery; then a Higgsedit run would pass its own limit.
  run('registrar-video', dir, PROJETO, VIDEO, '{"gate": null}');
  assert.equal(gastarHiggsedit(dir, execucao('higgsedit/01.mp4', 13)).reason, 'over-limit');
  assert.equal(aprovarCreditos(dir, { saldo: 500, creditosEstimados: 20 }).approved, true);
  assert.equal(registro(video).gate, 'aberto');
  assert.equal(run('estado', dir).out.projetos[0].videos[0].waitingForCriadora, true);
  assert.equal(aprovarHiggsedit(dir, pedido({ creditosEstimados: 20 })).approved, true);
  assert.equal(registro(video).gate, null);
});

function ffmpeg(...args) {
  const r = spawnSync(tools.ffmpeg, ['-v', 'error', '-y', ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

test('what Higgsedit montaged passes the same technical QC as any render: her voice once, the Master\'s length', needsFfmpeg, () => {
  // Her recording: 3 s at 30 fps in the 9:16 canvas, a tone standing in for her voice.
  const fonte = fs.mkdtempSync(path.join(os.tmpdir(), 'gravação higgsedit '));
  tempRoots.push(fonte);
  const gravacao = path.join(fonte, 'gravação.mp4');
  ffmpeg('-f', 'lavfi', '-i', 'testsrc2=s=1080x1920:r=30:d=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', gravacao);
  const { dir, video } = videoNivel2({ gravacao });
  assert.equal(aprovarHiggsedit(dir, pedido({ trecho: 'video-inteiro' })).approved, true);
  const master = path.join(video, 'original', fs.readdirSync(path.join(video, 'original'))[0]);
  // Two Higgsedit results of the whole Vídeo: one keeps her audio as recorded, one re-mixed it louder.
  const montar = (arquivo, ...extra) => {
    assert.equal(gastarHiggsedit(dir, execucao(arquivo, 10)).authorized, true);
    ffmpeg('-i', master, ...extra, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(video, arquivo));
    return run('qc', dir, PROJETO, VIDEO, arquivo, tools.ffmpeg, tools.ffprobe).out;
  };
  const fiel = montar('higgsedit/01_video_inteiro.mp4');
  assert.equal(fiel.passed, true, JSON.stringify(fiel.problemas));
  const remixada = montar('higgsedit/02_video_inteiro.mp4', '-af', 'volume=8dB', '-t', '2.5');
  assert.equal(remixada.passed, false);
  assert.deepEqual(remixada.problemas.map((p) => p.check), ['duration', 'loudness']);
});
