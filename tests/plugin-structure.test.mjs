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
    'plugin/estudio/skills/estudio/SKILL.md': '---\nname: estudio\ndescription: Entry.\n---\nBody\n',
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
    'plugin/estudio/agents/motion-designer.md': persona({ name: 'motion-designer', model: 'claude-opus-5-5', effort: 'medium' }),
  }));
  assert.deepEqual(verdict.errors, []);
  assert.equal(code, 0);
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
      persona({ name: 'qc-tecnico', model: 'claude-sonnet-5-5', effort: 'high', tools: 'Read, Grep, Glob, Bash' }),
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

// ---- the Claude Code CLI itself (skipped, with the reason, where `claude` is absent) ----
const hasClaude = spawnSync('claude', ['--version'], { encoding: 'utf8' }).status === 0;
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
  // the Projeto list (/estudio:projetos) and the Projeto edit (/estudio:editar-projeto).
  const skills = /Skills \(\d+\)([\s\S]*?)\n\s*Agents \(/.exec(details.out)?.[1] ?? '';
  for (const skill of ['estudio', 'perfil', 'novo-projeto', 'projetos', 'editar-projeto']) assert.match(skills, new RegExp(`\\b${skill}\\b`), details.out);

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
