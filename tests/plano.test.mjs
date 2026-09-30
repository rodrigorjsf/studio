// Seam 1 — the deterministic CLI, for the Plano and the Quadros de estilo (ticket #10):
// `plano` checks the Vídeo's `plano.json` against what the ingest measured (every trigger a
// real spoken word, nothing before it is said, the Zona do rosto free, text inside the Área
// livre, Prints present) and tells whether one Gate or two approve it; `aprovar-plano` records
// her approval at that Gate. Drives plugin/estudio/scripts/estudio.mjs as a process and asserts
// only on its JSON output, exit code and the files it produces.
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

// What the transcriber writes: faster-whisper words, punctuation kept, seconds on the clock.
const PALAVRAS = [
  { w: 'Olá!', s: 0.2, e: 0.5 },
  { w: 'Hoje', s: 0.6, e: 0.9 },
  { w: 'uma', s: 1.0, e: 1.2 },
  { w: 'pesquisa,', s: 1.3, e: 1.8 },
  { w: 'mostrou', s: 1.9, e: 2.3 },
  { w: 'que', s: 2.4, e: 2.5 },
  { w: '70%', s: 2.6, e: 3.0 },
  { w: 'seguem.', s: 3.1, e: 3.5 },
];
// Her face sits in the upper middle of the vertical frame.
const ZONA = { x: 0.3, y: 0.1, largura: 0.4, altura: 0.35 };
const DURACAO = 4;

// A Plano that respects every rule: a clean camera opening, a Print on "pesquisa" and a text
// over the camera on "70%", below her face and inside the Área livre.
function planoValido() {
  return {
    schemaVersion: 1,
    tempoEstimadoMin: 30,
    creditosEstimados: null,
    direcoes: [
      { rotulo: 'A', resumo: 'Câmera limpa, a notícia inteira na tela e o número em destaque.', recomendada: true },
      { rotulo: 'B', resumo: 'Tela dividida do começo ao fim, com a notícia à esquerda.' },
    ],
    pedidosDela: [],
    cenas: [
      { tipo: 'camera', inicio: 0, fim: 1.3 },
      {
        tipo: 'demo', inicio: 1.3, fim: 2.6,
        gatilho: { indice: 3, palavra: 'pesquisa' },
        print: { arquivo: 'noticia.png', frase: '70% dos brasileiros seguem' },
      },
      {
        tipo: 'camera-motion', inicio: 2.6, fim: 4,
        gatilho: { indice: 6, palavra: '70%' },
        elementos: [{ tipo: 'texto', area: { x: 0.1, y: 0.6, largura: 0.8, altura: 0.1 } }],
      },
    ],
    quadros: [
      { rotulo: 'A — a notícia', tempo: 1.5, arquivo: 'quadros/A.png' },
      { rotulo: 'B — o número', tempo: 3, arquivo: 'quadros/B.png' },
    ],
    aprovadoEm: null,
    quadrosAprovadosEm: null,
  };
}

// A fresh Estúdio with one approved Projeto and one Vídeo whose briefing and ingest are done,
// under a path with spaces and accents as on her Mac. `kitSemLacunas` fills the Kit's empty
// text fields, so the Kit defines the whole style.
function videoPronto({ kitSemLacunas = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio plano '));
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
  if (kitSemLacunas) {
    const edit = { camera: { comportamento: 'parada', enquadramento: 'peito para cima' }, imagens: { interacao: 'zoom lento' } };
    assert.equal(run('editar-kit', dir, PROJETO, JSON.stringify(edit)).out.edited, true);
  }

  const recording = path.join(root, 'gravação.mp4');
  fs.writeFileSync(recording, 'vídeo gravado pela Criadora');
  assert.equal(run('novo-video', dir, PROJETO, VIDEO, recording).out.created, true);
  const video = path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
  const doc = path.join(video, 'video.md');
  fs.writeFileSync(doc, fs.readFileSync(doc, 'utf8').replaceAll('_A preencher na entrevista._', 'Respondido.'));
  fs.mkdirSync(path.join(video, 'transcricao'));
  fs.writeFileSync(path.join(video, 'transcricao', 'palavras.json'), JSON.stringify(PALAVRAS));
  fs.writeFileSync(path.join(video, 'zona-do-rosto.json'), JSON.stringify({ measured: true, zona: ZONA, duracao: DURACAO }));
  fs.writeFileSync(path.join(video, 'prints', 'noticia.png'), 'print da notícia');
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, '{"nivel": 1, "status": "Planejamento"}').out.recorded, true);
  return { dir, video };
}

