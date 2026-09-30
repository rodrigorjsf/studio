// Seam 1 — the deterministic CLI, for the Texto do post (ticket #44): `texto-do-post` checks the
// Social media's `entrega/texto-do-post.md` mechanically — only the Kit's platforms, each present;
// at most 5 Instagram hashtags; at most 60 on any platform; a Shorts title within 100 characters and
// free of hashtags; no generic filler hashtag — and returns `problemas` and `pronto`. Drives
// plugin/estudio/scripts/estudio.mjs as a process against a temporary Estúdio and asserts only on its
// JSON output, exit code and the files it leaves alone.
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

// An Estúdio with one approved Projeto (Kit on all three platforms) holding one Vídeo, under a
// path with spaces and accents as on her Mac.
function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio texto do post '));
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

const videoDir = (dir) => path.join(dir, 'projetos', PROJETO, 'videos', VIDEO);
const projetoKit = (dir) => path.join(dir, 'projetos', PROJETO, 'kit.json');
const textoFile = (dir) => path.join(videoDir(dir), 'entrega', 'texto-do-post.md');

function escrever(dir, texto) {
  fs.mkdirSync(path.dirname(textoFile(dir)), { recursive: true });
  fs.writeFileSync(textoFile(dir), texto);
}

function comPlataformas(file, plataformas) {
  const kit = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (plataformas === undefined) delete kit.plataformas;
  else kit.plataformas = plataformas;
  fs.writeFileSync(file, JSON.stringify(kit));
}

const tags = (n, prefix = 'tag') => Array.from({ length: n }, (_, i) => `#${prefix}${String.fromCharCode(97 + (i % 26))}${Math.floor(i / 26)}`).join(' ');
const TITULO_CEM = `${'a'.repeat(99)}?`; // exactly 100 characters

// A section per platform, each following the rules: a first line with the keyword, a short honest
// text, one genuine question, specific hashtags, and a title for Shorts.
const SECOES = {
  reels: '## Reels\n\nMarketing de conteúdo sem enrolação\nEm 30 segundos, o que mudou no meu jeito de planejar. Você já tentou isso?\n\n#marketingdeconteudo #planejamento #empreendedorismo\n',
  tiktok: '## TikTok\n\nMarketing de conteúdo sem enrolação\nO que mudou no meu jeito de planejar, em 30 segundos.\n\n#marketingdeconteudo #planejamento\n',
  shorts: '## Shorts\n\n**Título:** Marketing de conteúdo sem enrolação em 30 segundos\n\nMarketing de conteúdo sem enrolação: o que mudou no meu jeito de planejar.\n\n#marketingdeconteudo #planejamento\n',
};
const texto = (...plataformas) => `# Texto do post\n\n${plataformas.map((p) => SECOES[p]).join('\n')}`;
const TODAS = texto('reels', 'tiktok', 'shorts');

const check = (dir) => run('texto-do-post', dir, PROJETO, VIDEO);

test('a text that follows every rule, on each of the Kit\'s platforms, is ready', () => {
  const dir = estudio();
  escrever(dir, TODAS);

  const { code, out } = check(dir);
  assert.equal(code, 0);
  assert.deepEqual(out.problemas, []);
  assert.equal(out.pronto, true);
  assert.equal(out.projeto, PROJETO);
  assert.equal(out.video, VIDEO);
});

test('a platform of the Kit with no section is refused, naming it', () => {
  const dir = estudio();
  escrever(dir, texto('reels', 'tiktok'));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.equal(out.problemas.length, 1, out.problemas.join(' | '));
  assert.match(out.problemas[0], /shorts/);
});

test('a section for a platform outside the Kit is refused as extra', () => {
  const dir = estudio();
  comPlataformas(projetoKit(dir), ['reels']);
  escrever(dir, texto('reels', 'tiktok'));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.equal(out.problemas.length, 1, out.problemas.join(' | '));
  assert.match(out.problemas[0], /tiktok/);
});

test('a heading that names no platform is refused as extra', () => {
  const dir = estudio();
  escrever(dir, `${TODAS}\n## Facebook\n\nTexto\n`);

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.match(out.problemas.join(' | '), /Facebook/);
});

test('the Kit\'s own list is the one that counts: a Kit of one platform needs one section', () => {
  const dir = estudio();
  comPlataformas(projetoKit(dir), ['shorts']);
  escrever(dir, texto('shorts'));
  assert.deepEqual(check(dir).out.problemas, []);

  // A Vídeo that follows its own Kit copy follows that copy's list, not the Projeto's.
  fs.copyFileSync(projetoKit(dir), path.join(videoDir(dir), 'kit.json'));
  comPlataformas(projetoKit(dir), ['reels', 'tiktok', 'shorts']);
  assert.deepEqual(check(dir).out.problemas, []);
});

test('a Kit without `plataformas` reads as all three', () => {
  const dir = estudio();
  comPlataformas(projetoKit(dir), undefined);
  escrever(dir, texto('reels', 'tiktok'));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.match(out.problemas.join(' | '), /shorts/);
});

