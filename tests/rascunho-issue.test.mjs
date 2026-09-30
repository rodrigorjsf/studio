// Seam 1 — the deterministic CLI, for the Rascunhos de issue (ticket #43): `rascunho-issue` saves a
// draft in the Estúdio's `issues/` folder, refuses one that still carries what is hers, records her
// decision on it and builds the pre-filled GitHub link; `estado` lists the drafts with no decision.
// Drives plugin/estudio/scripts/estudio.mjs as a process against a temporary Estúdio and asserts only
// on its JSON output, exit code and the files it writes.
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

// An Estúdio with one approved Projeto holding one Vídeo.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio rascunho '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.mkdirSync(path.join(dir, 'projetos'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.copyFileSync(path.join(repoRoot, 'tests', 'fixtures', 'estudios', 'valido', 'perfil.md'), path.join(dir, 'perfil.md'));
  run('novo-projeto', dir, PROJETO);
  const briefing = path.join(dir, 'projetos', PROJETO, 'projeto.md');
  fs.writeFileSync(briefing, fs.readFileSync(briefing, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  assert.equal(run('aprovar-kit', dir, PROJETO).out.approved, true);
  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  return dir;
}

const rascunho = (dir, input) => run('rascunho-issue', dir, JSON.stringify(input));
const issuesDir = (dir) => path.join(dir, 'issues');
const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const BUG = {
  acao: 'salvar',
  tipo: 'bug',
  titulo: 'O QC técnico reprova um render válido',
  corpo: '## Descrição\nO `qc` reprova o loudness de um render que está dentro da faixa.\n\n## Cenário\n1. Renderizar uma versão.\n2. Rodar o `qc`.\n\n## Evidência\n`loudness: -12 LUFS`',
};

test('a draft is saved in the Estúdio\'s issues folder, pending, and its answer carries the pre-filled link', () => {
  const dir = estudio();
  const { code, out } = rascunho(dir, BUG);
  assert.equal(code, 0);
  assert.equal(out.written, true);
  assert.equal(out.id, 1);
  assert.equal(out.tipo, 'bug');
  assert.equal(path.dirname(out.arquivo), issuesDir(dir));
  const text = read(out.arquivo);
  assert.ok(text.includes(BUG.titulo));
  assert.ok(text.includes(BUG.corpo));
  assert.equal(rascunho(dir, { ...BUG, tipo: 'evolucao', titulo: 'Outro problema' }).out.id, 2, 'each draft has its own identifier');
  assert.equal(fs.readdirSync(issuesDir(dir)).length, 2);
});

test('the pre-filled link targets the studio repository with accents and spaces encoded', () => {
  const dir = estudio();
  const { out } = rascunho(dir, { acao: 'salvar', tipo: 'bug', titulo: 'Erro ao abrir o preview', corpo: 'Passo 1: abrir\nPasso 2: ação' });
  const expected = 'https://github.com/rodrigorjsf/studio/issues/new?title=Erro%20ao%20abrir%20o%20preview&body=Passo%201%3A%20abrir%0APasso%202%3A%20a%C3%A7%C3%A3o';
  assert.equal(out.link, expected);
  const again = rascunho(dir, { acao: 'link', id: out.id }).out;
  assert.equal(again.link, expected);
  assert.equal(again.titulo, 'Erro ao abrir o preview');
  assert.equal(again.corpo, 'Passo 1: abrir\nPasso 2: ação');
});

// Every file under `dir`, by relative path, with its content: to prove a refusal changed nothing.
function snapshot(dir) {
  const files = {};
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[path.relative(dir, full)] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return files;
}

test('a draft carrying the Estúdio path, a Projeto name or a Vídeo name is refused and nothing is written', () => {
  const dir = estudio();
  const before = snapshot(dir);
  const cases = [
    ['the Estúdio path in the body', { corpo: `O erro apareceu em ${dir}/projetos.` }],
    ['the Estúdio path in the title', { titulo: `Falha em ${dir}` }],
    ['the Estúdio path with Windows separators', { corpo: `Em ${dir.replaceAll('/', '\\')}\\projetos` }],
    ['a Projeto name', { corpo: `Acontece no meu projeto ${PROJETO}.` }],
    ['a Projeto name in other case', { titulo: `Falha no ${PROJETO.toUpperCase()}` }],
    ['a Vídeo name', { corpo: `O vídeo "${VIDEO}" travou.` }],
    ['a Vídeo name with decomposed accents', { corpo: `O vídeo "${VIDEO.normalize('NFD')}" travou.` }],
  ];
  for (const [label, change] of cases) {
    const { code, out } = rascunho(dir, { ...BUG, ...change });
    assert.equal(code, 0, label);
    assert.equal(out.written, false, label);
    assert.equal(out.reason, 'private-content', label);
    assert.ok(out.encontrados.length >= 1, label);
    assert.deepEqual(snapshot(dir), before, `${label}: nothing may change`);
  }
  assert.equal(fs.existsSync(issuesDir(dir)), false);
});

test('an input that is not a well-formed draft is refused and nothing is written', () => {
  const dir = estudio();
  const before = snapshot(dir);
  for (const [reason, input] of [
    ['unknown-kind', { ...BUG, tipo: 'sugestao' }],
    ['unknown-kind', { ...BUG, tipo: undefined }],
    ['invalid-input', { ...BUG, titulo: '  ' }],
    ['invalid-input', { ...BUG, corpo: '' }],
    ['invalid-input', { ...BUG, acao: 'publicar' }],
    ['unknown-draft', { acao: 'link', id: 7 }],
    ['unknown-draft', { acao: 'decidir', id: 7, decisao: 'recusado' }],
  ]) {
    const { out } = rascunho(dir, input);
    assert.equal(out.written, false, JSON.stringify(input));
    assert.equal(out.reason, reason, JSON.stringify(input));
    assert.deepEqual(snapshot(dir), before);
  }
  assert.equal(run('rascunho-issue', dir, 'isto não é JSON').out.reason, 'invalid-input');
  assert.deepEqual(snapshot(dir), before);
});

test('a folder that is not an Estúdio is refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pasta qualquer '));
  tempRoots.push(dir);
  assert.equal(rascunho(dir, BUG).out.reason, 'not-estudio');
  assert.deepEqual(fs.readdirSync(dir), []);
});

