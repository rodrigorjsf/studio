// The maintainer's mirror script (ticket #31): scripts/espelhar-modelo.sh downloads the five
// pinned speech-model files, hashes them, creates or refreshes the GitHub Release and prints the
// manifest entries. Driven as a process. The upstream is a local folder served through file://
// (MIRROR_UPSTREAM_BASE) and `gh` is a stand-in on PATH that records its calls, so nothing here
// touches the network or publishes anything.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repoRoot, 'scripts', 'espelhar-modelo.sh');
const TAG = 'modelo-large-v3-turbo-0a363e9';
const FILES = ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.json', 'preprocessor_config.json'];

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

// A sandbox with a fake upstream (five small files), a fake `gh` and its state.
//   releaseExists: the Release is already published; existingAssets: "name size" lines it holds.
function sandbox({ releaseExists = false, existingAssets = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'espelho '));
  tempRoots.push(root);
  const upstream = path.join(root, 'upstream');
  fs.mkdirSync(upstream);
  const content = {};
  for (const name of FILES) {
    content[name] = `fixture bytes of ${name}\n`;
    fs.writeFileSync(path.join(upstream, name), content[name]);
  }
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const calls = path.join(root, 'gh-calls.log');
  const assets = path.join(root, 'assets.txt');
  fs.writeFileSync(assets, existingAssets.map((l) => `${l}\n`).join(''));
  fs.writeFileSync(path.join(root, 'release-exists'), releaseExists ? 'yes' : 'no');
  fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh
echo "$*" >> "${calls}"
case "$1 $2" in
  "release view")
    if [ "$(cat "${root}/release-exists")" = yes ]; then
      case "$*" in *--jq*) cat "${assets}" ;; esac
      exit 0
    fi
    echo "release not found" >&2; exit 1 ;;
  "release create") echo yes > "${root}/release-exists"; exit 0 ;;
  "release upload") exit 0 ;;
esac
echo "unexpected gh call: $*" >&2; exit 9
`, { mode: 0o755 });
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: root,
    MIRROR_UPSTREAM_BASE: pathToFileURL(upstream).href,
    MIRROR_REPO: 'example/studio',
  };
  const ghCalls = () => (fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean) : []);
  return { root, env, content, ghCalls };
}

const run = (env, args = []) => spawnSync('/bin/sh', [script, ...args], { encoding: 'utf8', env, timeout: 60_000 });
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

test('--dry-run prints each file with its sha256 and Release URL and never calls gh', () => {
  const sb = sandbox();
  const r = run(sb.env, ['--dry-run']);
  assert.equal(r.status, 0, r.stderr);
  const entries = JSON.parse(r.stdout);
  assert.deepEqual(entries.map((e) => e.name), FILES);
  for (const e of entries) {
    assert.equal(e.sha256, sha256(sb.content[e.name]), `${e.name}: sha256`);
    assert.equal(e.url, `https://github.com/example/studio/releases/download/${TAG}/${e.name}`);
  }
  assert.deepEqual(sb.ghCalls(), []);
});

test('a first run creates the Release and uploads the five files as separate assets', () => {
  const sb = sandbox();
  const r = run(sb.env);
  assert.equal(r.status, 0, r.stderr);
  const calls = sb.ghCalls();
  assert.equal(calls.filter((c) => c.startsWith('release create')).length, 1);
  assert.ok(calls.find((c) => c.startsWith('release create')).includes(TAG));
  const uploaded = calls.filter((c) => c.startsWith('release upload'));
  for (const name of FILES) assert.ok(uploaded.some((c) => c.includes(`/${name}`)), `${name} uploaded`);
  assert.equal(JSON.parse(r.stdout).length, 5);
});

test('re-running against an existing Release neither creates it again nor fails', () => {
  const sb = sandbox({ releaseExists: true });
  const r = run(sb.env);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(sb.ghCalls().filter((c) => c.startsWith('release create')).length, 0, 'the Release is not duplicated');
  assert.equal(JSON.parse(r.stdout).length, 5);
});

test('a re-run uploads only the assets that are missing or differ in size', () => {
  const sizeOf = (text) => Buffer.byteLength(text);
  const probe = sandbox();
  const done = ['config.json', 'tokenizer.json', 'vocabulary.json', 'preprocessor_config.json'].map(
    (n) => `${n} ${sizeOf(probe.content[n])}`,
  );
  // model.bin is absent from the Release; config.json is present with the wrong size.
  const sb = sandbox({ releaseExists: true, existingAssets: [...done.slice(1), 'config.json 1'] });
  const r = run(sb.env);
  assert.equal(r.status, 0, r.stderr);
  const uploaded = sb.ghCalls().filter((c) => c.startsWith('release upload'));
  const names = FILES.filter((n) => uploaded.some((c) => c.includes(`/${n}`)));
  assert.deepEqual(names.sort(), ['config.json', 'model.bin']);
  assert.ok(uploaded.every((c) => c.includes('--clobber')), 'a differing asset is replaced, not duplicated');
});

test('a file the upstream cannot serve fails the run before anything is published', () => {
  const sb = sandbox();
  fs.rmSync(path.join(sb.root, 'upstream', 'vocabulary.json'));
  const r = run(sb.env);
  assert.notEqual(r.status, 0);
  assert.deepEqual(sb.ghCalls(), []);
});
