// Seam 1 — the deterministic CLI, for the read-only Notion context (ticket #20): the Página
// Notion links of a Projeto or a Vídeo (`vincular-notion`), the dated Resumo Notion written from
// them (`resumo-notion`), the check for pages changed since the Resumo before the Plano
// (`conferir-notion`), and what `estado` and `plano` report about both. No live Notion call:
// the connector's part (reading a page, its last-edited time) is played by the test's input.
// Drives plugin/estudio/scripts/estudio.mjs as a process and asserts only on its JSON output,
// exit code and the files it produces.
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
const MARCA = 'https://www.notion.so/minha-empresa/Notas-de-marca-1a2b3c4d5e6f47a8b9c0d1e2f3a4b5c6';
const CALENDARIO = 'https://www.notion.so/minha-empresa/Calendario-de-conteudo-0f1e2d3c4b5a49687766554433221100';
const ROTEIRO = 'https://minha-empresa.notion.site/Roteiro-da-dica-99aa88bb77cc66dd55ee44ff33aa22bb';

// A fresh Estúdio with one approved Projeto and one Vídeo in Briefing, under a path with spaces
// and accents as on her Mac.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio notion '));
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
  return dir;
}

const projetoDir = (dir) => path.join(dir, 'projetos', PROJETO);
const videoDir = (dir) => path.join(projetoDir(dir), 'videos', VIDEO);
const projetoEstado = (dir) => run('estado', dir).out.projetos.find((p) => p.id === PROJETO);
const videoEstado = (dir) => projetoEstado(dir).videos.find((v) => v.id === VIDEO);
const vincular = (dir, edit) => run('vincular-notion', dir, PROJETO, JSON.stringify(edit));

test('a Projeto or Vídeo with no Página Notion is valid: zero links, nothing to summarize', () => {
  const dir = estudio();
  const { out } = run('estado', dir);
  assert.deepEqual(out.errors, []);
  assert.deepEqual(projetoEstado(dir).notion, { paginas: 0, resumo: 'sem-paginas' });
  assert.deepEqual(videoEstado(dir).notion, { paginas: 0, resumo: 'sem-paginas' });
});

test('the Projeto Grilling links several Páginas Notion, sub-pages off unless she consents', () => {
  const dir = estudio();
  const { code, out } = vincular(dir, {
    vincular: [
      { url: MARCA, titulo: 'Notas de marca' },
      { url: CALENDARIO, titulo: 'Calendário de conteúdo', subpaginas: true },
    ],
  });
  assert.equal(code, 0);
  assert.equal(out.linked, true);
  assert.deepEqual(out.paginas.map(({ url, titulo, subpaginas }) => ({ url, titulo, subpaginas })), [
    { url: MARCA, titulo: 'Notas de marca', subpaginas: false },
    { url: CALENDARIO, titulo: 'Calendário de conteúdo', subpaginas: true },
  ]);
  assert.ok(out.paginas.every((p) => !Number.isNaN(Date.parse(p.vinculadaEm))));
  assert.equal(out.resumo, 'ausente');
  assert.deepEqual(run('estado', dir).out.errors, []);
  assert.deepEqual(projetoEstado(dir).notion, { paginas: 2, resumo: 'ausente' });
  assert.deepEqual(videoEstado(dir).notion, { paginas: 0, resumo: 'sem-paginas' });
});

test('editar-projeto changes and unlinks a Página Notion; unlinking the last one leaves zero', () => {
  const dir = estudio();
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }, { url: CALENDARIO, titulo: 'Calendário' }] });

  let { out } = vincular(dir, { vincular: [{ url: MARCA, titulo: 'Marca 2026', subpaginas: true }] });
  assert.deepEqual(out.paginas.map((p) => [p.url, p.titulo, p.subpaginas]), [
    [MARCA, 'Marca 2026', true],
    [CALENDARIO, 'Calendário', false],
  ]);

  ({ out } = vincular(dir, { desvincular: [CALENDARIO] }));
  assert.deepEqual(out.paginas.map((p) => p.url), [MARCA]);
  ({ out } = vincular(dir, { desvincular: [MARCA] }));
  assert.deepEqual(out.paginas, []);
  assert.deepEqual(projetoEstado(dir).notion, { paginas: 0, resumo: 'sem-paginas' });
  assert.deepEqual(run('estado', dir).out.errors, []);
});