test('more than 5 Instagram hashtags is refused; exactly 5 passes, and TikTok may have more', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento #empreendedorismo', tags(6)));
  const refused = check(dir).out;
  assert.equal(refused.pronto, false);
  assert.equal(refused.problemas.length, 1, refused.problemas.join(' | '));
  assert.match(refused.problemas[0], /reels/);
  assert.match(refused.problemas[0], /5/);

  escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento #empreendedorismo', tags(5)));
  assert.deepEqual(check(dir).out.problemas, []);

  escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento\n\n## Shorts', `${tags(6)}\n\n## Shorts`));
  assert.deepEqual(check(dir).out.problemas, [], 'the 5-hashtag cap is Instagram\'s alone');
});

test('more than 60 hashtags on any platform is refused; exactly 60 passes', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento\n', tags(61)));
  const refused = check(dir).out;
  assert.equal(refused.pronto, false);
  assert.ok(refused.problemas.some((p) => /tiktok|shorts/.test(p) && /60/.test(p)), refused.problemas.join(' | '));

  escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento\n', tags(60)));
  assert.deepEqual(check(dir).out.problemas, []);
});

test('a Shorts title of 101 characters is refused; exactly 100 passes', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace('Marketing de conteúdo sem enrolação em 30 segundos', `${TITULO_CEM}a`));
  const refused = check(dir).out;
  assert.equal(refused.pronto, false);
  assert.equal(refused.problemas.length, 1, refused.problemas.join(' | '));
  assert.match(refused.problemas[0], /shorts/);
  assert.match(refused.problemas[0], /100/);

  escrever(dir, TODAS.replace('Marketing de conteúdo sem enrolação em 30 segundos', TITULO_CEM));
  assert.deepEqual(check(dir).out.problemas, []);
});

test('a Shorts title with a hashtag in it is refused, however short', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace('Marketing de conteúdo sem enrolação em 30 segundos', 'Planejar sem enrolação #planejamento'));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.equal(out.problemas.length, 1, out.problemas.join(' | '));
  assert.match(out.problemas[0], /shorts/);
  assert.match(out.problemas[0], /title/);
});

test('a Shorts section with no title is refused', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace('**Título:** Marketing de conteúdo sem enrolação em 30 segundos\n\n', ''));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.match(out.problemas.join(' | '), /shorts.*title/);
});

test('every generic filler hashtag is refused, in any case and on any platform', () => {
  const fillers = ['#fyp', '#foryou', '#viral', '#explore', '#reels', '#trending', '#FYP', '#ForYou', '#ExplorePage'];
  const dir = estudio();
  for (const filler of fillers) {
    escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento\n\n## Shorts', `#marketingdeconteudo ${filler}\n\n## Shorts`));
    const { out } = check(dir);
    assert.equal(out.pronto, false, filler);
    assert.equal(out.problemas.length, 1, `${filler}: ${out.problemas.join(' | ')}`);
    assert.match(out.problemas[0], /tiktok/);
    assert.match(out.problemas[0], new RegExp(filler.toLowerCase()));
  }
});

test('a hashtag that only starts like a filler is accepted', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace('#marketingdeconteudo #planejamento\n\n## Shorts', '#explorarcidades #reelsdeviagem #fypa\n\n## Shorts'));
  assert.deepEqual(check(dir).out.problemas, []);
});

test('a section with no text is refused', () => {
  const dir = estudio();
  escrever(dir, TODAS.replace(SECOES.tiktok, '## TikTok\n'));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.match(out.problemas.join(' | '), /tiktok/);
});

test('the problems of several platforms are all reported together', () => {
  const dir = estudio();
  escrever(dir, `${texto('reels')}\n${SECOES.tiktok.replace('#marketingdeconteudo', '#fyp #marketingdeconteudo')}`
    .replace('#marketingdeconteudo #planejamento #empreendedorismo', tags(6)));

  const { out } = check(dir);
  assert.equal(out.pronto, false);
  assert.equal(out.problemas.length, 3, out.problemas.join(' | '));
});

test('an Estúdio without the file, an unknown Projeto or Vídeo is refused, changing nothing', () => {
  const dir = estudio();
  assert.deepEqual(check(dir).out, { checked: false, reason: 'no-texto', projeto: PROJETO, video: VIDEO });
  assert.equal(fs.existsSync(path.join(videoDir(dir), 'entrega')), false);

  assert.equal(run('texto-do-post', dir, 'Outro', VIDEO).out.reason, 'unknown-projeto');
  assert.equal(run('texto-do-post', dir, PROJETO, 'Outro').out.reason, 'unknown-video');
});

test('a Kit that cannot be read is refused rather than guessed', () => {
  const dir = estudio();
  escrever(dir, TODAS);
  fs.writeFileSync(projetoKit(dir), 'não é json');

  const { out } = check(dir);
  assert.equal(out.checked, false);
  assert.equal(out.reason, 'invalid-kit');
});

test('checking the text leaves it untouched', () => {
  const dir = estudio();
  escrever(dir, texto('reels'));
  const before = fs.readFileSync(textoFile(dir), 'utf8');
  check(dir);
  assert.equal(fs.readFileSync(textoFile(dir), 'utf8'), before);
});
