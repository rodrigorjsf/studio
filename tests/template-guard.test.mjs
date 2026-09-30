// Seam 2 — the Estúdio's own guard (`scripts/guard.mjs` in the Remotion template), run by the
// Estúdio's `typecheck` after `tsc --noEmit`. Scaffolds a fresh Estúdio with `criar` for every
// case, writes Vídeo compositions under `src/videos/`, and runs the shipped guard exactly as
// her `npm run typecheck` would. Asserts on its exit code and its `path:line: reason` lines.
// The guard reads files only, so no case needs the Remotion dependencies.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(repoRoot, 'plugin', 'estudio', 'template');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');
const GUARD = 'scripts/guard.mjs';

const roots = [];
after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

// A fresh Estúdio in a path with spaces and accents, as on the Criadora's Mac.
function scaffold() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio guarda '));
  roots.push(root);
  const estudio = path.join(root, 'Meu Estúdio de Vídeos');
  fs.mkdirSync(estudio);
  const created = spawnSync(process.execPath, [cli, 'criar', estudio], { encoding: 'utf8' });
  assert.equal(created.status, 0, created.stderr);
  return estudio;
}

function write(estudio, relative, lines) {
  const file = path.join(estudio, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function guard(estudio) {
  const result = spawnSync(process.execPath, [path.join(estudio, ...GUARD.split('/'))], { encoding: 'utf8', cwd: estudio });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

// Reads every brand value through the Kit, with the template's English helper names.
const KIT_COMPOSITION = [
  "import React from 'react';",
  "import {AbsoluteFill} from 'remotion';",
  "import {DEFAULT_KIT, KitProps, Kit} from '../../_shared/kit';",
  "import {fontStyle, KitCaptions, useKitEntrance, useKitFonts, Word} from '../../_shared/marca';",
  '',
  "const words: Word[] = [{texto: 'olá', inicio: 0.1}];",
  '',
  'export const FromTheKit: React.FC<KitProps & {kit?: Kit}> = (props) => {',
  '  const kit = props.kit ?? DEFAULT_KIT;',
  '  useKitFonts(kit, props.projeto);',
  '  const entrance = useKitEntrance(kit, 0);',
  '  return (',
  '    <AbsoluteFill style={{backgroundColor: kit.cores.fundo}}>',
  '      {/* Issue #24: every color and font comes from the Kit. */}',
  '      <div style={{...fontStyle(kit.tipografia.titulo), color: kit.cores.primaria, opacity: entrance}}>Oi</div>',
  '      <KitCaptions kit={kit} palavras={words} />',
  '    </AbsoluteFill>',
  '  );',
  '};',
];

test('the guard ships in the template and the template typecheck runs it after tsc', () => {
  assert.ok(fs.existsSync(path.join(templateRoot, ...GUARD.split('/'))), `${GUARD} is missing from the template`);
  const scripts = JSON.parse(fs.readFileSync(path.join(templateRoot, 'package.json'), 'utf8')).scripts;
  assert.equal(scripts.typecheck, `tsc --noEmit && node ${GUARD}`);
});

test('the guard fails on hex colors and string fontFamily in src/videos, naming each file and line', () => {
  const estudio = scaffold();
  write(estudio, 'src/videos/minha-empresa-dica/Cores.tsx', [
    "import React from 'react';",
    "export const Cores: React.FC = () => (",
    "  <div style={{color: '#ff0066'}}>",
    "    <span style={{background: '#FFF'}} />",
    "    <span style={{borderColor: \"#11223344\"}} />",
    '  </div>',
    ');',
  ]);
  write(estudio, 'src/videos/minha-empresa-dica/Fonte.tsx', [
    "import React from 'react';",
    'export const Letras: React.FC = () => (',
    "  <div style={{fontFamily: 'Inter, sans-serif'}}>Oi</div>",
    ');',
  ]);
  const { status, output } = guard(estudio);
  assert.notEqual(status, 0, output);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Cores\.tsx:3: .*#ff0066/m);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Cores\.tsx:4: .*#FFF/m);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Cores\.tsx:5: .*#11223344/m);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Fonte\.tsx:3: .*fontFamily/m);
});

test('the guard passes a composition that reads its colors and fonts from the Kit', () => {
  const estudio = scaffold();
  write(estudio, 'src/videos/minha-empresa-dica/FromTheKit.tsx', KIT_COMPOSITION);
  const { status, output } = guard(estudio);
  assert.equal(status, 0, output);
});

test('the guard passes when src/videos is missing', () => {
  const estudio = scaffold();
  assert.equal(fs.existsSync(path.join(estudio, 'src', 'videos')), false);
  const { status, output } = guard(estudio);
  assert.equal(status, 0, output);
});

test('the guard passes when src/videos is empty', () => {
  const estudio = scaffold();
  fs.mkdirSync(path.join(estudio, 'src', 'videos'));
  const { status, output } = guard(estudio);
  assert.equal(status, 0, output);
});

test('the guard enforces the split-layout rule inside the Estúdio', () => {
  const estudio = scaffold();
  write(estudio, 'src/videos/minha-empresa-dica/Split.tsx', [
    "import {interpolate, useCurrentFrame} from 'remotion';",
    'export const useSplit = () => {',
    '  const frame = useCurrentFrame();',
    '  const splitOut = frame > 30;',
    '  const cameraLeft = interpolate(frame, [0, 10], [0, 540]);',
    '  const cameraWidth = interpolate(frame, [0, 10], [1080, 540]);',
    '  return {splitOut, cameraLeft, cameraWidth};',
    '};',
  ]);
  const { status, output } = guard(estudio);
  assert.notEqual(status, 0, output);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Split\.tsx:5: .*synchronized-split/m);
});

test('the repo-side split-layout check passes on the template it ships', () => {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'check-split-layouts.mjs')], { encoding: 'utf8', cwd: repoRoot });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
});