function escreverPlano(video, plano) {
  fs.writeFileSync(path.join(video, 'plano.json'), `${JSON.stringify(plano, null, 2)}\n`);
}

function comQuadros(video) {
  fs.mkdirSync(path.join(video, 'quadros'), { recursive: true });
  for (const nome of ['A.png', 'B.png']) fs.writeFileSync(path.join(video, 'quadros', nome), 'quadro');
}

test('a Plano whose every trigger is a spoken word, with its Quadros rendered, is ready for her', () => {
  const { dir, video } = videoPronto();
  escreverPlano(video, planoValido());
  comQuadros(video);

  const { code, out } = run('plano', dir, PROJETO, VIDEO);
  assert.equal(code, 0);
  assert.deepEqual(out.problemas, { plano: [], quadros: [] });
  assert.deepEqual(out.pronto, { plano: true, quadros: true });
  assert.equal(out.projeto, PROJETO);
  assert.equal(out.video, VIDEO);
});

test('content that appears before its word is said is refused, naming the scene and the word', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  plano.cenas[1].inicio = 1.1; // "pesquisa" is said at 1.3 s
  plano.cenas[0].fim = 1.1;
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.equal(out.pronto.plano, false);
  assert.deepEqual(out.problemas.plano, ['cena 2: starts at 1.1 s, before "pesquisa" is said (1.3 s)']);
});

test('a trigger must be the word actually spoken at that place of the transcript', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  plano.cenas[1].gatilho = { indice: 3, palavra: 'notícia' };
  plano.cenas[2].gatilho = { indice: 42, palavra: '70%' };
  delete plano.cenas[0].fim;
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.problemas.plano, [
    'cena 1: needs inicio and fim in seconds, inicio before fim',
    'cena 2: gatilho word 3 is "pesquisa,", not "notícia"',
    'cena 3: gatilho indice 42 is not a word of the transcript (0–7)',
  ]);
});

test('every insert is born from a word: only a clean camera scene may have no trigger', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  delete plano.cenas[2].gatilho;
  plano.cenas[2].fim = 4.5; // past the Master's 4 s
  plano.cenas.push({ tipo: 'slide', inicio: 3.9, fim: 4, gatilho: { indice: 7, palavra: 'seguem' } });
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.problemas.plano, [
    'cena 3: needs a gatilho {indice, palavra}: every insert starts on a spoken word',
    'cena 3: ends at 4.5 s, after the Master (4 s)',
    'cena 4: tipo "slide" is not a scene of the repertoire (camera, camera-enfase, camera-motion, camera-espaco, aula, demo, cena, broll, transformacao)',
  ]);
});

test('nothing drawn over the camera may touch the Zona do rosto measured from her frames', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  // A sticker on her chin, over the full camera.
  plano.cenas[2].elementos.push({ tipo: 'objeto', area: { x: 0.4, y: 0.4, largura: 0.2, altura: 0.1 } });
  // The same box in a split screen: the camera is moved and scaled there, so the measured zone
  // no longer tells where her face is; the check says so instead of pretending.
  plano.cenas[1].elementos = [{ tipo: 'objeto', area: { x: 0.4, y: 0.4, largura: 0.2, altura: 0.1 } }];
  plano.cenas[1].tipo = 'aula';
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.problemas.plano, ['cena 3: elemento 2 covers the Zona do rosto']);
  assert.deepEqual(out.rostoNaoVerificado, [2]);
});

test('in a vertical Vídeo, text must sit inside the Área livre the apps do not cover', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  plano.cenas[2].elementos = [
    { tipo: 'texto', area: { x: 0.1, y: 0.05, largura: 0.8, altura: 0.04 } }, // under the app's top bar
    { tipo: 'texto', area: { x: 0.1, y: 0.75, largura: 0.8, altura: 0.1 } }, // under the buttons and caption
    { tipo: 'texto', area: { x: 0.1, y: 1.2, largura: 0.8, altura: 0.1 } }, // not a box of the frame
  ];
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.problemas.plano, [
    'cena 3: elemento 1 is text outside the Área livre (y from 0.1302 to 0.7813 of the frame)',
    'cena 3: elemento 2 is text outside the Área livre (y from 0.1302 to 0.7813 of the frame)',
    'cena 3: elemento 3 area must be a box {x, y, largura, altura} of fractions from 0 to 1',
  ]);
});

test('a Print must be one she supplied, with the phrase the highlighter covers', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  plano.cenas[1].print = { arquivo: 'site-da-empresa.png', frase: '' };
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.problemas.plano, [
    'cena 2: print "site-da-empresa.png" is not in the Vídeo\'s prints folder',
    'cena 2: print needs the frase the highlighter covers',
  ]);
});

