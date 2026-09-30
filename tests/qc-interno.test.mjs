// Seam 1 — the deterministic CLI, for the internal Crítico loop (ticket #13): `qc-interno` records
// one turn of the three Críticos (QC técnico, Guardião da marca, Revisor de plataforma) on the
// version being built, with what the turn cost; it moves the Vídeo to QC interno, says whether the
// version goes to her review, back to the Motion designer, or — after three rejected turns — to her
// in one escalation question, and keeps the turns and their cost in the Vídeo document.
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// the Vídeo's record as `estado` reports it, and the files it writes.
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

// A fresh Estúdio (a path with spaces and accents, as on her Mac) with one approved Projeto and
// one Vídeo in Construção whose first version (v01) has its stills: what the Críticos judge.
function versaoParaJulgar() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio qc interno '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.mkdirSync(path.join(dir, 'projetos'));
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const briefing = path.join(dir, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  const video = path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
  const doc = path.join(video, 'video.md');
  fs.writeFileSync(doc, fs.readFileSync(doc, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, '{"nivel": 1, "status": "Construção"}').out.recorded, true);
  const { out } = run('nova-versao', dir, PROJETO, VIDEO);
  fs.writeFileSync(path.join(out.pasta, '01-abertura.png'), 'still');
  return { dir, video, doc };
}

// The Vídeo as `estado` reports it.
const noEstado = (dir) => run('estado', dir).out.projetos[0].videos[0];
// The Vídeo document's frontmatter fields, as text.
function registro(doc) {
  const block = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(doc, 'utf8'))[1];
  return Object.fromEntries(block.split('\n').map((line) => /^([\w-]+):\s*(.*)$/.exec(line)).filter(Boolean).map(([, k, v]) => [k, v]));
}

const APROVADO = { veredito: 'aprovado', motivos: [] };
const turno = (vereditos, custo = { tokens: 1000, segundos: 60 }) => ({
  vereditos: { 'qc-tecnico': APROVADO, 'guardiao-da-marca': APROVADO, 'revisor-de-plataforma': APROVADO, ...vereditos },
  custo,
});
const registrar = (dir, entrada) => run('qc-interno', dir, PROJETO, VIDEO, JSON.stringify(entrada));

test('a turn the three Críticos approve sends the version to her review, and its cost is kept in the Vídeo document', () => {
  const { dir, doc } = versaoParaJulgar();
  const { code, out } = registrar(dir, turno({}, { tokens: 41250, segundos: 95 }));
  assert.equal(code, 0);
  assert.equal(out.recorded, true, JSON.stringify(out));
  assert.equal(out.versao, 'v01');
  assert.equal(out.turno, 1);
  assert.equal(out.aprovado, true);
  assert.deepEqual(out.reprovacoes, []);
  assert.equal(out.proximo, 'abrir-revisao');
  assert.equal(out.status, 'QC interno');
  const fields = registro(doc);
  assert.deepEqual([fields.status, fields.turnosInternos, fields.tokensInternos, fields.segundosInternos], ['QC interno', '1', '41250', '95']);
  assert.equal(noEstado(dir).status, 'QC interno');
  assert.equal(noEstado(dir).waitingForCriadora, false);
});

test('a rejection sends the Crítico’s reasons back to the Motion designer, without asking her', () => {
  const { dir, video } = versaoParaJulgar();
  const motivos = ['Legenda em 00:04 sai da Área livre (termina em 0.84 da altura)'];
  const { out } = registrar(dir, turno({ 'revisor-de-plataforma': { veredito: 'reprovado', motivos } }));
  assert.equal(out.recorded, true, JSON.stringify(out));
  assert.equal(out.aprovado, false);
  assert.equal(out.proximo, 'corrigir');
  assert.deepEqual(out.reprovacoes, [{ critico: 'revisor-de-plataforma', motivos }]);
  assert.equal(out.gate, null);
  assert.equal(noEstado(dir).waitingForCriadora, false);
  // The turn is kept in the version's folder with every verdict.
  const { turnos } = JSON.parse(fs.readFileSync(path.join(video, 'revisao', 'v01', 'qc-interno.json'), 'utf8'));
  assert.equal(turnos.length, 1);
  assert.deepEqual(turnos[0].vereditos['revisor-de-plataforma'], { veredito: 'reprovado', motivos });
  assert.equal(turnos[0].vereditos['guardiao-da-marca'].veredito, 'aprovado');
});

test('the loop stops after three rejected turns: the Vídeo waits for her, and a fourth turn is refused', () => {
  const { dir, doc } = versaoParaJulgar();
  const reprovado = turno({ 'guardiao-da-marca': { veredito: 'reprovado', motivos: ['Cor do título fora do Kit'] } }, { tokens: 500, segundos: 30 });
  assert.equal(registrar(dir, reprovado).out.proximo, 'corrigir');
  assert.equal(registrar(dir, reprovado).out.proximo, 'corrigir');
  const { out } = registrar(dir, reprovado);
  assert.equal(out.turno, 3);
  assert.equal(out.proximo, 'escalar');
  assert.equal(out.gate, 'aberto');
  assert.deepEqual(out.reprovacoes, [{ critico: 'guardiao-da-marca', motivos: ['Cor do título fora do Kit'] }]);
  assert.equal(noEstado(dir).waitingForCriadora, true);
  assert.deepEqual(run('estado', dir).out.waiting, [{ projeto: PROJETO, video: VIDEO, status: 'QC interno' }]);

  const fourth = registrar(dir, reprovado).out;
  assert.equal(fourth.recorded, false);
  assert.equal(fourth.reason, 'awaiting-criadora');
  const fields = registro(doc);
  assert.deepEqual([fields.turnosInternos, fields.tokensInternos, fields.segundosInternos], ['3', '1500', '90']);
});

