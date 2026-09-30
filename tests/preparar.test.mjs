// Preparing the Criadora's computer (ticket #4): the session-start check and the no-admin
// installer. Drives plugin/estudio/scripts/verificar.sh, instalar.sh and the hook command
// registered in plugin/estudio/hooks/hooks.json as processes, with a sandboxed PATH and a
// temporary plugin data folder, and asserts only on their output, exit code and the files
// they leave behind.
//
// The speech model step (ticket #32) is driven with a manifest override
// (ESTUDIO_MODEL_MANIFEST) whose files are small fixtures served through file:// URLs, so no
// network is needed. The real download (about 2 GB) runs only with ESTUDIO_TESTE_REDE=1.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const verificar = path.join(pluginRoot, 'scripts', 'verificar.sh');
const instalar = path.join(pluginRoot, 'scripts', 'instalar.sh');
const SH = '/bin/sh';

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

// Words the Criadora must never read: she does not know what a terminal or a package
// manager is, and nothing she is told may send her to one.
const JARGON = /\b(brew|homebrew|winget|terminal|sudo|admin)\b/i;

// A temp root with spaces and accents, as on the Criadora's Mac.
function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio preparo '));
  tempRoots.push(root);
  return root;
}

// A bin folder holding only the basic system utilities the scripts may use — no node,
// python, ffmpeg, curl or package manager — so the machine looks freshly unboxed.
const BASIC_UTILITIES = ['sh', 'uname', 'sed', 'dirname', 'cat', 'mkdir', 'rm', 'mv', 'chmod', 'ls', 'tar', 'tr', 'head', 'sha256sum', 'shasum', 'sleep'];
function sandboxBin(root) {
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  for (const name of BASIC_UTILITIES) {
    const real = spawnSync('/bin/sh', ['-c', `command -v ${name}`], { encoding: 'utf8' }).stdout.trim();
    if (real) fs.symlinkSync(real, path.join(bin, name));
  }
  return bin;
}

function stub(file, script) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `#!/bin/sh\n${script}\n`);
  fs.chmodSync(file, 0o755);
}

// The layout the installer leaves in the plugin data folder, with stand-in programs.
function portableRuntimes(data) {
  stub(path.join(data, 'runtime', 'node', 'bin', 'node'), 'echo v22.23.3');
  stub(path.join(data, 'runtime', 'ffmpeg', 'ffmpeg'), 'echo "ffmpeg version 9.0"');
  stub(path.join(data, 'runtime', 'ffmpeg', 'ffprobe'), 'echo "ffprobe version 9.0"');
  stub(path.join(data, 'runtime', 'python', 'bin', 'python'), 'exit 0');
}

// The speech model: the file names the repo's manifest promises, the folder the Preparação
// fills, and a fixture manifest pointing at local copies (file:// URLs) with real sha256 values.
const MODEL_FOLDER = ['modelos', 'large-v3-turbo'];
const manifestFiles = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'vendor.json'), 'utf8'))
  .sources.find((source) => source.id === 'speech-model').files;
const MODEL_FILES = manifestFiles.map((file) => file.name);
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function modelFixture(root, { wrongSha = [] } = {}) {
  const upstream = path.join(root, 'mirror fixtures');
  fs.mkdirSync(upstream);
  const files = MODEL_FILES.map((name) => {
    const content = `fixture bytes of ${name}\n`;
    fs.writeFileSync(path.join(upstream, name), content);
    return { name, sha256: wrongSha.includes(name) ? sha256('something else') : sha256(content), url: pathToFileURL(path.join(upstream, name)).href };
  });
  const manifest = path.join(root, 'manifesto-teste.json');
  fs.writeFileSync(manifest, JSON.stringify({ sources: [{ id: 'speech-model', mode: 'mirrored', files }] }, null, 2));
  return { manifest, upstream, files };
}

// A model folder holding the fixture files, as a finished Preparação leaves it.
function preparedModel(data, upstream) {
  const folder = path.join(data, ...MODEL_FOLDER);
  fs.mkdirSync(folder, { recursive: true });
  for (const name of MODEL_FILES) fs.copyFileSync(path.join(upstream, name), path.join(folder, name));
  return folder;
}

