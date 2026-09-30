// The Texto do post judged by the Revisor de plataforma, and on request for older Vídeos (ticket
// #45). Seam 1 (the `estudio.mjs` CLI as a process on a temporary Estúdio): producing a Texto do
// post for an Entregue or Arquivado Vídeo, and recording the internal loop that judges it, leaves
// the Vídeo's Status and Gate alone. Seam 2 (static checks over the shipped persona, skill and
// docs, never over their wording beyond the tokens a reader needs to find): the Revisor's Texto do
// post mode and its codes, its read-only allowlist, the edicao skill's loop with its three-turn
// cap, and the on-request path for older Vídeos.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');
// Normalize CRLF: a checkout under core.autocrlf=true yields CRLF.
const shipped = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), 'utf8').replace(/\r\n/g, '\n');

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function run(...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return { code: r.status, out: JSON.parse(r.stdout) };
}

const PROJETO = 'Minha Empresa';
const VIDEO = 'Dica rápida';

// An Estúdio with one approved Projeto (Kit on all three platforms) holding one Vídeo in `status`.
function estudio(status) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio texto do post revisão '));
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
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, JSON.stringify({ status })).out.recorded, true);
  return dir;
}

const videoDir = (dir) => path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
const textoFile = (dir) => path.join(videoDir(dir), 'entrega', 'texto-do-post.md');
const videoDoc = (dir) => fs.readFileSync(path.join(videoDir(dir), 'video.md'), 'utf8');
const statusDe = (dir) => run('estado', dir).out.projetos[0].videos.find((v) => v.id === VIDEO).status;

const TEXTO = `# Texto do post

## Reels

Marketing de conteúdo sem enrolação
Em 30 segundos, o que mudou no meu jeito de planejar. Você já tentou isso?

#marketingdeconteudo #planejamento

## TikTok

Marketing de conteúdo sem enrolação
O que mudou no meu jeito de planejar, em 30 segundos.

#marketingdeconteudo #planejamento

## Shorts

**Título:** Marketing de conteúdo sem enrolação em 30 segundos

Marketing de conteúdo sem enrolação: o que mudou no meu jeito de planejar.

#marketingdeconteudo #planejamento
`;

// One turn of the loop that judges the text, recorded as the Quadros' review records its own: the
// counters of the Vídeo document, with no Status, no Gate and no version.
const TURNO = JSON.stringify({ somar: { turnosInternos: 1, tokensInternos: 12000, segundosInternos: 30 } });

for (const status of ['Entregue', 'Arquivado']) {
  test(`a Texto do post for a ${status} Vídeo is checked and its loop recorded without moving the Status`, () => {
    const dir = estudio(status);
    fs.mkdirSync(path.dirname(textoFile(dir)), { recursive: true });
    fs.writeFileSync(textoFile(dir), TEXTO);
    const antes = { doc: videoDoc(dir), texto: fs.readFileSync(textoFile(dir), 'utf8') };

    const check = run('texto-do-post', dir, PROJETO, VIDEO);
    assert.equal(check.code, 0);
    assert.deepEqual([check.out.checked, check.out.pronto, check.out.problemas], [true, true, []]);
    assert.equal(videoDoc(dir), antes.doc, 'the check must not touch the Vídeo document');

    for (const turno of [1, 2]) {
      const { out } = run('registrar-video', dir, PROJETO, VIDEO, TURNO);
      assert.equal(out.recorded, true);
      assert.equal(out.status, status);
      assert.equal(out.gate, null);
      assert.equal(out.turnosInternos, turno);
    }
    const { out } = run('registrar-video', dir, PROJETO, VIDEO, TURNO);
    assert.deepEqual([out.tokensInternos, out.segundosInternos], [36000, 90]);
    assert.equal(statusDe(dir), status, 'producing a Texto do post never changes the Status');
    assert.equal(fs.readFileSync(textoFile(dir), 'utf8'), antes.texto);
    assert.match(videoDoc(dir), new RegExp(`^status: ${status}$`, 'm'));
  });
}

test('a text with a broken rule on an Entregue Vídeo is reported, changing nothing', () => {
  const dir = estudio('Entregue');
  fs.mkdirSync(path.dirname(textoFile(dir)), { recursive: true });
  fs.writeFileSync(textoFile(dir), TEXTO.replace('#marketingdeconteudo #planejamento\n\n## TikTok', '#fyp #marketingdeconteudo\n\n## TikTok'));
  const antes = videoDoc(dir);
  const { out } = run('texto-do-post', dir, PROJETO, VIDEO);
  assert.equal(out.pronto, false);
  assert.ok(out.problemas.some((p) => p.startsWith('reels:') && p.includes('#fyp')));
  assert.equal(videoDoc(dir), antes);
  assert.equal(statusDe(dir), 'Entregue');
});