test('the Vídeo briefing links a Página Notion to that Vídeo only', () => {
  const dir = estudio();
  const { out } = vincular(dir, { video: VIDEO, vincular: [{ url: ROTEIRO, titulo: 'Roteiro da dica' }] });
  assert.equal(out.linked, true);
  assert.equal(out.video, VIDEO);
  assert.deepEqual(videoEstado(dir).notion, { paginas: 1, resumo: 'ausente' });
  assert.deepEqual(projetoEstado(dir).notion, { paginas: 0, resumo: 'sem-paginas' });
});

test('only a Notion page address can be linked, and only a linked page unlinked', () => {
  const dir = estudio();
  const refused = (edit, reason) => {
    const { code, out } = vincular(dir, edit);
    assert.equal(code, 0);
    assert.equal(out.linked, false);
    assert.equal(out.reason, reason, JSON.stringify(out));
  };
  refused({ vincular: [{ url: 'https://docs.google.com/document/d/abc', titulo: 'Doc' }] }, 'invalid-link');
  refused({ vincular: [{ url: 'http://www.notion.so/pagina-1a2b', titulo: 'Sem https' }] }, 'invalid-link');
  refused({ vincular: [{ url: 'https://evil.com/?x=notion.so', titulo: 'Disfarçada' }] }, 'invalid-link');
  refused({ vincular: [{ url: MARCA, titulo: '' }] }, 'invalid-link');
  refused({ vincular: [{ url: MARCA, titulo: 'Marca', subpaginas: 'sim' }] }, 'invalid-link');
  refused({ desvincular: [MARCA] }, 'not-linked');
  refused({ apagar: [MARCA] }, 'invalid-edit');
  refused({ video: 'Não existe', vincular: [{ url: MARCA, titulo: 'Marca' }] }, 'unknown-video');
  assert.equal(run('vincular-notion', dir, PROJETO, 'não é json').out.reason, 'invalid-edit');
  assert.equal(run('vincular-notion', dir, 'Outro', '{"vincular": []}').out.reason, 'unknown-projeto');
  assert.equal(fs.existsSync(path.join(projetoDir(dir), 'notion')), false);
});

const TEXTO = '## O que peguei de cada página\n\n- **Notas de marca**: tom próximo, sem gírias.\n';
const resumir = (dir, resumo) => run('resumo-notion', dir, PROJETO, JSON.stringify(resumo));

test('a dated Resumo Notion is written from the linked pages only, for her to read', () => {
  const dir = estudio();
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }, { url: CALENDARIO, titulo: 'Calendário', subpaginas: true }] });
  const antes = Date.now();
  const { code, out } = resumir(dir, { paginasLidas: [MARCA, CALENDARIO], subpaginasLidas: [CALENDARIO], texto: TEXTO });
  assert.equal(code, 0);
  assert.equal(out.written, true, JSON.stringify(out));
  assert.equal(out.arquivo, `projetos/${PROJETO}/notion/resumo.md`);
  assert.ok(Date.parse(out.geradoEm) >= antes - 1000);

  const resumo = fs.readFileSync(path.join(projetoDir(dir), 'notion', 'resumo.md'), 'utf8');
  assert.match(resumo, new RegExp(`geradoEm: ${out.geradoEm.replace(/[.]/g, '\\.')}`));
  assert.ok(resumo.includes(`  - ${MARCA}`) && resumo.includes(`  - ${CALENDARIO}`));
  assert.ok(resumo.includes('Notas de marca**: tom próximo, sem gírias.'));
  assert.deepEqual(run('estado', dir).out.errors, []);
  assert.deepEqual(projetoEstado(dir).notion, { paginas: 2, resumo: 'atualizado' });
});