function withCurl(bin) {
  fs.symlinkSync(spawnSync('/bin/sh', ['-c', 'command -v curl'], { encoding: 'utf8' }).stdout.trim(), path.join(bin, 'curl'));
}

function estudioFolder(root, { remotion = false } = {}) {
  const dir = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'estudio.json'), '{"schemaVersion": 1}\n');
  if (remotion) {
    for (const pkg of ['remotion', '@remotion/cli']) {
      const pkgDir = path.join(dir, 'node_modules', pkg);
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'package.json'), '{}');
    }
  }
  return dir;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true }).map(String).sort();
}

function run(script, args, env) {
  const r = spawnSync(SH, [script, ...args], { encoding: 'utf8', env });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// A fresh machine: sandboxed PATH, an empty plugin data folder, an Estúdio without
// its Remotion dependencies.
function freshMachine() {
  const root = tempRoot();
  const bin = sandboxBin(root);
  const data = path.join(root, 'plugin data');
  const estudio = estudioFolder(root);
  const env = { PATH: bin, HOME: path.join(root, 'home') };
  fs.mkdirSync(env.HOME);
  return { root, bin, data, estudio, env };
}

const json = (r) => JSON.parse(r.out);

test('on a fresh computer the check reports every missing tool and installs nothing', () => {
  const m = freshMachine();
  const r = run(verificar, ['--json', m.data, m.estudio], m.env);
  assert.equal(r.code, 0, r.err);
  const out = json(r);
  assert.deepEqual(out.missing, ['node', 'ffmpeg', 'ffprobe', 'python', 'speech-model', 'remotion']);
  assert.deepEqual(out.tools, { node: null, ffmpeg: null, ffprobe: null, python: null });
  assert.equal(out.remotion, 'missing');
  assert.deepEqual(listFiles(m.data), []);
  assert.deepEqual(listFiles(m.estudio), ['estudio.json']);
  assert.deepEqual(listFiles(m.env.HOME), []);
});

test('portable runtimes in the plugin data folder count as installed, and nothing is reported missing', () => {
  const m = freshMachine();
  portableRuntimes(m.data);
  preparedModel(m.data, modelFixture(m.root).upstream);
  const estudio = estudioFolder(tempRoot(), { remotion: true });
  const out = json(run(verificar, ['--json', m.data, estudio], m.env));
  assert.deepEqual(out.missing, []);
  assert.equal(out.tools.node, path.join(m.data, 'runtime', 'node', 'bin', 'node'));
  assert.equal(out.tools.ffmpeg, path.join(m.data, 'runtime', 'ffmpeg', 'ffmpeg'));
  assert.equal(out.tools.ffprobe, path.join(m.data, 'runtime', 'ffmpeg', 'ffprobe'));
  assert.equal(out.tools.python, path.join(m.data, 'runtime', 'python', 'bin', 'python'));
  assert.equal(out.remotion, 'ok');
});

test('tools already on the computer are used, and a Python without faster-whisper is still missing', () => {
  const m = freshMachine();
  stub(path.join(m.bin, 'node'), 'echo v22.0.0');
  stub(path.join(m.bin, 'ffmpeg'), 'echo ffmpeg');
  stub(path.join(m.bin, 'ffprobe'), 'echo ffprobe');
  stub(path.join(m.bin, 'python3'), 'exit 1'); // import faster_whisper fails
  const out = json(run(verificar, ['--json', m.data, m.estudio], m.env));
  assert.deepEqual(out.missing, ['python', 'speech-model', 'remotion']);
  assert.equal(out.tools.node, path.join(m.bin, 'node'));
  assert.equal(out.tools.python, null);
});

test('a folder that is not an Estúdio yet does not report the Remotion dependencies as missing', () => {
  const m = freshMachine();
  portableRuntimes(m.data);
  preparedModel(m.data, modelFixture(m.root).upstream);
  const plain = path.join(m.root, 'Pasta qualquer');
  fs.mkdirSync(plain);
  const out = json(run(verificar, ['--json', m.data, plain], m.env));
  assert.deepEqual(out.missing, []);
  assert.equal(out.remotion, 'not-an-estudio');
});

test('the check reports the speech model as missing when any of its files is absent, and never fetches it', () => {
  const m = freshMachine();
  portableRuntimes(m.data);
  const estudio = estudioFolder(tempRoot(), { remotion: true });
  const check = () => json(run(verificar, ['--json', m.data, estudio], m.env));
  assert.deepEqual(check().missing, ['speech-model'], 'no model folder at all');

  const folder = preparedModel(m.data, modelFixture(m.root).upstream);
  assert.deepEqual(check().missing, []);
  for (const name of MODEL_FILES) {
    fs.renameSync(path.join(folder, name), path.join(folder, `${name}.parked`));
    assert.deepEqual(check().missing, ['speech-model'], `${name} absent`);
    fs.renameSync(path.join(folder, `${name}.parked`), path.join(folder, name));
  }
  assert.deepEqual(check().missing, []);
});

// The command exactly as hooks/hooks.json registers it, with the plugin root substituted
// the way Claude Code does, run by bash as Claude Code runs hooks on Mac and Linux.
function hookCommand(data) {
  const hooks = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'hooks', 'hooks.json'), 'utf8'));
  const [entry] = hooks.hooks.SessionStart;
  const [hook] = entry.hooks;
  assert.equal(hook.type, 'command');
  return hook.command.replaceAll('${CLAUDE_PLUGIN_ROOT}', pluginRoot).replaceAll('${CLAUDE_PLUGIN_DATA}', data);
}

