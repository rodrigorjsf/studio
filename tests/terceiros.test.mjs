// Third-party material in the estudio package (ticket #23): the frame sampler vendored from
// the MIT `watch` skill and the Remotion rules distilled in our own words. These tests read
// the package as files and assert on what an installed plugin would carry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'vendor.json'), 'utf8'));

const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('every verbatim-vendored file still matches the sha256 its manifest records', () => {
  const verbatim = manifest.sources.filter((source) => source.mode === 'vendored-subset').flatMap((source) => source.files ?? []);
  assert.ok(verbatim.length >= 3, 'the sampler, its runtime helper and the MIT LICENSE are vendored verbatim');
  for (const file of verbatim) {
    const local = path.join(pluginRoot, file.path);
    assert.ok(fs.existsSync(local), `vendor.json lists ${file.path}, which is missing`);
    assert.equal(sha256(local), file.sha256, `${file.path} drifted from upstream without a vendor.json update`);
  }
});

test('each upstream is pinned to a full commit SHA with its license', () => {
  for (const source of manifest.sources) {
    assert.match(source.sha, /^[0-9a-f]{40}$/, `${source.id}: pin a full commit SHA`);
    assert.ok(source.license, `${source.id}: name the license`);
  }
});

// ---- the mirrored speech model (ticket #31, ADR 0006) ----

const MODEL_FILES = ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.json', 'preprocessor_config.json'];

test('the speech-model source is a pinned mirror: upstream, commit, license and five checksummed Release files', () => {
  const model = manifest.sources.find((s) => s.id === 'speech-model');
  assert.ok(model, 'vendor.json has a speech-model source');
  assert.equal(model.mode, 'mirrored');
  assert.equal(model.owner, 'mobiuslabsgmbh');
  assert.equal(model.repo, 'faster-whisper-large-v3-turbo');
  assert.equal(model.sha, '0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf');
  assert.equal(model.license, 'MIT');
  assert.deepEqual(model.files.map((f) => f.name).sort(), [...MODEL_FILES].sort());
  for (const file of model.files) {
    assert.match(file.sha256, /^[0-9a-f]{64}$/, `${file.name}: sha256`);
    assert.match(file.url, /^https:\/\/github\.com\/rodrigorjsf\/studio\/releases\/download\/modelo-large-v3-turbo-0a363e9\/[^/]+$/, `${file.name}: Release URL`);
    assert.ok(file.url.endsWith(`/${file.name}`), `${file.name}: the URL names the file`);
  }
});

// instalar.sh and verificar.sh read this manifest with sed, not a JSON parser (the computer may
// have no Node yet), so its shape is a contract: the speech-model source is the last one, and
// each file object lists name, sha256 and url in that order.
test('the speech-model source keeps the shape the POSIX installer parses', () => {
  assert.equal(manifest.sources.at(-1).id, 'speech-model', 'speech-model is the last source');
  const text = fs.readFileSync(path.join(pluginRoot, 'vendor.json'), 'utf8');
  const fromModel = text.slice(text.indexOf('"id": "speech-model"'));
  const objects = fromModel.match(/\{[^{}]*"name"[^{}]*\}/g) ?? [];
  assert.equal(objects.length, 5);
  for (const file of manifest.sources.at(-1).files) assert.match(file.name, /^[\w.-]+$/, `${file.name}: no spaces (the installer splits fields on whitespace)`);
  for (const object of objects) assert.match(object, /"name": "[^"]+",\s*"sha256": "[0-9a-f]{64}",\s*"url": "[^"]+"/);
});

test('the third-party notice carries the model\'s MIT attribution', () => {
  const notice = fs.readFileSync(path.join(pluginRoot, 'THIRD_PARTY.md'), 'utf8');
  assert.match(notice, /mobiuslabsgmbh\/faster-whisper-large-v3-turbo/);
  assert.ok(notice.includes('0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf'), 'names the pinned commit');
  const section = notice.slice(notice.indexOf('## 4. Speech model'));
  assert.match(section, /Copyright \(c\) 2022 OpenAI/, 'carries the copyright line of the original model');
  assert.match(section, /Permission is hereby granted, free of charge/, 'carries the MIT license text');
});

// ---- independence: the Criadora installs only estudio ----

function textFiles(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && !/\.(jpe?g|png|gif|mp4|mov|webp)$/i.test(e.name))
    .map((e) => path.join(e.parentPath ?? e.path, e.name));
}

// What an installed plugin, the maintainer's project settings and the upstream installer must no
// longer carry: the third-party marketplace, the skill installers, and any instruction to invoke
// the external skills. THIRD_PARTY.md names the upstreams on purpose; vendor.json records the
// upstream file paths (skills/watch/…), which are attribution, not instructions.
const FORBIDDEN = [
  /watch@claude-video/,
  /bradautomates\/claude-video/,
  /skills add remotion-dev/,
  /remotion-best-practices/,
];
const INVOKES_WATCH = /`watch` skill|skill `watch`|watch skill|skill watch|\/watch\b|watch\.py/i;