test('a Resumo cannot take from an unlinked page, nor from sub-pages without her consent, nor skip a linked page', () => {
  const dir = estudio();
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }] });
  const refused = (resumo, reason) => {
    const { out } = resumir(dir, resumo);
    assert.equal(out.written, false);
    assert.equal(out.reason, reason, JSON.stringify(out));
  };
  refused({ paginasLidas: [MARCA, CALENDARIO], texto: TEXTO }, 'not-linked');
  refused({ paginasLidas: [MARCA], subpaginasLidas: [MARCA], texto: TEXTO }, 'no-consent');
  refused({ paginasLidas: [], texto: TEXTO }, 'missing-pages');
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca', subpaginas: true }] });
  refused({ paginasLidas: [MARCA], texto: TEXTO }, 'missing-subpages');
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca', subpaginas: false }] });
  refused({ paginasLidas: [MARCA], texto: '  ' }, 'invalid-resumo');
  refused({ paginasLidas: [MARCA], texto: TEXTO, geradoEm: '2020-01-01' }, 'invalid-resumo');
  assert.equal(fs.existsSync(path.join(projetoDir(dir), 'notion', 'resumo.md')), false);
  assert.equal(run('resumo-notion', dir, PROJETO, JSON.stringify({ video: VIDEO, paginasLidas: [MARCA], texto: TEXTO })).out.reason, 'not-linked');
});

test('a Vídeo gets its own Resumo Notion, next to its document', () => {
  const dir = estudio();
  vincular(dir, { video: VIDEO, vincular: [{ url: ROTEIRO, titulo: 'Roteiro da dica' }] });
  const { out } = resumir(dir, { video: VIDEO, paginasLidas: [ROTEIRO], texto: TEXTO });
  assert.equal(out.written, true, JSON.stringify(out));
  assert.equal(out.arquivo, `projetos/${PROJETO}/videos/${VIDEO}/notion/resumo.md`);
  assert.deepEqual(videoEstado(dir).notion, { paginas: 1, resumo: 'atualizado' });
});

test('linking, unlinking or withdrawing sub-page consent after the Resumo makes it out of date', () => {
  const dir = estudio();
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }, { url: CALENDARIO, titulo: 'Calendário', subpaginas: true }] });
  resumir(dir, { paginasLidas: [MARCA, CALENDARIO], subpaginasLidas: [CALENDARIO], texto: TEXTO });
  vincular(dir, { vincular: [{ url: CALENDARIO, titulo: 'Calendário', subpaginas: false }] });
  assert.equal(projetoEstado(dir).notion.resumo, 'desatualizado');
  vincular(dir, { vincular: [{ url: CALENDARIO, titulo: 'Calendário', subpaginas: true }] });
  assert.equal(projetoEstado(dir).notion.resumo, 'atualizado');
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca', subpaginas: true }] });
  assert.equal(projetoEstado(dir).notion.resumo, 'desatualizado', 'consent granted: its sub-pages are still to be read');
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca', subpaginas: false }] });
  vincular(dir, { vincular: [{ url: ROTEIRO, titulo: 'Roteiro' }] });
  assert.equal(projetoEstado(dir).notion.resumo, 'desatualizado');
  vincular(dir, { desvincular: [ROTEIRO, MARCA] });
  assert.equal(projetoEstado(dir).notion.resumo, 'desatualizado');
  vincular(dir, { desvincular: [CALENDARIO] });
  assert.deepEqual(projetoEstado(dir).notion, { paginas: 0, resumo: 'desatualizado' });
  assert.deepEqual(run('estado', dir).out.errors, []);
});

test('estado validates link records and Resumo documents written by hand, file by file', () => {
  const dir = estudio();
  const notionDir = path.join(projetoDir(dir), 'notion');
  const videoNotion = path.join(videoDir(dir), 'notion');
  fs.mkdirSync(notionDir);
  fs.mkdirSync(videoNotion);
  fs.writeFileSync(path.join(notionDir, 'paginas.json'), JSON.stringify({
    schemaVersion: 1,
    paginas: [
      { url: 'https://example.com/pagina', titulo: 'Fora do Notion', subpaginas: false, vinculadaEm: '2026-09-01T10:00:00.000Z' },
      { url: MARCA, titulo: 'Marca', subpaginas: 'não', vinculadaEm: '2026-09-01T10:00:00.000Z' },
      { url: CALENDARIO, titulo: 'Calendário', subpaginas: false, vinculadaEm: 'ontem' },
    ],
  }));
  fs.writeFileSync(path.join(notionDir, 'resumo.md'), `---\ngeradoEm: ontem\npaginasLidas:\n  - ${MARCA}\nsubpaginasLidas:\n  - ${CALENDARIO}\n---\nTexto\n`);
  fs.writeFileSync(path.join(videoNotion, 'paginas.json'), 'não é json');
  fs.writeFileSync(path.join(videoNotion, 'resumo.md'), 'sem frontmatter');

  const { out } = run('estado', dir);
  const byFile = (file) => out.errors.filter((e) => e.file === file).map((e) => e.message).join('\n');
  const links = byFile(`projetos/${PROJETO}/notion/paginas.json`);
  assert.match(links, /pagina 1: .*is not a Notion page/);
  assert.match(links, /pagina 2: .*subpaginas must be true or false/);
  assert.match(links, /pagina 3: vinculadaEm must be a date/);
  const resumo = byFile(`projetos/${PROJETO}/notion/resumo.md`);
  assert.match(resumo, /geradoEm must be the date/);
  assert.match(resumo, /subpaginasLidas: .* is not one of its paginasLidas/);
  assert.match(byFile(`projetos/${PROJETO}/videos/${VIDEO}/notion/paginas.json`), /not valid JSON/);
  assert.match(byFile(`projetos/${PROJETO}/videos/${VIDEO}/notion/resumo.md`), /frontmatter/);
  assert.deepEqual(out.nextStep, { action: 'corrigir-erros' });
  assert.equal(vincular(dir, { vincular: [{ url: ROTEIRO, titulo: 'Roteiro' }] }).out.reason, 'invalid-links');
});

