// Seam 3 — plugin structure. Drives scripts/check-plugin.mjs as a CLI and asserts
// only on its exit code and JSON verdict.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checker = path.join(repoRoot, 'scripts', 'check-plugin.mjs');

function check(root) {
  const r = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' });
  return { code: r.status, verdict: JSON.parse(r.stdout) };
}

test('the repo marketplace and the estudio package pass the structure check', () => {
  const { code, verdict } = check(repoRoot);
  assert.deepEqual(verdict.errors, []);
  assert.equal(verdict.ok, true);
  assert.equal(code, 0);
  assert.deepEqual(verdict.plugins, ['estudio']);
});

// ---- fixture marketplaces: a minimal valid package, then one defect per test ----
import fs from 'node:fs';
import os from 'node:os';

const fixtureRoots = [];
after(() => fixtureRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function fixture(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-structure-'));
  fixtureRoots.push(root);
  const base = {
    '.claude-plugin/marketplace.json': JSON.stringify({
      name: 'fixture', owner: { name: 'Fixture' },
      plugins: [{ name: 'estudio', source: './plugin/estudio' }],
    }),
    'plugin/estudio/.claude-plugin/plugin.json': JSON.stringify({ name: 'estudio', version: '0.1.0' }),
    'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\ndescription: Entry.\nmodel: claude-opus-5-5\neffort: medium\n---\nBody\n',
    // Required by the check: the Social media persona and the bundled platform reference.
    'plugin/estudio/agents/social-media.md':
      '---\nname: social-media\nmodel: claude-sonnet-5-5\neffort: medium\ntools: Bash, Read, Write\ncolor: cyan\ndescription: A persona.\n---\nBody\n',
    'plugin/estudio/skills/estudio/references/platform-rules.md':
      '# Platform rules\n\n## YouTube\n\n- [official] YouTube ignores every hashtag past 60. sourced: 2026-09-30 <https://support.google.com/youtube/answer/6390658>\n',
  };
  for (const [rel, content] of Object.entries({ ...base, ...files })) {
    if (content === null) continue;
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const persona = (fields) =>
  `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\ndescription: A persona.\n---\nBody\n`;

function assertRejected(root, fragment) {
  const { code, verdict } = check(root);
  assert.equal(verdict.ok, false);
  assert.equal(code, 1);
  assert.ok(
    verdict.errors.some((e) => e.includes(fragment)),
    `expected an error mentioning "${fragment}", got ${JSON.stringify(verdict.errors)}`,
  );
}

test('a minimal valid fixture package passes', () => {
  const { code, verdict } = check(fixture({
    'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'claude-opus-5-5', effort: 'medium', tools: 'Bash, Read, Write', color: 'blue' }),
  }));
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
});

// The spec's slash commands are /estudio:estudio, novo-projeto, projetos, editar-projeto,
// novo-video and perfil. Any other skill is an Esteira step the Diretor routes to: it stays off
// her menu (`user-invocable: false`).
const skill = (name, extra = '') => `---\nname: ${name}\ndescription: A step.\nmodel: claude-opus-5-5\neffort: medium\n${extra}---\nBody\n`;

test('a skill outside the spec slash commands that shows up in her menu is rejected', () => {
  assertRejected(fixture({ 'plugin/estudio/skills/plano/SKILL.md': skill('plano') }), 'skills/plano/SKILL.md: not a slash command of the spec');
});

test('a skill outside the spec slash commands hidden from her menu passes', () => {
  const { code, verdict } = check(fixture({ 'plugin/estudio/skills/plano/SKILL.md': skill('plano', 'user-invocable: false\n') }));
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
});

// The Diretor and the Entrevistador run in the main session through the skills; the spec pins
// them to Opus 5.5 `medium`, so every skill declares its model and effort like a persona does.
test('a skill without a pinned model and effort is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\ndescription: Entry.\n---\nBody\n' }),
    'skills/estudio/SKILL.md: missing "model"',
  );
  assertRejected(
    fixture({ 'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\ndescription: Entry.\nmodel: claude-opus-5-5\n---\nBody\n' }),
    'skills/estudio/SKILL.md: missing "effort"',
  );
});

test('a skill on a model alias instead of a pinned model ID is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\ndescription: Entry.\nmodel: opus\neffort: medium\n---\nBody\n' }),
    'skills/estudio/SKILL.md: "model" must be a full model ID',
  );
});