// The data folder reaches the hook only through inline substitution: CLAUDE_PLUGIN_DATA is
// deliberately absent from the environment here.
function runHook(data, env, cwd) {
  const r = spawnSync('/bin/bash', ['-c', hookCommand(data)], { encoding: 'utf8', env, cwd });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

test('the session-start hook reports what is missing, in words the model can act on, and never installs', () => {
  const m = freshMachine();
  const r = runHook(m.data, { ...m.env, CLAUDE_PROJECT_DIR: m.estudio }, m.root);
  assert.equal(r.code, 0, r.err);
  for (const tool of ['node', 'ffmpeg', 'ffprobe', 'python', 'speech-model', 'remotion']) assert.match(r.out, new RegExp(tool));
  assert.match(r.out, /nothing was installed/i);
  assert.doesNotMatch(r.out, JARGON);
  assert.deepEqual(listFiles(m.data), []);
  assert.deepEqual(listFiles(m.estudio), ['estudio.json']);
});

test('the session-start hook stays silent when nothing is missing', () => {
  const m = freshMachine();
  portableRuntimes(m.data);
  preparedModel(m.data, modelFixture(m.root).upstream);
  const estudio = estudioFolder(tempRoot(), { remotion: true });
  const r = runHook(m.data, { ...m.env, CLAUDE_PROJECT_DIR: estudio }, m.root);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out, '');
});