// Seam 2: the Revisor de plataforma's Texto do post mode.
const revisor = shipped('plugin', 'estudio', 'agents', 'revisor-de-plataforma.md');
const revisorFields = Object.fromEntries([...revisor.match(/^---\n([\s\S]*?)\n---/)[1].matchAll(/^([\w-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2].trim()]));

test('the Revisor de plataforma describes the Texto do post mode and every rejection code', () => {
  for (const token of [
    'Texto do post',
    '<texto>',                               // the file it judges
    'texto-do-post',                         // the mechanical check it may run
    'isca-de-engajamento',                   // engagement bait
    'afirmacao-fora-da-transcricao',         // a claim that is not in the transcript
    'primeira-linha-sem-palavra-chave',      // a first line without the main keyword
    'checagem-mecanica',                     // any failure the `texto-do-post` check reports
    'platform-rules.md',                     // the bundled reference, for what is official
    'transcricao/palavras.json',
  ]) assert.ok(revisor.includes(token), `the Revisor prompt never mentions ${token}`);
});

test('the Revisor says marketing guidance never rejects a Texto do post', () => {
  const mode = revisor.slice(revisor.indexOf('## A Texto do post'));
  assert.ok(mode.length > 0 && revisor.includes('## A Texto do post'), 'the Revisor has no Texto do post section');
  assert.match(mode, /marketing/i);
  assert.match(mode, /never reject/i);
});

test('the Revisor keeps a read-only allowlist (Bash and Read, no editing tool) and its identity', () => {
  assert.equal(revisorFields.name, 'revisor-de-plataforma');
  assert.deepEqual(revisorFields.tools.split(/\s*,\s*/), ['Bash', 'Read']);
  assert.equal(revisorFields.model, 'claude-sonnet-5-5');
  assert.match(revisorFields.description, /Texto do post/);
});

// The Social media, when the Revisor sends its text back.
const social = shipped('plugin', 'estudio', 'agents', 'social-media.md');

test('the Social media fixes its text from the Revisor\'s reasons, and may be asked on an older Vídeo', () => {
  assert.match(social, /Revisor de plataforma/);
  assert.ok(social.includes('<motivos>'), 'the Social media never names the Revisor\'s reasons it receives');
  assert.match(social, /Entregue|Arquivado/);
  assert.match(social, /Status/);
});

// The edicao skill: the internal loop and the on-request path.
const edicao = shipped('plugin', 'estudio', 'skills', 'edicao', 'SKILL.md');
const entrega = edicao.slice(edicao.indexOf('## 5. The Entrega'), edicao.indexOf('## 6. '));
const pedido = edicao.slice(edicao.indexOf('## 7. '), edicao.indexOf('## Rules'));

test('the edicao skill runs the Texto do post through the Revisor in a loop capped at three turns, recording each one', () => {
  assert.ok(entrega.includes('revisor-de-plataforma'), 'the Entrega step never hands the text to the Revisor');
  assert.match(entrega, /Texto do post[^]*three turns|three turns[^]*Texto do post/i);
  assert.ok(/registrar-video[^\n]*turnosInternos/.test(entrega.slice(entrega.indexOf('Revisor de plataforma'))), 'each turn is not recorded with the internal-loop counters');
  assert.match(entrega, /one question with two options/i);
  assert.match(entrega, /evolucao-proposta/);
});

test('the edicao skill never shows a Texto do post the Revisor did not approve', () => {
  const close = entrega.slice(entrega.indexOf('6. **Close.**'));
  assert.match(close, /aprovado|approved/i);
  assert.match(close, /Revisor/);
});

test('the edicao skill describes the on-request path for an Entregue or Arquivado Vídeo without moving its Status', () => {
  assert.ok(pedido.length > 0, 'the edicao skill has no section 7');
  assert.match(pedido, /Entregue/);
  assert.match(pedido, /Arquivado/);
  assert.match(pedido, /social-media/);
  assert.match(pedido, /revisor-de-plataforma|Revisor de plataforma/);
  assert.match(pedido, /Status[^\n]*(unchanged|never change|does not change)|(unchanged|never change|does not change)[^\n]*Status/i);
  assert.match(pedido, /entrega/);
  assert.ok(!/registrar-video[^\n]*"status"/.test(pedido), 'the on-request path must not record a Status');
  assert.ok(/Entregue[^|\n]*Texto do post|Texto do post[^|\n]*Entregue/.test(edicao.slice(0, edicao.indexOf('## 2. '))), 'the skill\'s description or status table never points an Entregue Vídeo to the text on request');
});

test('the entry skill tells the Diretor it can write a Texto do post for a delivered Vídeo on request', () => {
  const estudioSkill = shipped('plugin', 'estudio', 'skills', 'estudio', 'SKILL.md');
  assert.match(estudioSkill, /Texto do post[^\n]*(Entregue|Arquivado|delivered|older)|(Entregue|Arquivado|delivered|older)[^\n]*Texto do post/);
  assert.ok(estudioSkill.includes('edicao/SKILL.md'));
});

test('the README, the wiki and the log describe the Revisor judging the Texto do post', () => {
  const readme = shipped('README.md');
  const row = readme.split('\n').find((l) => l.startsWith('| **Revisor de plataforma**'));
  assert.match(row, /Texto do post/);
  assert.match(readme, /Texto do post[^\n]*(Entregue|Arquivado|já entregue|antigo)/);
  assert.ok(!/the Revisor de plataforma judging it is still to come/.test(shipped('wiki', 'entities', 'studio-personas.md')));
  assert.ok(!/still to come/.test(shipped('wiki', 'overview.md')), 'the overview still says the Revisor judging the text is to come');
  assert.match(shipped('wiki', 'concepts', 'post-copy.md'), /isca-de-engajamento/);
  assert.match(shipped('wiki', 'log.md'), /^## \[\d{4}-\d{2}-\d{2}\] update \| .*Revisor de plataforma.*\(ticket #45\)$/m);
});