// The Social media (ticket #44) follows the rules every persona follows: a pinned model and effort,
// a tools allowlist and a display color.
test('the Social media persona, pinned to Sonnet 5.5 at medium effort with a color, passes', () => {
  const { code, verdict } = check(fixture({
    'plugin/estudio/agents/social-media.md': persona({ name: 'social-media', model: 'claude-sonnet-5-5', effort: 'medium', tools: 'Bash, Read, Write', color: 'cyan' }),
  }));
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
});

test('a package without the Social media persona is rejected', () => {
  assertRejected(fixture({ 'plugin/estudio/agents/social-media.md': null }), 'agents/social-media.md is missing');
});

test('a package without the bundled platform reference is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/skills/estudio/references/platform-rules.md': null }),
    'skills/estudio/references/platform-rules.md is missing',
  );
});

test('the Social media persona without a pinned model, effort or color is rejected', () => {
  const pinned = { name: 'social-media', model: 'claude-sonnet-5-5', effort: 'medium', tools: 'Bash, Read, Write', color: 'cyan' };
  for (const [missing, fragment] of [['model', 'missing "model"'], ['effort', 'missing "effort"'], ['color', 'missing "color"']]) {
    const { [missing]: _removed, ...fields } = pinned;
    assertRejected(fixture({ 'plugin/estudio/agents/social-media.md': persona(fields) }), `social-media.md: ${fragment}`);
  }
});

// Every persona declares its display color in the task list and transcript (ticket #18); the
// eight values are the only ones Claude Code accepts.
test('a persona without a color is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'claude-opus-5-5', effort: 'medium', tools: 'Bash, Read' }) }),
    'motion-designer.md: missing "color"',
  );
});

test('a persona with a color outside the eight allowed values is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'claude-opus-5-5', effort: 'medium', tools: 'Bash, Read', color: 'magenta' }) }),
    'motion-designer.md: "color" must be one of red, blue, green, yellow, purple, orange, pink, cyan, got "magenta"',
  );
});

test('a persona without effort is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'claude-opus-5-5' }) }),
    'motion-designer.md: missing "effort"',
  );
});

test('a persona on a model alias instead of a pinned model ID is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'opus', effort: 'medium' }) }),
    'motion-designer.md: "model" must be a full model ID',
  );
});

test('a Crítico holding an editing tool is rejected', () => {
  assertRejected(
    fixture({
      'plugin/estudio/agents/guardiao-da-marca.md':
        persona({ name: 'guardiao-da-marca', model: 'claude-sonnet-5-5', effort: 'xhigh', tools: 'Read, Grep, Edit' }),
    }),
    'guardiao-da-marca.md: Crítico must not have editing tool "Edit"',
  );
});

test('a Crítico without an explicit tools allowlist (inherits every tool) is rejected', () => {
  assertRejected(
    fixture({
      'plugin/estudio/agents/qc-tecnico.md': persona({ name: 'qc-tecnico', model: 'claude-sonnet-5-5', effort: 'high' }),
    }),
    'qc-tecnico.md: Crítico must declare a "tools" allowlist',
  );
});

test('a Crítico with read-only tools plus Bash passes', () => {
  const { verdict } = check(fixture({
    'plugin/estudio/agents/qc-tecnico.md':
      persona({ name: 'qc-tecnico', model: 'claude-sonnet-5-5', effort: 'high', tools: 'Read, Grep, Glob, Bash', color: 'red' }),
  }));
  assert.deepEqual(verdict.errors, []);
});

for (const [label, rel] of [
  ['the project wiki', 'plugin/estudio/wiki/index.md'],
  ['raw research', 'plugin/estudio/raw/notes.md'],
  ['a test file', 'plugin/estudio/skills/estudio/estado.test.mjs'],
  ['node_modules', 'plugin/estudio/node_modules/x/index.js'],
  ['a top-level bin/', 'plugin/estudio/bin/estudio'],
]) {
  test(`a package carrying ${label} is rejected`, () => {
    assertRejected(fixture({ [rel]: 'x' }), 'development material');
  });
}

test('a package over the 5,000-file limit is rejected', () => {
  const root = fixture();
  const dir = path.join(root, 'plugin/estudio/skills/estudio/references/many');
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 5000; i += 1) fs.writeFileSync(path.join(dir, `${i}.md`), '');
  assertRejected(root, 'files (limit 5000)');
});