test('re-running the installer on a prepared computer downloads nothing and says so in plain Portuguese', () => {
  const m = freshMachine(); // no curl on PATH: any download attempt would fail
  portableRuntimes(m.data);
  const fixture = modelFixture(m.root);
  preparedModel(m.data, fixture.upstream);
  const estudio = estudioFolder(tempRoot(), { remotion: true });
  const before = listFiles(m.data);
  const r = run(instalar, ['tudo', m.data, estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(r.code, 0, `${r.out}${r.err}`);
  assert.match(r.out, /já estava pronto/);
  assert.match(r.out, /Computador preparado/);
  assert.doesNotMatch(r.out + r.err, JARGON);
  assert.deepEqual(listFiles(m.data), before);
});

test('the modelo step downloads each file into the models folder, says so plainly, and leaves nothing else behind', () => {
  const m = freshMachine();
  withCurl(m.bin);
  const fixture = modelFixture(m.root);
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(r.code, 0, `${r.out}${r.err}`);
  assert.match(r.out, /Modelo de fala.*baixando/);
  for (let i = 1; i <= MODEL_FILES.length; i += 1) assert.match(r.out, new RegExp(`\\(${i} de ${MODEL_FILES.length}\\)`), 'a progress line per file');
  assert.match(r.out, /Modelo de fala: pronto\./);
  assert.doesNotMatch(r.out + r.err, JARGON);
  assert.deepEqual(listFiles(path.join(m.data, 'modelos')), [...MODEL_FILES.map((name) => path.join('large-v3-turbo', name)), 'large-v3-turbo'].sort());
  assert.equal(fs.readFileSync(path.join(m.data, ...MODEL_FOLDER, 'config.json'), 'utf8'), fs.readFileSync(path.join(fixture.upstream, 'config.json'), 'utf8'));
  assert.equal(fs.existsSync(path.join(m.data, 'tmp')), false, 'partial downloads are removed');
  assert.deepEqual(json(run(verificar, ['--json', m.data, m.estudio], m.env)).missing.includes('speech-model'), false);
});

test('a downloaded file with the wrong sha256 is deleted and reported, and the step fails', () => {
  const m = freshMachine();
  withCurl(m.bin);
  const fixture = modelFixture(m.root, { wrongSha: ['tokenizer.json'] });
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(r.code, 1, `${r.out}${r.err}`);
  assert.match(r.out + r.err, /tokenizer\.json.*corrompido.*apagado/);
  assert.doesNotMatch(r.out + r.err, JARGON);
  const folder = path.join(m.data, ...MODEL_FOLDER);
  assert.equal(fs.existsSync(path.join(folder, 'tokenizer.json')), false, 'the bad file is not kept');
  assert.equal(fs.existsSync(path.join(m.data, 'tmp')), false);
  assert.deepEqual(json(run(verificar, ['--json', m.data, m.estudio], m.env)).missing.includes('speech-model'), true);
});

test('a corrupted file already in the models folder is replaced on the next run, and only that file is fetched', () => {
  const m = freshMachine();
  withCurl(m.bin);
  const fixture = modelFixture(m.root);
  const folder = preparedModel(m.data, fixture.upstream);
  fs.writeFileSync(path.join(folder, 'model.bin'), 'half of a file');
  const untouched = fs.statSync(path.join(folder, 'config.json')).mtimeMs;
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(r.code, 0, `${r.out}${r.err}`);
  assert.match(r.out, /\(1 de 1\)/);
  assert.equal(fs.readFileSync(path.join(folder, 'model.bin'), 'utf8'), fs.readFileSync(path.join(fixture.upstream, 'model.bin'), 'utf8'));
  assert.equal(fs.statSync(path.join(folder, 'config.json')).mtimeMs, untouched);
});

test('re-running the modelo step on a prepared model downloads nothing', () => {
  const m = freshMachine(); // no curl on PATH: any download attempt would fail
  const fixture = modelFixture(m.root);
  const folder = preparedModel(m.data, fixture.upstream);
  const before = listFiles(m.data);
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(r.code, 0, `${r.out}${r.err}`);
  assert.match(r.out, /Modelo de fala: já estava pronto/);
  assert.doesNotMatch(r.out, /baixando/);
  assert.deepEqual(listFiles(m.data), before);
  assert.ok(fs.existsSync(path.join(folder, 'model.bin')));
});

// Where an interrupted model download waits for the next run (outside the models folder, which
// only ever holds verified files).
const PARTIAL_FOLDER = ['partial', 'speech-model'];

// A stand-in curl for the model step: honours -o and -w, writes the fixture file named by the
// URL's last segment, and can pause halfway (a slow link) or stop halfway (a dropped connection).
function slowCurl(bin, upstream, { pauseSeconds = 0, dropAfterHalf = false } = {}) {
  stub(path.join(bin, 'curl'), `out=; url=
while [ $# -gt 0 ]; do
  case "$1" in -o) out=$2; shift ;; -w) shift ;; -*) ;; *) url=$1 ;; esac
  shift
done
source="${upstream}/\${url##*/}"
half=$(( $(/bin/cat "$source" | /usr/bin/wc -c) / 2 ))
/usr/bin/head -c "$half" "$source" >> "$out"
${dropAfterHalf ? 'exit 18' : ''}
/bin/sleep ${pauseSeconds}
/usr/bin/tail -c +"$(( half + 1 ))" "$source" >> "$out"
printf 200`);
}

test('a model download interrupted halfway keeps what arrived, and the next run continues from there', () => {
  const m = freshMachine();
  const fixture = modelFixture(m.root);
  slowCurl(m.bin, fixture.upstream, { dropAfterHalf: true });
  const first = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(first.code, 1, `${first.out}${first.err}`);
  assert.match(first.out + first.err, /Não consegui/);
  assert.equal(fs.existsSync(path.join(m.data, ...MODEL_FOLDER, 'model.bin')), false, 'no unverified file in the models folder');
  const kept = path.join(m.data, ...PARTIAL_FOLDER, 'model.bin');
  assert.ok(fs.existsSync(kept) && fs.statSync(kept).size > 0, 'the bytes already downloaded are kept');

  // The kept bytes are replaced by a marker of the same length: only a download that continues
  // after them (instead of starting again from zero) produces the file the manifest expects.
  const upstreamBytes = fs.readFileSync(path.join(fixture.upstream, 'model.bin'));
  const marker = Buffer.alloc(fs.statSync(kept).size, 'R');
  fs.writeFileSync(kept, marker);
  const resumed = Buffer.concat([marker, upstreamBytes.subarray(marker.length)]);
  const manifest = JSON.parse(fs.readFileSync(fixture.manifest, 'utf8'));
  manifest.sources[0].files.find((f) => f.name === 'model.bin').sha256 = sha256(resumed);
  fs.writeFileSync(fixture.manifest, JSON.stringify(manifest));
  fs.rmSync(path.join(m.bin, 'curl'));
  withCurl(m.bin);

  const second = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest });
  assert.equal(second.code, 0, `${second.out}${second.err}`);
  assert.match(second.out, /continuando model\.bin de onde parou/);
  assert.deepEqual(fs.readFileSync(path.join(m.data, ...MODEL_FOLDER, 'model.bin')), resumed);
  assert.equal(fs.existsSync(path.join(m.data, 'partial')), false, 'nothing is left waiting once the model is ready');
});

