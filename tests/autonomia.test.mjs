// Seam 1 — the deterministic CLI, for Autonomia (ticket #17): `aprovar-automatico` approves a
// Gate on her behalf only when her Perfil's Autonomia lets the Diretor decide it, and records
// every automatic approval (counted, dated, and listed in the Vídeo folder) so it is never
// silent. Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON
// output, exit code and the files it produces.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

const PROJETO = 'Minha Empresa';
const VIDEO = 'Dica rápida';
const PALAVRAS = [
  { w: 'Olá!', s: 0.2, e: 0.5 },
  { w: 'Hoje', s: 0.6, e: 0.9 },
  { w: 'uma', s: 1.0, e: 1.2 },
  { w: 'dica.', s: 1.3, e: 1.8 },
];

// A Plano that passes every rule, with two Quadros de estilo rendered.
const PLANO = {
  schemaVersion: 1,
  tempoEstimadoMin: 20,
  creditosEstimados: null,
  direcoes: [
    { rotulo: 'A', resumo: 'Câmera limpa e a dica em destaque.', recomendada: true },
    { rotulo: 'B', resumo: 'Tela dividida com a dica ao lado.' },
  ],
  pedidosDela: [],
  cenas: [{ tipo: 'camera', inicio: 0, fim: 2 }],
  quadros: [
    { rotulo: 'A — abertura', tempo: 0.5, arquivo: 'quadros/A.png' },
    { rotulo: 'B — a dica', tempo: 1.5, arquivo: 'quadros/B.png' },
  ],
  aprovadoEm: null,
  quadrosAprovadosEm: null,
};

// An Estúdio whose Perfil has the given Autonomia, one approved Projeto and one Vídeo in
// Planejamento with its Plano ready. `kitSemLacunas`: the Kit defines the whole style (one Gate).
function videoPlanejado(autonomia, { kitSemLacunas = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio autonomia '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(path.join(dir, 'projetos'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  const perfil = fs.readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), 'utf8');
  if (autonomia !== null) fs.writeFileSync(path.join(dir, 'perfil.md'), perfil.replace('autonomia: média', `autonomia: ${autonomia}`));
  run('novo-projeto', dir, PROJETO);
  const briefing = path.join(dir, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  if (kitSemLacunas) {
    const edit = { camera: { comportamento: 'parada', enquadramento: 'peito para cima' }, imagens: { interacao: 'zoom lento' } };
    assert.equal(run('editar-kit', dir, PROJETO, JSON.stringify(edit)).out.edited, true);
  }
  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  const video = path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
  fs.mkdirSync(path.join(video, 'transcricao'));
  fs.writeFileSync(path.join(video, 'transcricao', 'palavras.json'), JSON.stringify(PALAVRAS));
  fs.writeFileSync(path.join(video, 'zona-do-rosto.json'), JSON.stringify({ measured: true, zona: { x: 0.3, y: 0.1, largura: 0.4, altura: 0.35 }, duracao: 2 }));
  fs.mkdirSync(path.join(video, 'quadros'));
  for (const nome of ['A.png', 'B.png']) fs.writeFileSync(path.join(video, 'quadros', nome), 'quadro');
  fs.writeFileSync(path.join(video, 'plano.json'), JSON.stringify(PLANO));
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, '{"nivel": 1, "status": "Planejamento"}').out.recorded, true);
  return { dir, video };
}

const videoDoEstado = (dir) => run('estado', dir).out.projetos[0].videos[0];
const registro = (video) => JSON.parse(fs.readFileSync(path.join(video, 'aprovacoes-automaticas.json'), 'utf8'));

test('with Autonomia alta the Plano Gate is approved automatically, counted and recorded, never silently', () => {
  const { dir, video } = videoPlanejado('alta');
  const { code, out } = run('aprovar-automatico', dir, PROJETO, VIDEO, 'plano-e-quadros');
  assert.equal(code, 0);
  assert.equal(out.approved, true);
  assert.equal(out.automatica, true);
  assert.equal(out.autonomia, 'alta');
  assert.equal(out.gate, 'plano-e-quadros');
  assert.equal(out.status, 'Construção');
  assert.equal(out.aprovacoesAutomaticas, 1);
  assert.equal(out.registro, 'aprovacoes-automaticas.json');

  const plano = JSON.parse(fs.readFileSync(path.join(video, 'plano.json'), 'utf8'));
  assert.ok(plano.aprovadoEm && plano.quadrosAprovadosEm);
  const [entrada, ...resto] = registro(video).aprovacoes;
  assert.deepEqual(resto, []);
  assert.equal(entrada.gate, 'plano-e-quadros');
  assert.equal(entrada.autonomia, 'alta');
  assert.ok(!Number.isNaN(Date.parse(entrada.em)));

  const doc = fs.readFileSync(path.join(video, 'video.md'), 'utf8');
  assert.match(doc, /^aprovacoesAutomaticas: 1$/m);
  assert.match(doc, /^gates: 1$/m);
  assert.equal(videoDoEstado(dir).status, 'Construção');
});

