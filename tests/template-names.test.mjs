// Seam 3 — the template's public helpers, renamed to English (spec #29, ticket #34), with every
// old Portuguese name kept as a deprecated alias of its new name (expand step of an
// expand–contract rename). Two halves:
//   - static: the plugin names each renamed helper only as a deprecated alias of the new one;
//   - compile: a scaffolded Estúdio typechecks a Vídeo composition written with ONLY the old
//     names (what the Criadora's existing Vídeos look like) and one written with the new names.
// Asserts on the shipped files and on the TypeScript compiler's own output. Removing the aliases
// is a later breaking release: delete the `RENAMED` entries' alias expectations then.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(repoRoot, 'plugin', 'estudio');
const cli = path.join(pluginRoot, 'scripts', 'estudio.mjs');
const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const fixtures = path.join(repoRoot, 'tests', 'fixtures', 'template-names');
const normalize = (text) => text.replaceAll('\r\n', '\n');

// old name -> new name. `alias: false` = a module-private constant: renamed, no alias needed.
// `code` = the old name is an ordinary Portuguese word too ("Fonte", "Palavra"), so only source
// files are searched for it, never prose.
const RENAMED = [
  // _shared/kit.ts
  { old: 'Fonte', now: 'Font', code: true },
  { old: 'KIT_PADRAO', now: 'DEFAULT_KIT' },
  { old: 'DIMENSOES', now: 'DIMENSIONS' },
  { old: 'PropsDoKit', now: 'KitProps' },
  { old: 'arquivoDoProjeto', now: 'projectFile' },
  { old: 'carregarKit', now: 'loadKit' },
  { old: 'calcularMetadadosDoKit', now: 'calculateKitMetadata' },
  { old: 'tamanhoNoQuadro', now: 'scaleToFrame' },
  // _shared/marca.tsx
  { old: 'estiloDaFonte', now: 'fontStyle' },
  { old: 'useFontesDoKit', now: 'useKitFonts' },
  { old: 'useEntradaDoKit', now: 'useKitEntrance' },
  { old: 'Palavra', now: 'Word', code: true },
  { old: 'LegendaDoKit', now: 'KitCaptions' },
  { old: 'POSICAO_DA_LEGENDA', now: 'CAPTION_POSITION', alias: false },
  // _shared/edicao.tsx
  { old: 'FPS_DA_EDICAO', now: 'EDICAO_FPS' },
  { old: 'PropsDaEdicao', now: 'EdicaoProps' },
  { old: 'calcularMetadadosDaEdicao', now: 'calculateEdicaoMetadata' },
  { old: 'arquivoDoVideo', now: 'videoFile' },
  { old: 'MasterMudo', now: 'MutedMaster' },
  { old: 'PropsDaEdicaoComLegendas', now: 'EdicaoWithCaptionsProps' },
  { old: 'CLIPE', now: 'CLIP_FILE', alias: false },
];

const TEXT = /\.(ts|tsx|mjs|md|json|sh|ps1|py)$/;
const SOURCE = /\.(ts|tsx|mjs|sh|ps1|py)$/;
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && TEXT.test(entry.name) ? [absolute] : [];
  });
}
const pluginFiles = walk(pluginRoot).map((file) => ({ file, lines: normalize(fs.readFileSync(file, 'utf8')).split('\n') }));
const shared = (name) => normalize(fs.readFileSync(path.join(pluginRoot, 'template', 'src', '_shared', name), 'utf8'));
const sharedSources = ['kit.ts', 'marca.tsx', 'edicao.tsx'].map(shared).join('\n');

for (const { old, now, alias = true, code = false } of RENAMED) {
  test(`${old} is ${alias ? 'renamed to' : 'gone for'} ${now}${alias ? ' and kept only as a deprecated alias' : ''}`, () => {
    assert.match(sharedSources, new RegExp(`\\b${now}\\b`), `${now} is not defined in the template's shared code`);
    const pattern = new RegExp(`\\b${old}\\b(?!-)`); // `Palavra-gatilho` is a glossary term, not the type
    const aliasLine = new RegExp(`^export (const|type) ${old}\\b.* ${now}\\b`);
    const stray = [];
    for (const { file, lines } of pluginFiles) {
      if (code && !SOURCE.test(file)) continue;
      lines.forEach((line, index) => {
        if (!pattern.test(line)) return;
        const isAlias = alias && aliasLine.test(line) && /@deprecated/.test(lines[index - 1] ?? '');
        if (!isAlias) stray.push(`${path.relative(repoRoot, file)}:${index + 1}`);
      });
    }
    assert.deepEqual(stray, [], `${old} still appears outside its deprecated alias`);
    if (alias) assert.match(sharedSources, new RegExp(`@deprecated[^\\n]*\\n${'export (const|type) ' + old}\\b`), `${old} has no deprecated alias`);
  });
}

let root;
let diagnostics = '';
let status = null;
const skip = fs.existsSync(tsc) ? null : 'run `npm ci` first: TypeScript is missing';
const needs = skip ? { skip } : {};

before(() => {
  if (skip) return;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio nomes '));
  const estudio = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(estudio);
  const created = spawnSync(process.execPath, [cli, 'criar', estudio], { encoding: 'utf8' });
  assert.equal(created.status, 0, created.stderr);
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(estudio, 'node_modules'), 'junction');
  const videos = path.join(estudio, 'src', 'videos', 'nomes');
  fs.mkdirSync(videos, { recursive: true });
  for (const name of ['legacy-names.tsx', 'current-names.tsx']) fs.copyFileSync(path.join(fixtures, name), path.join(videos, name));
  const result = spawnSync(process.execPath, [tsc, '--noEmit', '-p', path.join(estudio, 'tsconfig.json')], { encoding: 'utf8', cwd: estudio });
  status = result.status;
  diagnostics = `${result.stdout}${result.stderr}`;
});

after(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

test('a Vídeo composition written with only the old names typechecks in a fresh Estúdio', needs, () => {
  assert.doesNotMatch(diagnostics, /legacy-names\.tsx/, diagnostics);
});

test('a Vídeo composition written with the English names typechecks in a fresh Estúdio', needs, () => {
  assert.doesNotMatch(diagnostics, /current-names\.tsx/, diagnostics);
});

test('the whole scaffolded Estúdio typechecks', needs, () => {
  assert.equal(status, 0, diagnostics);
});

test('EdicaoComLegendas stays the composition id and is also a deprecated alias of EdicaoWithCaptions', () => {
  assert.match(sharedSources, /@deprecated[^\n]*\nexport const EdicaoComLegendas = EdicaoWithCaptions;/);
  const rootTsx = normalize(fs.readFileSync(path.join(pluginRoot, 'template', 'src', 'Root.tsx'), 'utf8'));
  assert.match(rootTsx, /id="EdicaoComLegendas"\s+component=\{EdicaoWithCaptions\}/);
});