test('a kept partial download that does not add up to the expected file is deleted and reported, and the next run starts it again', () => {
  const m = freshMachine();
  withCurl(m.bin);
  const fixture = modelFixture(m.root);
  const kept = path.join(m.data, ...PARTIAL_FOLDER, 'model.bin');
  fs.mkdirSync(path.dirname(kept), { recursive: true });
  fs.writeFileSync(kept, 'garbage!');
  const env = { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest };
  const bad = run(instalar, ['modelo', m.data, m.estudio], env);
  assert.equal(bad.code, 1, `${bad.out}${bad.err}`);
  assert.match(bad.out + bad.err, /model\.bin.*corrompido.*apagado/);
  assert.equal(fs.existsSync(kept), false);
  const again = run(instalar, ['modelo', m.data, m.estudio], env);
  assert.equal(again.code, 0, `${again.out}${again.err}`);
  assert.equal(fs.readFileSync(path.join(m.data, ...MODEL_FOLDER, 'model.bin'), 'utf8'), fs.readFileSync(path.join(fixture.upstream, 'model.bin'), 'utf8'));
});

test('while a model file downloads, a plain progress line keeps coming so the Criadora knows it has not frozen', () => {
  const m = freshMachine();
  const fixture = modelFixture(m.root);
  slowCurl(m.bin, fixture.upstream, { pauseSeconds: 3 });
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest, ESTUDIO_PROGRESS_SECONDS: '1' });
  assert.equal(r.code, 0, `${r.out}${r.err}`);
  assert.match(r.out, /model\.bin: \d+ MB baixados até agora/);
  assert.doesNotMatch(r.out + r.err, JARGON);
  assert.match(r.out, /Modelo de fala: pronto\./);
});