test('the Plano states the expected time, two or three directions with one recommended, and her requests', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  delete plano.tempoEstimadoMin;
  plano.direcoes = [{ rotulo: 'A', resumo: 'Só uma direção.' }];
  plano.pedidosDela = 'legenda amarela';
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.problemas.plano, [
    'tempoEstimadoMin must be the expected minutes until the Entrega (a number above 0)',
    'direcoes must be 2 or 3 directions {rotulo, resumo}, exactly one with recomendada: true',
    'pedidosDela must be a list of what she asked (empty when nothing)',
  ]);
});

test('a Nível 2 Plano also states the credits it expects to spend', () => {
  const { dir, video } = videoPronto();
  run('registrar-video', dir, PROJETO, VIDEO, '{"nivel": 2}');
  escreverPlano(video, planoValido());
  comQuadros(video);
  assert.deepEqual(run('plano', dir, PROJETO, VIDEO).out.problemas.plano, [
    'creditosEstimados must be the Higgsfield credits this Nível 2 Vídeo expects to spend (0 or more)',
  ]);

  escreverPlano(video, { ...planoValido(), creditosEstimados: 120 });
  assert.deepEqual(run('plano', dir, PROJETO, VIDEO).out.pronto, { plano: true, quadros: true });
});

test('two or three labeled Quadros de estilo, each rendered at a moment of her video', () => {
  const { dir, video } = videoPronto();
  const plano = planoValido();
  plano.quadros[1].tempo = 9; // past the Master's 4 s
  escreverPlano(video, plano);

  let { out } = run('plano', dir, PROJETO, VIDEO);
  assert.deepEqual(out.pronto, { plano: true, quadros: false });
  assert.deepEqual(out.problemas.quadros, [
    'quadro 1: quadros/A.png has not been rendered',
    'quadro 2: tempo must be a moment of the Master (0 to 4 s)',
    'quadro 2: quadros/B.png has not been rendered',
  ]);

  plano.quadros = [plano.quadros[0]];
  escreverPlano(video, plano);
  comQuadros(video);
  ({ out } = run('plano', dir, PROJETO, VIDEO));
  assert.deepEqual(out.problemas.quadros, ['quadros must be 2 or 3 Quadros de estilo {rotulo, tempo, arquivo} with distinct labels']);
});

test('a Kit with style gaps takes two Gates, a Kit that defines the whole style takes one', () => {
  const lacunas = videoPronto();
  escreverPlano(lacunas.video, planoValido());
  let { out } = run('plano', lacunas.dir, PROJETO, VIDEO);
  assert.equal(out.gate, 'separado');
  assert.deepEqual(out.lacunasDoKit, ['camera.comportamento', 'camera.enquadramento', 'imagens.interacao']);

  const completo = videoPronto({ kitSemLacunas: true });
  escreverPlano(completo.video, planoValido());
  ({ out } = run('plano', completo.dir, PROJETO, VIDEO));
  assert.equal(out.gate, 'unico');
  assert.deepEqual(out.lacunasDoKit, []);
});

const frontmatter = (video) => fs.readFileSync(path.join(video, 'video.md'), 'utf8').split('---')[1];
const estadoDoVideo = (dir) => run('estado', dir).out.projetos[0].videos[0];

test('with a Kit that defines the style, one Gate approves the Plano and the Quadros together', () => {
  const { dir, video } = videoPronto({ kitSemLacunas: true });
  escreverPlano(video, planoValido());
  comQuadros(video);
  assert.deepEqual(
    [estadoDoVideo(dir).plano, estadoDoVideo(dir).quadros],
    ['rascunho', 'rascunho'],
  );

  // The Diretor opens the Gate: the Vídeo now waits for her.
  assert.equal(run('registrar-video', dir, PROJETO, VIDEO, '{"gate": "aberto"}').out.recorded, true);
  assert.deepEqual(run('estado', dir).out.waiting, [{ projeto: PROJETO, video: VIDEO, status: 'Planejamento' }]);

  // Two Gates are refused where one is due.
  assert.deepEqual(run('aprovar-plano', dir, PROJETO, VIDEO, 'plano').out, {
    approved: false, reason: 'wrong-gate', projeto: PROJETO, video: VIDEO, gate: 'unico',
  });

  const { code, out } = run('aprovar-plano', dir, PROJETO, VIDEO, 'plano-e-quadros');
  assert.equal(code, 0);
  assert.equal(out.approved, true);
  assert.equal(out.status, 'Construção');
  assert.equal(out.gates, 1);
  const plano = JSON.parse(fs.readFileSync(path.join(video, 'plano.json'), 'utf8'));
  assert.ok(Date.parse(plano.aprovadoEm) && plano.aprovadoEm === plano.quadrosAprovadosEm);

  const state = run('estado', dir).out;
  assert.deepEqual(state.errors, []);
  assert.deepEqual(state.waiting, [], 'the Gate is closed');
  assert.deepEqual([state.projetos[0].videos[0].plano, state.projetos[0].videos[0].quadros], ['aprovado', 'aprovados']);
  assert.match(frontmatter(video), /\nstatus: Construção\n/);
  assert.match(frontmatter(video), /\ngates: 1\n/);
});