test('after she answers the escalation with a direction, the Motion designer gets three new turns', () => {
  const { dir } = versaoParaJulgar();
  const reprovado = turno({ 'qc-tecnico': { veredito: 'reprovado', motivos: ['frozen-frames: picture still for 2.4 s at 12.0 s'] } });
  for (let i = 0; i < 3; i += 1) registrar(dir, reprovado);
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, '{"gate": null, "somar": {"perguntas": 1}}').out.recorded, true);
  const { out } = registrar(dir, reprovado);
  assert.equal(out.recorded, true, JSON.stringify(out));
  assert.deepEqual([out.ciclo, out.turno, out.proximo, out.turnosInternos], [2, 1, 'corrigir', 4]);
  const approved = registrar(dir, turno({})).out;
  assert.deepEqual([approved.ciclo, approved.turno, approved.proximo], [2, 2, 'abrir-revisao']);
});

test('an approved version is not judged again, and its review then opens as usual', () => {
  const { dir } = versaoParaJulgar();
  registrar(dir, turno({}));
  const again = registrar(dir, turno({})).out;
  assert.equal(again.recorded, false);
  assert.equal(again.reason, 'already-approved');
  const { out } = run('abrir-revisao', dir, PROJETO, VIDEO);
  assert.equal(out.opened, true, JSON.stringify(out));
  assert.equal(noEstado(dir).status, 'Revisão');
});

test('a malformed turn is refused and nothing is recorded', () => {
  const { dir, doc } = versaoParaJulgar();
  const semGuardiao = turno({});
  delete semGuardiao.vereditos['guardiao-da-marca'];
  const cases = [
    ['not json', 'not valid JSON'],
    [JSON.stringify(semGuardiao), 'the verdict of guardiao-da-marca is missing: every turn holds the three Críticos'],
    [JSON.stringify(turno({ finalizador: APROVADO })), 'finalizador is not a Crítico (qc-tecnico, guardiao-da-marca, revisor-de-plataforma)'],
    [JSON.stringify(turno({ 'qc-tecnico': { veredito: 'talvez' } })), 'qc-tecnico: veredito must be aprovado or reprovado'],
    [JSON.stringify(turno({ 'guardiao-da-marca': { veredito: 'reprovado', motivos: ['  '] } })), 'guardiao-da-marca: a rejection needs its reasons (motivos)'],
    [JSON.stringify(turno({}, { tokens: -1, segundos: 3 })), 'custo.tokens and custo.segundos must be whole numbers, 0 or more'],
    [JSON.stringify({ vereditos: turno({}).vereditos }), 'must be a JSON object with vereditos (one per Crítico) and custo ({tokens, segundos})'],
  ];
  for (const [text, message] of cases) {
    const { code, out } = run('qc-interno', dir, PROJETO, VIDEO, text);
    assert.equal(code, 0);
    assert.equal(out.recorded, false);
    assert.equal(out.reason, 'invalid-turn');
    assert.ok(out.message.startsWith(message), `${out.message} ≠ ${message}`);
  }
  assert.equal(registro(doc).turnosInternos, '0');
  assert.equal(registro(doc).status, 'Construção');
});

test('a turn needs a version being built: none yet, or a Vídeo under her review, is refused', () => {
  const { dir } = versaoParaJulgar();
  registrar(dir, turno({}));
  run('abrir-revisao', dir, PROJETO, VIDEO);
  const underReview = registrar(dir, turno({})).out;
  assert.deepEqual([underReview.recorded, underReview.reason, underReview.status], [false, 'not-building', 'Revisão']);
  run('decidir-revisao', dir, PROJETO, VIDEO, '{"decisao": "pedir-mudancas", "notas": ["Mais rápido"]}');
  const noVersion = registrar(dir, turno({})).out;
  assert.deepEqual([noVersion.recorded, noVersion.reason], [false, 'no-version']);
  const unknown = run('qc-interno', dir, PROJETO, 'Outro', JSON.stringify(turno({}))).out;
  assert.deepEqual([unknown.recorded, unknown.reason], [false, 'unknown-video']);
});

test('her review opens only after the Críticos: never before a turn, nor after a rejection still being fixed', () => {
  const { dir } = versaoParaJulgar();
  const antes = run('abrir-revisao', dir, PROJETO, VIDEO).out;
  assert.deepEqual([antes.opened, antes.reason], [false, 'not-reviewed']);
  const reprovado = turno({ 'revisor-de-plataforma': { veredito: 'reprovado', motivos: ['gancho: nada nos 3 primeiros segundos'] } });
  registrar(dir, reprovado);
  assert.equal(run('abrir-revisao', dir, PROJETO, VIDEO).out.reason, 'not-reviewed');
  assert.equal(noEstado(dir).status, 'QC interno');
  // After the escalation she may choose to see the version as it is.
  registrar(dir, reprovado);
  registrar(dir, reprovado);
  const { out } = run('abrir-revisao', dir, PROJETO, VIDEO);
  assert.equal(out.opened, true, JSON.stringify(out));
  assert.equal(noEstado(dir).status, 'Revisão');
});

test('a damaged turn record is refused, never read as a fresh start that would lift the cap', () => {
  const { dir, video } = versaoParaJulgar();
  registrar(dir, turno({ 'qc-tecnico': { veredito: 'reprovado', motivos: ['duration: 1 frame short'] } }));
  fs.writeFileSync(path.join(video, 'revisao', 'v01', 'qc-interno.json'), '{"turnos": [');
  const { out } = registrar(dir, turno({}));
  assert.deepEqual([out.recorded, out.reason], [false, 'invalid-turns']);
  assert.equal(registro(path.join(video, 'video.md')).turnosInternos, '1');
});