// What the connector reports for each linked page: when it was last edited (null: not reported).
const conferir = (dir, editadas) => run('conferir-notion', dir, PROJETO, VIDEO, JSON.stringify(editadas));
const horas = (base, n) => new Date(Date.parse(base) + n * 3600 * 1000).toISOString();

test('before the Plano, a page edited after its Resumo is detected and a refresh is asked', () => {
  const dir = estudio();
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }, { url: CALENDARIO, titulo: 'Calendário' }] });
  vincular(dir, { video: VIDEO, vincular: [{ url: ROTEIRO, titulo: 'Roteiro' }] });
  const { geradoEm } = resumir(dir, { paginasLidas: [MARCA, CALENDARIO], texto: TEXTO }).out;
  const doVideo = resumir(dir, { video: VIDEO, paginasLidas: [ROTEIRO], texto: TEXTO }).out.geradoEm;

  let { code, out } = conferir(dir, { [MARCA]: horas(geradoEm, -48), [CALENDARIO]: horas(geradoEm, -1), [ROTEIRO]: horas(doVideo, -2) });
  assert.equal(code, 0);
  assert.equal(out.checked, true, JSON.stringify(out));
  assert.deepEqual(out.niveis.projeto, { resumo: 'atualizado', geradoEm, mudaram: [], naoConferidas: [] });
  assert.deepEqual(out.niveis.video, { resumo: 'atualizado', geradoEm: doVideo, mudaram: [], naoConferidas: [] });
  assert.equal(out.perguntarAtualizar, false);

  ({ out } = conferir(dir, { [MARCA]: horas(geradoEm, 1), [CALENDARIO]: null, [ROTEIRO]: horas(doVideo, 3) }));
  assert.deepEqual(out.niveis.projeto.mudaram, [MARCA]);
  assert.deepEqual(out.niveis.projeto.naoConferidas, [CALENDARIO]);
  assert.deepEqual(out.niveis.video.mudaram, [ROTEIRO]);
  assert.equal(out.perguntarAtualizar, true);

  // A page read without a last-edited date may have changed: she is asked. A page not looked
  // up at all (her connector did not answer) asks nothing: Notion never blocks the Plano.
  ({ out } = conferir(dir, { [MARCA]: horas(geradoEm, -1), [CALENDARIO]: null, [ROTEIRO]: horas(doVideo, -1) }));
  assert.deepEqual(out.niveis.projeto.naoConferidas, [CALENDARIO]);
  assert.equal(out.perguntarAtualizar, true);
  ({ out } = conferir(dir, {}));
  assert.deepEqual(out.niveis.projeto.naoConferidas, [MARCA, CALENDARIO]);
  assert.equal(out.perguntarAtualizar, false);
});

test('a missing or out-of-date Resumo also asks for a refresh; no linked page asks nothing', () => {
  const dir = estudio();
  let { out } = conferir(dir, {});
  assert.deepEqual(out.niveis.projeto, { resumo: 'sem-paginas', geradoEm: null, mudaram: [], naoConferidas: [] });
  assert.equal(out.perguntarAtualizar, false);

  vincular(dir, { video: VIDEO, vincular: [{ url: ROTEIRO, titulo: 'Roteiro' }] });
  ({ out } = conferir(dir, { [ROTEIRO]: '2026-09-01T10:00:00.000Z' }));
  assert.equal(out.niveis.video.resumo, 'ausente');
  assert.equal(out.perguntarAtualizar, true);
});