test('with two Gates, Autonomia alta approves the Plano, then the Quadros, each one recorded', () => {
  const { dir, video } = videoPlanejado('alta', { kitSemLacunas: false });
  assert.equal(run('aprovar-automatico', dir, PROJETO, VIDEO, 'plano').out.status, 'Planejamento');
  const { out } = run('aprovar-automatico', dir, PROJETO, VIDEO, 'quadros');
  assert.equal(out.status, 'Construção');
  assert.equal(out.aprovacoesAutomaticas, 2);
  assert.deepEqual(registro(video).aprovacoes.map((a) => a.gate), ['plano', 'quadros']);
});

test('with Autonomia baixa or média every Gate waits for her: nothing is approved or recorded', () => {
  for (const autonomia of ['baixa', 'média', 'media']) {
    const { dir, video } = videoPlanejado(autonomia);
    const before = fs.readFileSync(path.join(video, 'video.md'), 'utf8');
    const { code, out } = run('aprovar-automatico', dir, PROJETO, VIDEO, 'plano-e-quadros');
    assert.equal(code, 0);
    assert.deepEqual(out, {
      approved: false, reason: 'not-eligible', projeto: PROJETO, video: VIDEO, autonomia: autonomia === 'baixa' ? 'baixa' : 'média', gate: 'plano-e-quadros',
    });
    assert.equal(fs.readFileSync(path.join(video, 'video.md'), 'utf8'), before);
    assert.equal(JSON.parse(fs.readFileSync(path.join(video, 'plano.json'), 'utf8')).aprovadoEm, null);
    assert.equal(fs.existsSync(path.join(video, 'aprovacoes-automaticas.json')), false);
  }
});

test('credits, Higgsedit, the Pré-corte, the Kit, her review and Kit learnings are never approved automatically', () => {
  const { dir, video } = videoPlanejado('alta');
  for (const gate of ['creditos', 'higgsedit', 'precorte', 'kit', 'revisao', 'aprendizados']) {
    assert.deepEqual(run('aprovar-automatico', dir, PROJETO, VIDEO, gate).out,
      { approved: false, reason: 'never-automatic', gate });
  }
  assert.equal(run('aprovar-automatico', dir, PROJETO, VIDEO, 'qualquer').out.reason, 'invalid-gate');
  assert.equal(fs.existsSync(path.join(video, 'aprovacoes-automaticas.json')), false);
});

test('without a Perfil the Autonomia is unknown, so nothing is approved for her', () => {
  const { dir } = videoPlanejado(null);
  assert.equal(run('aprovar-automatico', dir, PROJETO, VIDEO, 'plano-e-quadros').out.reason, 'no-autonomia');
});

test('a Plano that breaks a rule is not approved automatically either, and nothing is recorded', () => {
  const { dir, video } = videoPlanejado('alta');
  fs.writeFileSync(path.join(video, 'plano.json'), JSON.stringify({ ...PLANO, direcoes: [] }));
  const { out } = run('aprovar-automatico', dir, PROJETO, VIDEO, 'plano-e-quadros');
  assert.equal(out.approved, false);
  assert.equal(out.reason, 'not-ready');
  assert.equal(fs.existsSync(path.join(video, 'aprovacoes-automaticas.json')), false);
  assert.match(fs.readFileSync(path.join(video, 'video.md'), 'utf8'), /^aprovacoesAutomaticas: 0$/m);
});

test('estado lists the automatic approvals of each Vídeo, so the Diretor can always tell her', () => {
  const { dir } = videoPlanejado('alta');
  run('aprovar-automatico', dir, PROJETO, VIDEO, 'plano-e-quadros');
  const { aprovacoesAutomaticas } = videoDoEstado(dir);
  assert.deepEqual(aprovacoesAutomaticas.map((a) => [a.gate, a.autonomia]), [['plano-e-quadros', 'alta']]);
});