test('a package over the 200 MB limit is rejected', () => {
  const root = fixture();
  // A sparse file: reports 201 MB without writing it.
  const big = path.join(root, 'plugin/estudio/big.mp4');
  fs.writeFileSync(big, '');
  fs.truncateSync(big, 201 * 1024 * 1024);
  assertRejected(root, 'bytes (limit 209715200)');
});

test('a link that leaves the package is rejected (plugin artifacts are self-contained)', () => {
  assertRejected(
    fixture({ 'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\n---\nSee [ADR](../../../../docs/adr/0005.md).\n' }),
    'link leaves the package',
  );
});

test('a link to a missing reference file is rejected', () => {
  assertRejected(
    fixture({ 'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\n---\nSee [guide](references/missing.md).\n' }),
    'broken link "references/missing.md"',
  );
});

test('a link to a missing heading anchor is rejected, an existing one passes', () => {
  const files = {
    'plugin/estudio/skills/estudio/references/guide.md': '# Guide\n\n## 4. Program the scenes\n',
    'plugin/estudio/skills/estudio/SKILL.md':
      '---\nname: estudio\n---\n[ok](references/guide.md#4-program-the-scenes) [bad](references/guide.md#5-render)\n',
  };
  const { verdict } = check(fixture(files));
  assert.deepEqual(verdict.errors.filter((e) => e.includes('link')).length, 1);
  assertRejected(fixture(files), 'broken link "references/guide.md#5-render"');
});

// Higgsfield is reached only through her own connector, logged in with her account (ticket #15):
// no key to set or store, so nothing in the package may name the API-key path's variables or script.
for (const [label, text] of [
  ['the API key variable', 'Check that `HF_KEY` is set.'],
  ['the API key pair', 'Export HF_API_KEY and HF_API_SECRET first.'],
  ['the API-key script', 'Run `python tools/hf_api.py generate`.'],
]) {
  test(`a package whose instructions use ${label} of the Higgsfield Cloud API is rejected`, () => {
    assertRejected(
      fixture({ 'plugin/estudio/skills/estudio/SKILL.md': `---\nname: estudio\ndescription: Entry.\n---\n${text}\n` }),
      'Higgsfield API-key path',
    );
  });
}

// The package describes the plugin, not the upstream repo it was forked from (ticket #18): no
// upstream output folder, install ritual, guide folder or script folder, and no marker left by an
// unfinished ticket.
for (const [label, text] of [
  ['the upstream output folder', 'Pick up the video in `edicoes/001. meu-video/`.'],
  ['the upstream install ritual', 'Run `npm run instalar` inside the folder.'],
  ['the upstream guide folder', 'See guias/1-primeiros-passos.md.'],
  ['the upstream tools folder', 'Run `python tools/transcrever.py`.'],
  ['a pending-ticket marker', '*Pending: the installer (ticket #4) replaces this step.*'],
]) {
  test(`a package that names ${label} is rejected`, () => {
    assertRejected(
      fixture({ 'plugin/estudio/skills/estudio/SKILL.md': `---\nname: estudio\ndescription: Entry.\n---\n${text}\n` }),
      'upstream leftover',
    );
  });
}

// The repo root is a maintainer guide, not the upstream studio (spec #29, ticket #30): the root
// CLAUDE.md no longer loads the director persona, and the upstream folders and installer the
// persona drove are gone. The plugin under plugin/estudio/ holds the only copy of each file.
const UPSTREAM_ROOT_PATHS = ['guias', 'estilos', 'src', 'tools', 'scripts/instalar.mjs'];
const UPSTREAM_ROOT_NPM_SCRIPTS = ['instalar', 'studio', 'compositions'];