test('stopping the Preparação in the middle of a model download also stops the download, so the next run continues a file nobody else is writing', () => {
  const m = freshMachine();
  const fixture = modelFixture(m.root);
  slowCurl(m.bin, fixture.upstream, { pauseSeconds: 3 });
  const kept = path.join(m.data, ...PARTIAL_FOLDER, 'model.bin');
  // Stop the installer 1 s in (curl has written half and is pausing), then look at the kept file
  // right away and again after curl's pause would have ended.
  const script = `"$0" "$1" modelo "$2" "$3" & pid=$!
/bin/sleep 1; kill -TERM "$pid"; wait "$pid"
/usr/bin/wc -c < "$4"; /bin/sleep 3; /usr/bin/wc -c < "$4"`;
  const r = spawnSync(SH, ['-c', script, SH, instalar, m.data, m.estudio, kept], { encoding: 'utf8', env: { ...m.env, ESTUDIO_MODEL_MANIFEST: fixture.manifest } });
  const [right, later] = r.stdout.trim().split('\n').slice(-2).map(Number);
  assert.ok(right > 0, `${r.stdout}${r.stderr}`);
  assert.equal(later, right, 'nothing keeps writing into the kept file after the Preparação stopped');
});

test('a model download that cannot start leaves nothing waiting for a next run', () => {
  const m = freshMachine(); // no curl on PATH
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: modelFixture(m.root).manifest });
  assert.equal(r.code, 1);
  assert.equal(fs.existsSync(path.join(m.data, 'partial')), false);
});

test('a model download that cannot start fails plainly and leaves no model behind', () => {
  const m = freshMachine(); // no curl on PATH
  const r = run(instalar, ['modelo', m.data, m.estudio], { ...m.env, ESTUDIO_MODEL_MANIFEST: modelFixture(m.root).manifest });
  assert.equal(r.code, 1);
  assert.match(r.out + r.err, /Não consegui/);
  assert.equal(fs.existsSync(path.join(m.data, ...MODEL_FOLDER, 'model.bin')), false);
});

test('a download that fails stops with a plain message and leaves nothing half-installed', () => {
  const m = freshMachine(); // no curl on PATH
  const r = run(instalar, ['node', m.data, m.estudio], m.env);
  assert.notEqual(r.code, 0);
  assert.match(r.out + r.err, /Não consegui/);
  assert.doesNotMatch(r.out + r.err, JARGON);
  assert.equal(fs.existsSync(path.join(m.data, 'runtime', 'node')), false);
  assert.equal(json(run(verificar, ['--json', m.data, m.estudio], m.env)).tools.node, null);
});

test('an unknown step is a usage error', () => {
  const m = freshMachine();
  const r = run(instalar, ['tudo-errado', m.data, m.estudio], m.env);
  assert.equal(r.code, 2);
});

// ---- the real download: hundreds of MB, minutes; opt-in ----
const network = process.env.ESTUDIO_TESTE_REDE === '1' ? {} : { skip: 'set ESTUDIO_TESTE_REDE=1 to download the real runtimes' };

test('a real install puts everything in the plugin data folder, the check then finds nothing missing, and a re-run is a no-op', network, () => {
  const root = tempRoot();
  const data = path.join(root, 'plugin data');
  const home = path.join(root, 'home');
  fs.mkdirSync(home);
  const estudio = estudioFolder(root);
  fs.copyFileSync(path.join(pluginRoot, 'template', 'package.json'), path.join(estudio, 'package.json'));
  // The real system PATH minus anything that already provides node, python or ffmpeg.
  const bin = sandboxBin(root);
  fs.symlinkSync(spawnSync('/bin/sh', ['-c', 'command -v curl'], { encoding: 'utf8' }).stdout.trim(), path.join(bin, 'curl'));
  for (const name of ['gzip', 'xz', 'find', 'grep', 'basename', 'env', 'readlink', 'cp', 'ln']) {
    const real = spawnSync('/bin/sh', ['-c', `command -v ${name}`], { encoding: 'utf8' }).stdout.trim();
    if (real && !fs.existsSync(path.join(bin, name))) fs.symlinkSync(real, path.join(bin, name));
  }
  const env = { PATH: bin, HOME: home };

  const first = spawnSync(SH, [instalar, 'tudo', data, estudio], { encoding: 'utf8', env, timeout: 1_800_000 });
  assert.equal(first.status, 0, `${first.stdout}${first.stderr}`);
  assert.doesNotMatch(first.stdout, JARGON);

  const check = json(run(verificar, ['--json', data, estudio], env));
  assert.deepEqual(check.missing, []);
  for (const tool of ['node', 'ffmpeg', 'ffprobe', 'python']) assert.ok(check.tools[tool].startsWith(data), tool);
  assert.deepEqual(listFiles(home), [], 'nothing may be written outside the plugin data folder');

  const again = run(instalar, ['tudo', data, estudio], env);
  assert.equal(again.code, 0, again.out + again.err);
  assert.equal((again.out.match(/já estava pronto/g) ?? []).length, 5);
});