test('with style gaps, the Plano is approved first and the Quadros at a second Gate', () => {
  const { dir, video } = videoPronto();
  escreverPlano(video, planoValido()); // no Quadros rendered yet: the Plano's Gate comes first

  assert.equal(run('aprovar-plano', dir, PROJETO, VIDEO, 'plano-e-quadros').out.reason, 'wrong-gate');
  assert.equal(run('aprovar-plano', dir, PROJETO, VIDEO, 'quadros').out.reason, 'plano-not-approved');
  let { out } = run('aprovar-plano', dir, PROJETO, VIDEO, 'plano');
  assert.equal(out.approved, true);
  assert.equal(out.status, 'Planejamento', 'the look is still to approve');
  assert.equal(out.gates, 1);
  assert.deepEqual([estadoDoVideo(dir).plano, estadoDoVideo(dir).quadros], ['aprovado', 'rascunho']);

  // The Quadros are not rendered yet: refused with what is missing.
  ({ out } = run('aprovar-plano', dir, PROJETO, VIDEO, 'quadros'));
  assert.equal(out.approved, false);
  assert.equal(out.reason, 'not-ready');
  assert.deepEqual(out.problemas, ['quadro 1: quadros/A.png has not been rendered', 'quadro 2: quadros/B.png has not been rendered']);

  comQuadros(video);
  ({ out } = run('aprovar-plano', dir, PROJETO, VIDEO, 'quadros'));
  assert.equal(out.approved, true);
  assert.equal(out.status, 'Construção');
  assert.equal(out.gates, 2);
  assert.equal(run('aprovar-plano', dir, PROJETO, VIDEO, 'quadros').out.reason, 'not-planejamento');
});

test('a Plano that breaks a rule is never approved', () => {
  const { dir, video } = videoPronto({ kitSemLacunas: true });
  const plano = planoValido();
  plano.cenas[1].inicio = 1.1;
  escreverPlano(video, plano);
  comQuadros(video);

  const { out } = run('aprovar-plano', dir, PROJETO, VIDEO, 'plano-e-quadros');
  assert.deepEqual(out, {
    approved: false, reason: 'not-ready', projeto: PROJETO, video: VIDEO,
    problemas: ['cena 2: starts at 1.1 s, before "pesquisa" is said (1.3 s)'],
  });
  assert.match(frontmatter(video), /\nstatus: Planejamento\n/);
  assert.equal(estadoDoVideo(dir).plano, 'rascunho');
});

test('a Plano is checked only once there is one and the ingest is done', () => {
  const { dir, video } = videoPronto();
  assert.equal(run('plano', dir, PROJETO, VIDEO).out.reason, 'no-plano');
  assert.equal(estadoDoVideo(dir).plano, 'ausente');
  escreverPlano(video, planoValido());
  fs.rmSync(path.join(video, 'zona-do-rosto.json'));
  assert.equal(run('plano', dir, PROJETO, VIDEO).out.reason, 'ingest-incomplete');
  assert.equal(run('plano', dir, PROJETO, 'Outro vídeo').out.reason, 'unknown-video');
  assert.equal(run('aprovar-plano', dir, PROJETO, VIDEO, 'tudo').out.reason, 'invalid-etapa');

  fs.writeFileSync(path.join(video, 'zona-do-rosto.json'), JSON.stringify({ measured: true, zona: ZONA, duracao: DURACAO }));
  fs.writeFileSync(path.join(video, 'plano.json'), 'null');
  assert.equal(run('plano', dir, PROJETO, VIDEO).out.reason, 'invalid-plano');
  fs.writeFileSync(path.join(video, 'plano.json'), '{"cenas": [');
  assert.equal(run('plano', dir, PROJETO, VIDEO).out.reason, 'invalid-plano');
  const state = run('estado', dir).out;
  assert.equal(state.errors.length, 1);
  assert.match(state.errors[0].file, /plano\.json$/);
});