test('the guard passes a fontFamily template literal built from the Kit', () => {
  const estudio = scaffold();
  write(estudio, 'src/videos/minha-empresa-dica/Interpolada.tsx', [
    "import React from 'react';",
    "import {DEFAULT_KIT} from '../../_shared/kit';",
    'export const Interpolada: React.FC = () => (',
    '  <div style={{fontFamily: `"${DEFAULT_KIT.tipografia.titulo.familia}", serif`}}>Oi</div>',
    ');',
  ]);
  const { status, output } = guard(estudio);
  assert.equal(status, 0, output);
});

test('the guard catches a quoted fontFamily key, a JSX fontFamily attribute and a hex after "/*" in a string', () => {
  const estudio = scaffold();
  write(estudio, 'src/videos/minha-empresa-dica/Escapes.tsx', [
    "import React from 'react';",
    "const aceita = 'image/*';",
    'export const Escapes: React.FC = () => (',
    "  <div style={{'fontFamily': 'Inter'}}>",
    '    <svg><text fontFamily="Inter">Oi</text></svg>',
    "    <span style={{color: '#ff0066'}} />",
    '  </div>',
    ');',
  ]);
  const { status, output } = guard(estudio);
  assert.notEqual(status, 0, output);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Escapes\.tsx:4: .*fontFamily/m);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Escapes\.tsx:5: .*fontFamily/m);
  assert.match(output, /^src\/videos\/minha-empresa-dica\/Escapes\.tsx:6: .*#ff0066/m);
});

test('the guard still runs when called through a symlinked path', { skip: process.platform === 'win32' }, () => {
  const estudio = scaffold();
  write(estudio, 'src/videos/minha-empresa-dica/Cor.tsx', ["export const COR = '#ff0066';"]);
  const link = path.join(path.dirname(estudio), 'atalho');
  fs.symlinkSync(estudio, link);
  const result = spawnSync(process.execPath, [path.join(link, ...GUARD.split('/'))], { encoding: 'utf8' });
  assert.notEqual(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stderr, /Cor\.tsx:1: .*#ff0066/);
});