// The Windows twins (instalar.ps1, verificar.ps1), driven through WSL interop with a
// PATH reduced to Windows itself, so a Node already on the machine is not reused.
const hasWindows = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'exit 0']).status === 0;
const windowsNetwork = !network.skip && hasWindows ? {} : { skip: 'needs ESTUDIO_TESTE_REDE=1 and powershell.exe (WSL)' };

test('on Windows a real install fills the plugin data folder, the check finds nothing missing, and a re-run is a no-op', windowsNetwork, () => {
  const ps = (command) => spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8', timeout: 1_800_000 });
  const winTemp = ps('[IO.Path]::GetTempPath()').stdout.trim();
  const root = `${winTemp}estúdio teste ${process.pid}`;
  const toWsl = (p) => spawnSync('wslpath', ['-u', p], { encoding: 'utf8' }).stdout.trim();
  tempRoots.push(toWsl(root));
  const estudio = `${root}\\Meu Estúdio`;
  const data = `${root}\\dados do plugin`;
  fs.mkdirSync(toWsl(estudio), { recursive: true });
  fs.writeFileSync(path.join(toWsl(estudio), 'estudio.json'), '{"schemaVersion": 1}\n');
  fs.copyFileSync(path.join(pluginRoot, 'template', 'package.json'), path.join(toWsl(estudio), 'package.json'));
  const script = (name) => spawnSync('wslpath', ['-w', path.join(pluginRoot, 'scripts', name)], { encoding: 'utf8' }).stdout.trim();
  const bare = "$env:Path = \"$env:SystemRoot\\System32;$env:SystemRoot;$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\"";
  const install = () => ps(`${bare}; powershell -NoProfile -ExecutionPolicy Bypass -File '${script('instalar.ps1')}' -Step tudo -DataDir '${data}' -Estudio '${estudio}'; exit $LASTEXITCODE`);

  const first = install();
  assert.equal(first.status, 0, `${first.stdout}${first.stderr}`);
  assert.doesNotMatch(first.stdout, JARGON);
  const check = JSON.parse(ps(`${bare}; powershell -NoProfile -ExecutionPolicy Bypass -File '${script('verificar.ps1')}' -Json -DataDir '${data}' -Estudio '${estudio}'`).stdout);
  assert.deepEqual(check.missing, []);
  for (const tool of ['node', 'ffmpeg', 'ffprobe', 'python']) assert.ok(check.tools[tool].startsWith(data), tool);

  const again = install();
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.equal((again.stdout.match(/já estava pronto/g) ?? []).length, 5);
});