test('no package file, project setting or installer step depends on the external skills', () => {
  const files = [
    ...textFiles(pluginRoot).filter((f) => path.basename(f) !== 'THIRD_PARTY.md'),
    path.join(repoRoot, '.claude', 'settings.json'),
    path.join(repoRoot, 'scripts', 'instalar.mjs'),
  ];
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const patterns = path.basename(file) === 'vendor.json' ? FORBIDDEN : [...FORBIDDEN, INVOKES_WATCH];
    for (const pattern of patterns) {
      if (pattern.test(text)) hits.push(`${path.relative(repoRoot, file)}: ${pattern}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('getting-started carries no manual watch install or Groq key setup', () => {
  const text = fs.readFileSync(path.join(pluginRoot, 'skills', 'estudio', 'references', 'getting-started.md'), 'utf8');
  assert.doesNotMatch(text, /Adicionar marketplace|GROQ_API_KEY|zshrc/);
});

test('the package exposes only its own skills: no upstream SKILL.md anywhere under skills/', () => {
  const skillsDir = path.join(pluginRoot, 'skills');
  const skillFiles = fs.readdirSync(skillsDir, { recursive: true }).map(String).filter((f) => path.basename(f) === 'SKILL.md');
  assert.ok(skillFiles.length > 0);
  for (const rel of skillFiles) {
    const parts = rel.split(path.sep);
    assert.equal(parts.length, 2, `skills/${rel}: a SKILL.md below skills/<name>/ would register as an extra skill`);
    const name = /^name:\s*(.+)$/m.exec(fs.readFileSync(path.join(skillsDir, rel), 'utf8'))?.[1].trim();
    assert.equal(name, parts[0], `skills/${rel}: its name must be its folder`);
    assert.ok(!['watch', 'remotion-best-practices', 'remotion'].includes(name), `skills/${rel}: an upstream skill`);
  }
});

// ---- the distilled Remotion references ----

const remotionSource = manifest.sources.find((s) => s.id === 'remotion-skill');
const remotionDir = path.join(pluginRoot, remotionSource.distilledInto);
// The topics a talking-head Nível 1/2 edit uses, each with the upstream rule(s) it distills.
const TOPICS = {
  'timing.md': ['timing.md', 'animations.md'],
  'sequencing.md': ['sequencing.md', 'trimming.md'],
  'compositions.md': ['compositions.md', 'calculate-metadata.md'],
  'videos.md': ['videos.md'],
  'images.md': ['images.md'],
  'fonts.md': ['fonts.md'],
  'measuring-text.md': ['measuring-text.md'],
  'text-animations.md': ['text-animations.md'],
  'transitions.md': ['transitions.md'],
  'captions.md': ['display-captions.md', 'import-srt-captions.md'],
  'audio.md': ['audio.md'],
  'transparent-videos.md': ['transparent-videos.md'],
  'video-metadata.md': ['extract-frames.md', 'get-video-duration.md', 'get-video-dimensions.md'],
};

test('the distilled Remotion references cover every listed topic and cite the pinned upstream', () => {
  for (const [file, rules] of Object.entries(TOPICS)) {
    const local = path.join(remotionDir, file);
    assert.ok(fs.existsSync(local), `references/remotion/${file} is missing`);
    const text = fs.readFileSync(local, 'utf8');
    assert.ok(text.includes(remotionSource.sha), `${file}: cite the pinned SHA`);
    assert.ok(text.includes(remotionSource.tag), `${file}: cite the tag`);
    for (const rule of rules) assert.ok(text.includes(`${remotionSource.upstreamPath}/${rule}`), `${file}: cite ${rule}`);
    assert.match(text, /https:\/\/www\.remotion\.dev\/docs\//, `${file}: link the matching remotion.dev docs`);
  }
});

// Needs a checkout of the pinned rules: REMOTION_RULES_DIR=<remotion @ tag>/packages/skills/skills/remotion/rules
const upstreamDir = process.env.REMOTION_RULES_DIR;
const needsRules = upstreamDir && fs.existsSync(upstreamDir) ? {} : { skip: 'REMOTION_RULES_DIR not set to the pinned upstream rules' };

test('no distilled reference is a wholesale copy of an upstream rule', needsRules, () => {
  // Distilled means rewritten: no run of 25+ identical words from any upstream rule.
  const words = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
  const shingles = new Set();
  for (const rule of fs.readdirSync(upstreamDir).filter((f) => f.endsWith('.md'))) {
    const w = words(fs.readFileSync(path.join(upstreamDir, rule), 'utf8'));
    for (let i = 0; i + 25 <= w.length; i += 1) shingles.add(w.slice(i, i + 25).join(' '));
  }
  for (const file of Object.keys(TOPICS)) {
    const w = words(fs.readFileSync(path.join(remotionDir, file), 'utf8'));
    for (let i = 0; i + 25 <= w.length; i += 1) {
      assert.ok(!shingles.has(w.slice(i, i + 25).join(' ')), `${file} copies upstream text: "${w.slice(i, i + 25).join(' ')}"`);
    }
  }
});