const ISSUE_URL = 'https://github.com/rodrigorjsf/studio/issues/57';
const decidir = (dir, id, decisao, url) => rascunho(dir, { acao: 'decidir', id, decisao, ...(url ? { url } : {}) }).out;

test('each decision is recorded on the draft: published with its URL, link handed over, declined', () => {
  const dir = estudio();
  const ids = ['Um', 'Dois', 'Três'].map((nome) => rascunho(dir, { ...BUG, titulo: `Problema ${nome}` }).out);
  const published = decidir(dir, ids[0].id, 'publicado', ISSUE_URL);
  assert.equal(published.written, true);
  assert.equal(published.decisao, 'publicado');
  assert.equal(published.url, ISSUE_URL);
  assert.equal(decidir(dir, ids[1].id, 'link-entregue').written, true);
  assert.equal(decidir(dir, ids[2].id, 'recusado').written, true);
  const [um, dois, tres] = ids.map((d) => read(d.arquivo));
  assert.match(um, /^decisao: publicado$/m);
  assert.ok(um.includes(ISSUE_URL));
  assert.match(dois, /^decisao: link-entregue$/m);
  assert.match(tres, /^decisao: recusado$/m);
  for (const text of [um, dois, tres]) assert.match(text, /^decididoEm: \d{4}-\d{2}-\d{2}T/m);
  assert.ok(um.includes('O `qc` reprova o loudness'), 'the draft body is kept');
});

test('a decision that is not valid is refused and the draft stays as it was', () => {
  const dir = estudio();
  const { id } = rascunho(dir, BUG).out;
  const before = snapshot(dir);
  for (const [decisao, url, reason] of [
    ['publicado', undefined, 'invalid-input'],
    ['publicado', 'https://example.com/issues/1', 'invalid-input'],
    ['publicado', 'https://github.com/rodrigorjsf/studio/pull/57', 'invalid-input'],
    ['recusado', ISSUE_URL, 'invalid-input'],
    ['talvez', undefined, 'invalid-input'],
  ]) {
    const out = decidir(dir, id, decisao, url);
    assert.equal(out.written, false, `${decisao} ${url}`);
    assert.equal(out.reason, reason, `${decisao} ${url}`);
    assert.deepEqual(snapshot(dir), before);
  }
});

test('a draft already decided is never decided again', () => {
  const dir = estudio();
  const { id } = rascunho(dir, BUG).out;
  assert.equal(decidir(dir, id, 'recusado').written, true);
  const before = snapshot(dir);
  const out = decidir(dir, id, 'publicado', ISSUE_URL);
  assert.equal(out.written, false);
  assert.equal(out.reason, 'already-decided');
  assert.equal(out.decisao, 'recusado');
  assert.deepEqual(snapshot(dir), before);
});

test('the link is not handed out for a draft that has come to carry her private content', () => {
  const dir = estudio();
  const { id, arquivo } = rascunho(dir, BUG).out;
  fs.writeFileSync(arquivo, read(arquivo).replace('O `qc` reprova', `No projeto ${PROJETO}, o \`qc\` reprova`));
  const out = rascunho(dir, { acao: 'link', id }).out;
  assert.equal(out.reason, 'private-content');
  assert.equal(out.link, undefined);
});