test('on Windows the modelo step fills the models folder from local fixtures, the check agrees, a wrong sha256 is deleted, a re-run downloads nothing and a file cut halfway is continued', hasWindows ? {} : { skip: 'powershell.exe not available' }, () => {
  const ps = (command) => spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8', timeout: 300_000 });
  const winTemp = ps('[IO.Path]::GetTempPath()').stdout.trim();
  const root = `${winTemp}estúdio modelo ${process.pid}`;
  const toWsl = (p) => spawnSync('wslpath', ['-u', p], { encoding: 'utf8' }).stdout.trim();
  const toWin = (p) => spawnSync('wslpath', ['-w', p], { encoding: 'utf8' }).stdout.trim();
  const rootWsl = toWsl(root);
  fs.mkdirSync(rootWsl, { recursive: true });
  tempRoots.push(rootWsl);
  const winUrl = (wslPath) => encodeURI(`file:///${toWin(wslPath).replaceAll('\\', '/')}`);

  const upstream = path.join(rootWsl, 'espelho');
  fs.mkdirSync(upstream);
  const files = MODEL_FILES.map((name) => {
    const content = `fixture bytes of ${name}\n`;
    fs.writeFileSync(path.join(upstream, name), content);
    return { name, sha256: name === 'config.json' ? sha256('something else') : sha256(content), url: winUrl(path.join(upstream, name)) };
  });
  const manifestPath = path.join(rootWsl, 'manifesto.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ sources: [{ id: 'speech-model', files }] }));
  const data = path.join(rootWsl, 'dados do plugin');
  const script = (name) => toWin(path.join(pluginRoot, 'scripts', name));
  const withManifest = `$env:ESTUDIO_MODEL_MANIFEST = '${toWin(manifestPath)}';`;
  const install = () => ps(`${withManifest} powershell -NoProfile -ExecutionPolicy Bypass -File '${script('instalar.ps1')}' -Step modelo -DataDir '${toWin(data)}'; exit $LASTEXITCODE`);
  const check = () => JSON.parse(ps(`${withManifest} powershell -NoProfile -ExecutionPolicy Bypass -File '${script('verificar.ps1')}' -Json -DataDir '${toWin(data)}' -Estudio '${toWin(rootWsl)}'`).stdout).missing;
  const folder = path.join(data, ...MODEL_FOLDER);

  const bad = install();
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stdout, /config\.json.*corrompido.*apagado/);
  assert.equal(fs.existsSync(path.join(folder, 'config.json')), false, 'the bad file is not kept');
  assert.ok(check().includes('speech-model'));

  files.find((file) => file.name === 'config.json').sha256 = sha256(fs.readFileSync(path.join(upstream, 'config.json')));
  fs.writeFileSync(manifestPath, JSON.stringify({ sources: [{ id: 'speech-model', files }] }));
  const good = install();
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /Modelo de fala: pronto\./);
  assert.deepEqual(listFiles(folder), [...MODEL_FILES].sort());
  assert.equal(check().includes('speech-model'), false);

  const again = install();
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(again.stdout, /Modelo de fala: já estava pronto/);
  assert.doesNotMatch(again.stdout, /baixando/);

  // A model.bin cut halfway by an earlier run is continued, not downloaded again: the kept bytes
  // are a marker, so only a download that starts after them matches the manifest.
  fs.rmSync(path.join(folder, 'model.bin'));
  const upstreamBytes = fs.readFileSync(path.join(upstream, 'model.bin'));
  const marker = Buffer.alloc(8, 'R');
  const resumed = Buffer.concat([marker, upstreamBytes.subarray(marker.length)]);
  fs.mkdirSync(path.join(data, ...PARTIAL_FOLDER), { recursive: true });
  fs.writeFileSync(path.join(data, ...PARTIAL_FOLDER, 'model.bin'), marker);
  files.find((file) => file.name === 'model.bin').sha256 = sha256(resumed);
  fs.writeFileSync(manifestPath, JSON.stringify({ sources: [{ id: 'speech-model', files }] }));
  const continued = install();
  assert.equal(continued.status, 0, continued.stdout + continued.stderr);
  assert.match(continued.stdout, /continuando model\.bin de onde parou/);
  assert.deepEqual(fs.readFileSync(path.join(folder, 'model.bin')), resumed);
  assert.equal(fs.existsSync(path.join(data, 'partial')), false);
});

test('on Windows without Git Bash the same hook command runs in PowerShell and reports what is missing', hasWindows ? {} : { skip: 'powershell.exe not available' }, () => {
  const winRoot = spawnSync('wslpath', ['-w', pluginRoot], { encoding: 'utf8' }).stdout.trim();
  const command = hookCommand(`$env:TEMP\\estúdio sem dados ${process.pid}`).replaceAll(pluginRoot, winRoot);
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', `$env:CLAUDE_PROJECT_DIR = $env:TEMP; ${command}`],
  { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /nothing was installed\): missing .*python/i);
  assert.doesNotMatch(r.stdout, JARGON);
});