// What is wrong with a root CLAUDE.md, as a list of reasons (empty = it is a maintainer guide).
function rootClaudeMdProblems(text) {
  const problems = [];
  const firstLine = text.split('\n', 1)[0];
  if (/^#\s.*diretor de v[ií]deo/i.test(firstLine)) problems.push(`opens with the director persona heading ("${firstLine}")`);
  for (const mention of ['npm run instalar', 'hf_api', 'HF_KEY', 'edicoes']) {
    if (text.includes(mention)) problems.push(`mentions "${mention}"`);
  }
  return problems;
}

test('the root CLAUDE.md is a maintainer guide, not the upstream director persona', () => {
  const text = fs.readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8');
  assert.deepEqual(rootClaudeMdProblems(text), []);
  for (const section of ['## Agent skills', '## LLM wiki', '## Applied Learning']) {
    assert.ok(text.includes(section), `the root CLAUDE.md keeps its "${section}" section`);
  }
});

for (const [label, text] of [
  ['the director persona heading', '# Studio: você é o diretor de vídeo\n\nBody\n'],
  ['the upstream install ritual', '# Maintainer guide\n\nRun `npm run instalar`.\n'],
  ['the Higgsfield API-key script', '# Maintainer guide\n\nSee tools/hf_api.py.\n'],
  ['the Higgsfield API-key variable', '# Maintainer guide\n\nSet HF_KEY first.\n'],
  ['the upstream output folder', '# Maintainer guide\n\nDeliverables go to edicoes/.\n'],
]) {
  test(`a root CLAUDE.md that carries ${label} is flagged`, () => {
    assert.notDeepEqual(rootClaudeMdProblems(text), []);
  });
}

test('no upstream folder or installer script is tracked at the repo root', () => {
  const tracked = spawnSync('git', ['ls-files', '--', ...UPSTREAM_ROOT_PATHS], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(tracked.status, 0, tracked.stderr);
  assert.equal(tracked.stdout.trim(), '');
});

test('the root package.json drops the upstream scripts and the root tsconfig no longer includes root src/', () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts;
  for (const name of UPSTREAM_ROOT_NPM_SCRIPTS) assert.equal(scripts[name], undefined, `npm script "${name}" is gone`);
  assert.ok(scripts.typecheck && scripts.test, 'typecheck and test stay');
  const include = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf8')).include;
  assert.deepEqual(include.filter((pattern) => pattern.startsWith('src/') || pattern === 'remotion.config.ts'), []);
});

// The bundled platform reference (spec #39, ticket #42, ADR 0008): every rule in it carries its
// source label (official, study or marketing), a `sourced:` date and a platform URL, so the
// maintainer can refresh it quarterly and see what is official and what is marketing.
const REFERENCE = 'plugin/estudio/skills/estudio/references/platform-rules.md';
const rule = (label = '[official]', sourced = 'sourced: 2026-09-30', url = '<https://support.google.com/youtube/answer/6390658>') =>
  `- ${[label, 'YouTube ignores every hashtag past 60.', sourced, url].filter(Boolean).join(' ')}\n`;
const reference = (...rules) => `# Platform rules\n\nEach rule is a bullet.\n\n## YouTube\n\n${rules.join('')}`;

test('a platform reference whose every rule has its label, date and URL passes', () => {
  const { code, verdict } = check(fixture({
    [REFERENCE]: reference(rule(), rule('[study]'), rule('[marketing]')),
  }));
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
});

for (const [label, bad, fragment] of [
  ['its source label', rule(''), 'lacks its source label'],
  ['a known source label', rule('[rumour]'), 'lacks its source label'],
  ['its sourced: date', rule('[official]', ''), 'lacks its sourced: date'],
  ['a real sourced: date', rule('[official]', 'sourced: 2026-13-45'), 'lacks its sourced: date'],
  ['its URL', rule('[official]', 'sourced: 2026-09-30', ''), 'lacks its URL'],
  ['an https URL', rule('[official]', 'sourced: 2026-09-30', 'support.google.com/youtube'), 'lacks its URL'],
]) {
  test(`a platform rule without ${label} is rejected`, () => {
    assertRejected(fixture({ [REFERENCE]: reference(rule(), bad) }), fragment);
  });
}

test('a platform reference with no rule at all is rejected', () => {
  assertRejected(fixture({ [REFERENCE]: '# Platform rules\n\nNothing here.\n' }), 'has no rule');
});

test('a bullet inside a code fence is not a rule', () => {
  const { verdict } = check(fixture({ [REFERENCE]: `${reference(rule())}\n\`\`\`\n- an example bullet with nothing\n\`\`\`\n` }));
  assert.deepEqual(verdict.errors, []);
});

test('a platform reference that links out of the package is still rejected', () => {
  assertRejected(
    fixture({ [REFERENCE]: `${reference(rule())}\nSee [the research](../../../../../raw/research/findings.md).\n` }),
    'link leaves the package',
  );
});

test('the shipped platform reference keeps the source labels the research gave its claims', () => {
  const text = fs.readFileSync(path.join(repoRoot, REFERENCE), 'utf8').replace(/\r\n/g, '\n');
  const labelOf = (pattern) => {
    const lines = text.split('\n').filter((line) => line.startsWith('- ') && pattern.test(line));
    assert.equal(lines.length, 1, `exactly one rule matches ${pattern}`);
    return /\[(official|study|marketing)\]/.exec(lines[0])?.[1];
  };
  assert.equal(labelOf(/Instagram allows at most 5 hashtags/), 'official');
  assert.equal(labelOf(/more than 60 hashtags/), 'official');
  assert.equal(labelOf(/Never ask for likes/), 'official');
  assert.equal(labelOf(/24\.36 million/), 'study');
  assert.equal(labelOf(/3 to 6 relevant hashtags on TikTok/), 'marketing');
  assert.equal(labelOf(/visible before the cutoff/i), 'marketing');
  assert.equal(labelOf(/2 to 3 relevant hashtags and one sentence/), 'official');
});

// ---- the Claude Code CLI itself (skipped, with the reason, where `claude` is absent) ----
const hasClaude = spawnSync('claude', ['--version'], { encoding: 'utf8' }).status === 0;
// Notion is read-only and reached only through her own connector (ticket #20): the package
// names no Notion tool but the page reader, declares no Notion server, and no persona holds a
// Notion tool (subagents read only the Resumo Notion).
for (const [label, tool] of [
  ['writes a page', 'notion-update-page'],
  ['creates pages', 'notion-create-pages'],
  ['moves pages', 'notion-move-pages'],
  ['comments', 'notion-create-comment'],
  ['searches her workspace', 'notion-search'],
]) {
  test(`a package whose instructions use a Notion tool that ${label} is rejected`, () => {
    assertRejected(
      fixture({ 'plugin/estudio/skills/estudio/SKILL.md': `---\nname: estudio\ndescription: Entry.\n---\nCall \`${tool}\` now.\n` }),
      `Notion tool "${tool}"`,
    );
  });
}

test('a package that reads a linked page with notion-fetch passes', () => {
  const { code, verdict } = check(fixture({
    'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\ndescription: Entry.\nmodel: claude-opus-5-5\neffort: medium\n---\nRead the linked page with `notion-fetch`; run `vincular-notion`.\n',
  }));
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
});

test('a persona holding a Notion tool is rejected: subagents read only the Resumo Notion', () => {
  assertRejected(
    fixture({
      'plugin/estudio/agents/roteirista-estrategista.md': persona({
        name: 'roteirista-estrategista', model: 'claude-opus-5-5', effort: 'medium', tools: 'Read, mcp__claude_ai_Notion__notion-fetch',
      }),
    }),
    'roteirista-estrategista.md: persona must not hold Notion tool',
  );
});

test('a persona without a tools allowlist is rejected: it would inherit her Notion connector', () => {
  assertRejected(
    fixture({ 'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'claude-opus-5-5', effort: 'medium' }) }),
    'motion-designer.md: persona must declare a "tools" allowlist',
  );
});

test('a package that declares its own Notion server is rejected: Notion is her connector', () => {
  assertRejected(fixture({ 'plugin/estudio/.mcp.json': JSON.stringify({ mcpServers: { notion: { type: 'http', url: 'https://mcp.notion.com/mcp' } } }) }), 'Notion server');
  assertRejected(fixture({
    'plugin/estudio/.claude-plugin/plugin.json': JSON.stringify({ name: 'estudio', version: '0.1.0', mcpServers: { docs: { command: 'npx', args: ['@notionhq/notion-mcp-server'] } } }),
  }), 'Notion server');
});

const needsClaude = hasClaude ? {} : { skip: 'claude CLI not on PATH' };

function claude(args, env = process.env) {
  const r = spawnSync('claude', args, { encoding: 'utf8', env });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test('claude plugin validate --strict accepts the marketplace and the package', needsClaude, () => {
  for (const target of [repoRoot, path.join(repoRoot, 'plugin', 'estudio')]) {
    const { code, out } = claude(['plugin', 'validate', '--strict', '--json', target]);
    assert.equal(code, 0, out);
    assert.equal(JSON.parse(out).success, true, out);
  }
});

test('estudio installs from the local marketplace via the CLI, with its skills and references', needsClaude, () => {
  // An isolated config dir: the maintainer's own ~/.claude is never touched.
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-install-'));
  fixtureRoots.push(configDir);
  const env = { ...process.env, CLAUDE_CONFIG_DIR: configDir };

  const added = claude(['plugin', 'marketplace', 'add', repoRoot], env);
  assert.equal(added.code, 0, added.out);
  const installed = claude(['plugin', 'install', 'estudio@studio'], env);
  assert.equal(installed.code, 0, installed.out);

  const details = claude(['plugin', 'details', 'estudio@studio'], env);
  // The entry skill, the Perfil interview (/estudio:perfil), the Projeto interview (/estudio:novo-projeto),
  // the Projeto list (/estudio:projetos), the Projeto edit (/estudio:editar-projeto), the new Vídeo
  // (/estudio:novo-video), its Plano (plano) and its edit (edicao), plus the Assistente
  // de edição, the Roteirista-estrategista, the Diretor de arte, the Editor de pré-corte, the Motion
  // designer, the Finalizador, the Artista generativo and the Montador Higgsedit personas, and the three
  // Críticos: QC técnico, Guardião da marca and Revisor de plataforma.
  const skills = /Skills \(\d+\)([\s\S]*?)\n\s*Agents \(/.exec(details.out)?.[1] ?? '';
  for (const skill of ['estudio', 'perfil', 'novo-projeto', 'projetos', 'editar-projeto', 'novo-video', 'plano', 'edicao']) assert.match(skills, new RegExp(`\\b${skill}\\b`), details.out);
  for (const agent of ['assistente-de-edicao', 'roteirista-estrategista', 'diretor-de-arte', 'editor-de-pre-corte', 'motion-designer', 'finalizador', 'qc-tecnico', 'guardiao-da-marca', 'revisor-de-plataforma', 'artista-generativo', 'montador-higgsedit', 'social-media']) {
    assert.match(details.out, new RegExp(`Agents \\(\\d+\\)[\\s\\S]*${agent}`), details.out);
  }

  const [plugin] = JSON.parse(claude(['plugin', 'list', '--json'], env).out);
  assert.equal(plugin.id, 'estudio@studio');
  for (const reference of ['getting-started', 'level-1-remotion', 'remotion-manual', 'level-2-higgsfield', 'editorial-direction', 'style-gallery']) {
    assert.ok(
      fs.existsSync(path.join(plugin.installPath, 'skills', 'estudio', 'references', `${reference}.md`)),
      `installed package lacks references/${reference}.md`,
    );
  }
});

test('uninstalling estudio deletes its plugin data folder, where the installer puts every runtime', needsClaude, () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-uninstall-'));
  fixtureRoots.push(configDir);
  const env = { ...process.env, CLAUDE_CONFIG_DIR: configDir };
  assert.equal(claude(['plugin', 'marketplace', 'add', repoRoot], env).code, 0);
  assert.equal(claude(['plugin', 'install', 'estudio@studio'], env).code, 0);

  // ${CLAUDE_PLUGIN_DATA} for estudio@studio, holding what instalar.sh / instalar.ps1 download.
  const data = path.join(configDir, 'plugins', 'data', 'estudio-studio');
  fs.mkdirSync(path.join(data, 'runtime', 'node', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(data, 'runtime', 'node', 'bin', 'node'), 'stand-in');

  const removed = claude(['plugin', 'uninstall', 'estudio@studio'], env);
  assert.equal(removed.code, 0, removed.out);
  assert.equal(fs.existsSync(data), false, 'the downloaded runtimes must go with the plugin');
});

// ---- the speech model's file list (spec #29) ----
// The model's files are named in three places: the manifest (what the Preparação downloads and the
// computer check verifies), the mirror script (what it publishes) and the transcriber (what it
// needs to call the model prepared). A file the transcriber needs but the manifest lacks would make
// the check report the model ready while every transcription stops with exit 3.
test('the mirror script, the manifest and the transcriber agree on the speech model files', () => {
  const vendor = JSON.parse(fs.readFileSync(path.join(repoRoot, 'plugin', 'estudio', 'vendor.json'), 'utf8'));
  const manifest = vendor.sources.find((s) => s.id === 'speech-model').files.map((f) => f.name).sort();
  const mirror = fs.readFileSync(path.join(repoRoot, 'scripts', 'espelhar-modelo.sh'), 'utf8').match(/^FILES="([^"]+)"/m)[1].split(/\s+/).sort();
  assert.deepEqual(mirror, manifest, 'the mirror script publishes exactly the files the manifest downloads');
  const transcriber = fs.readFileSync(path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'transcrever.py'), 'utf8');
  const required = [...transcriber.match(/^REQUIRED_MODEL_FILES = \(([^)]*)\)/m)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const vocabulary = [...transcriber.match(/^VOCABULARY_FILES = \(([^)]*)\)/m)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(required.length > 0 && vocabulary.length > 0, 'the transcriber lists the files it needs');
  for (const name of required) assert.ok(manifest.includes(name), `the transcriber needs ${name}, which the manifest never downloads`);
  assert.ok(vocabulary.some((name) => manifest.includes(name)), 'the manifest downloads no vocabulary file the transcriber accepts');
});

// ---- the Preparação's host list (spec #29, ticket #33) ----
// plugin/estudio/hosts.json is the one list of every host the Preparação reaches, given to the
// Criadora only when a download is blocked by her cloud workspace's domain allowlist. The
// structure check keeps it true: every literal host in the installers and in a vendor.json file
// URL is in the list, and no Hugging Face host is (the speech model comes from our GitHub Release).
const hostList = JSON.parse(fs.readFileSync(path.join(repoRoot, 'plugin', 'estudio', 'hosts.json'), 'utf8'));

test('the host list holds every host the Preparação reaches, each backed by a measurement', () => {
  const listed = hostList.hosts.map((h) => h.host);
  for (const host of ['github.com', 'nodejs.org', 'ffmpeg.martin-riedl.de', 'pypi.org', 'files.pythonhosted.org', 'registry.npmjs.org']) {
    assert.ok(listed.includes(host), `the list lacks ${host}`);
  }
  // GitHub Release downloads redirect to another host; the Criadora needs it as well as github.com.
  assert.ok(listed.some((host) => host.endsWith('githubusercontent.com')), 'the list lacks the host GitHub Release downloads redirect to');
  assert.equal(new Set(listed).size, listed.length, 'a host is listed twice');
  assert.match(hostList.measured?.date ?? '', /^\d{4}-\d{2}-\d{2}$/, 'the list says when it was measured');
  for (const entry of hostList.hosts) {
    assert.ok(entry.usedFor?.trim(), `${entry.host} says what it is for`);
    assert.equal(entry.evidence, 'verified', `${entry.host} is backed by a captured run`);
    assert.ok(entry.observedIn?.trim(), `${entry.host} says where it was observed`);
  }
});

const hostsFixture = ({ hosts, installer, vendorFiles } = {}) => fixture({
  'plugin/estudio/hosts.json': hosts === null ? null : JSON.stringify({ hosts: (hosts ?? ['github.com']).map((host) => ({ host })) }),
  'plugin/estudio/scripts/instalar.sh': installer ?? 'baixa "https://github.com/astral-sh/uv/releases/download/v1/uv.tar.gz" "$TMP/uv"\n',
  'plugin/estudio/vendor.json': JSON.stringify({ sources: [{ id: 'speech-model', files: vendorFiles ?? [{ name: 'model.bin', url: 'https://github.com/o/r/releases/download/t/model.bin' }] }] }),
});

test('a package whose installers and manifest use only listed hosts passes', () => {
  const { code, verdict } = check(hostsFixture());
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
});

test('an installer URL whose host the list lacks is rejected', () => {
  assertRejected(hostsFixture({ installer: 'baixa "https://downloads.example.org/tool.tar.gz" "$TMP/tool"\n' }), 'scripts/instalar.sh reaches downloads.example.org, which hosts.json lacks');
});

test('a manifest URL whose host the list lacks is rejected', () => {
  assertRejected(hostsFixture({ vendorFiles: [{ name: 'model.bin', url: 'https://mirror.example.org/model.bin' }] }), 'vendor.json speech-model/model.bin uses mirror.example.org, which hosts.json lacks');
});

test('installers without a host list are rejected', () => {
  assertRejected(hostsFixture({ hosts: null }), 'hosts.json (the host list) is missing');
});

for (const host of ['huggingface.co', 'cdn-lfs.huggingface.co', 'cas-bridge.xethub.hf.co', '*.hf.co']) {
  test(`a host list holding the Hugging Face host ${host} is rejected`, () => {
    assertRejected(hostsFixture({ hosts: ['github.com', host] }), `hosts.json lists the Hugging Face host ${host}`);
  });
}