test('`estado` lists the drafts with no decision, and only those', () => {
  const dir = estudio();
  assert.deepEqual(run('estado', dir).out.rascunhosPendentes, []);
  const um = rascunho(dir, { ...BUG, titulo: 'Problema um' }).out;
  const dois = rascunho(dir, { ...BUG, tipo: 'evolucao', titulo: 'Problema dois' }).out;
  const tres = rascunho(dir, { ...BUG, titulo: 'Problema três' }).out;
  assert.deepEqual(run('estado', dir).out.rascunhosPendentes, [
    { id: um.id, tipo: 'bug', titulo: 'Problema um', arquivo: um.arquivo },
    { id: dois.id, tipo: 'evolucao', titulo: 'Problema dois', arquivo: dois.arquivo },
    { id: tres.id, tipo: 'bug', titulo: 'Problema três', arquivo: tres.arquivo },
  ]);
  decidir(dir, um.id, 'publicado', ISSUE_URL);
  decidir(dir, tres.id, 'recusado');
  const after = run('estado', dir).out;
  assert.deepEqual(after.rascunhosPendentes.map((d) => d.id), [dois.id]);
  assert.deepEqual(after.errors, []);
});

test('a damaged draft file is reported by `estado` as an error', () => {
  const dir = estudio();
  const { arquivo } = rascunho(dir, BUG).out;
  fs.writeFileSync(arquivo, 'isto não é um rascunho\n');
  const { errors } = run('estado', dir).out;
  assert.equal(errors.length, 1);
  assert.equal(errors[0].file, `issues/${path.basename(arquivo)}`);
});

// ---- the shipped prompts and docs: static checks over the files, never over their wording ----
// Normalize CRLF: a checkout under core.autocrlf=true yields CRLF.
const shipped = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n');
const agentsDir = path.join(repoRoot, 'plugin', 'estudio', 'agents');
const agents = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));

test('every persona prompt names the report field for a self-evolution proposal', () => {
  assert.ok(agents.length >= 11);
  for (const file of agents) {
    assert.ok(shipped('plugin', 'estudio', 'agents', file).includes('evolucao-proposta'), `${file} never mentions evolucao-proposta`);
  }
});

test('the edicao skill\'s close step holds the Gate: the command, the pending drafts, never automatic', () => {
  const edicao = shipped('plugin', 'estudio', 'skills', 'edicao', 'SKILL.md');
  const close = edicao.slice(edicao.indexOf('## 6. '), edicao.indexOf('\n## Rules'));
  for (const token of ['rascunho-issue', 'rascunhosPendentes', 'multiSelect', 'Autonomia', 'rascunho-issue.md']) {
    assert.ok(close.includes(token), `step 6 of the edicao skill never mentions ${token}`);
  }
});

test('the Diretor\'s reference for the drafts exists and shows every command action', () => {
  const reference = shipped('plugin', 'estudio', 'skills', 'estudio', 'references', 'rascunho-issue.md');
  for (const token of ['estudio.mjs" rascunho-issue', '"acao": "salvar"', '"acao": "link"', '"acao": "decidir"', 'gh auth status', 'rodrigorjsf/studio']) {
    assert.ok(reference.includes(token), `the drafts reference never shows ${token}`);
  }
});

test('the README Gates table lists the issue-drafts Gate, never approved by Autonomia', () => {
  const readme = shipped('README.md');
  const gates = readme.slice(readme.indexOf('\n### Os Gates\n'));
  const rows = gates.slice(0, gates.indexOf('\n## ', 10)).split('\n').filter((l) => l.startsWith('|'));
  const row = rows.find((l) => l.includes('Rascunhos de issue'));
  assert.ok(row, 'no Gates row for the Rascunhos de issue');
  const cells = row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  assert.equal(cells.length, 5);
  assert.match(cells[4], /^Não/);
});

test('the answer says whether the pre-filled link is short enough to open reliably', () => {
  const dir = estudio();
  const short = rascunho(dir, BUG).out;
  assert.equal(short.linkCabe, true);
  const long = rascunho(dir, { ...BUG, titulo: 'Um relatório muito longo', corpo: 'ação '.repeat(1200) }).out;
  assert.equal(long.written, true);
  assert.equal(long.linkCabe, false);
  assert.equal(rascunho(dir, { acao: 'link', id: long.id }).out.linkCabe, false);
});

test('the Estúdio path is refused whichever way the folder is reached: the real path, through a symlink', () => {
  const dir = estudio();
  const link = `${dir} atalho`;
  fs.symlinkSync(dir, link);
  const before = snapshot(dir);
  const out = rascunho(link, { ...BUG, corpo: `O erro apareceu em ${fs.realpathSync(dir)}/projetos.` }).out;
  assert.equal(out.written, false);
  assert.equal(out.reason, 'private-content');
  assert.deepEqual(snapshot(dir), before);
  fs.unlinkSync(link);
});

test('a draft file whose frontmatter id disagrees with its file name is reported as an error', () => {
  const dir = estudio();
  const { arquivo } = rascunho(dir, BUG).out;
  fs.writeFileSync(arquivo, read(arquivo).replace(/^id: 1$/m, 'id: 9'));
  const { errors } = run('estado', dir).out;
  assert.equal(errors.length, 1);
  assert.equal(errors[0].file, `issues/${path.basename(arquivo)}`);
});