test('conferir-notion takes only linked pages and dates', () => {
  const dir = estudio();
  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }] });
  assert.equal(conferir(dir, { [CALENDARIO]: '2026-09-01T10:00:00.000Z' }).out.reason, 'not-linked');
  assert.equal(conferir(dir, { [MARCA]: 'ontem' }).out.reason, 'invalid-edit');
  assert.equal(run('conferir-notion', dir, PROJETO, 'Outro vídeo', '{}').out.reason, 'unknown-video');
});

// A Vídeo ready for its Plano: transcript and Zona do rosto measured, and a Plano that respects
// every other rule, so only its Notion citation is under test.
function comPlano(dir, resumosNotion) {
  const video = videoDir(dir);
  fs.mkdirSync(path.join(video, 'transcricao'), { recursive: true });
  fs.writeFileSync(path.join(video, 'transcricao', 'palavras.json'), JSON.stringify([{ w: 'Olá', s: 0.2, e: 0.5 }, { w: 'dica', s: 0.6, e: 1 }]));
  fs.writeFileSync(path.join(video, 'zona-do-rosto.json'), JSON.stringify({ measured: true, zona: { x: 0.3, y: 0.1, largura: 0.4, altura: 0.3 }, duracao: 2 }));
  fs.writeFileSync(path.join(video, 'plano.json'), JSON.stringify({
    schemaVersion: 1,
    tempoEstimadoMin: 20,
    creditosEstimados: null,
    direcoes: [{ rotulo: 'A', resumo: 'Câmera limpa.', recomendada: true }, { rotulo: 'B', resumo: 'Legenda grande.' }],
    pedidosDela: [],
    ...(resumosNotion && { resumosNotion }),
    cenas: [{ tipo: 'camera', inicio: 0, fim: 2 }],
    quadros: [],
  }));
  return run('plano', dir, PROJETO, VIDEO).out;
}
const notionProblems = (out) => out.problemas.plano.filter((p) => /Resumo Notion/.test(p));

test('the Plano cites every Resumo Notion the Vídeo relies on, by its date', () => {
  const dir = estudio();
  let out = comPlano(dir);
  assert.equal(out.checked, true, JSON.stringify(out));
  assert.deepEqual(notionProblems(out), [], 'no Página Notion: nothing to cite');

  vincular(dir, { vincular: [{ url: MARCA, titulo: 'Notas de marca' }] });
  vincular(dir, { video: VIDEO, vincular: [{ url: ROTEIRO, titulo: 'Roteiro' }] });
  const doProjeto = resumir(dir, { paginasLidas: [MARCA], texto: TEXTO }).out.geradoEm;
  const doVideo = resumir(dir, { video: VIDEO, paginasLidas: [ROTEIRO], texto: TEXTO }).out.geradoEm;

  out = comPlano(dir);
  assert.equal(out.pronto.plano, false);
  assert.equal(notionProblems(out).length, 2, JSON.stringify(out.problemas.plano));

  out = comPlano(dir, [{ nivel: 'projeto', geradoEm: '2026-01-01T00:00:00.000Z' }, { nivel: 'video', geradoEm: doVideo }]);
  assert.match(notionProblems(out).join(), /older Resumo Notion of the projeto/);

  out = comPlano(dir, [{ nivel: 'projeto', geradoEm: doProjeto }, { nivel: 'video', geradoEm: doVideo }]);
  assert.deepEqual(out.problemas.plano, []);
  assert.equal(out.pronto.plano, true);

  // A Plano she already approved stays as she approved it, even when a Resumo is refreshed later.
  const planoFile = path.join(videoDir(dir), 'plano.json');
  fs.writeFileSync(planoFile, JSON.stringify({ ...JSON.parse(fs.readFileSync(planoFile, 'utf8')), aprovadoEm: '2026-09-30T12:00:00.000Z' }));
  resumir(dir, { paginasLidas: [MARCA], texto: `${TEXTO}\n- Nova nota.` });
  assert.deepEqual(notionProblems(run('plano', dir, PROJETO, VIDEO).out), []);
});
