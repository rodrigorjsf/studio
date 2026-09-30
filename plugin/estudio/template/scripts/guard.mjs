// WHAT  The Estúdio's code guard, run by `npm run typecheck` right after `tsc --noEmit`.
//       Two rules over the Remotion code in `src/`:
//         1. Split screens: a camera geometry animated by hand (`cameraLeft`/`cameraWidth` built with
//            `interpolate` around a split) must go through `src/_shared/synchronized-split.tsx`
//            (`getSynchronizedSplitState`), so the camera and the panel enter and leave together.
//         2. Brand values: a Vídeo composition (any file under `src/videos/`) never writes a hex
//            color (#RGB, #RRGGBB, #RRGGBBAA) or a `fontFamily` string of its own; colors and fonts
//            come from the Kit de marca (`kit.cores.*`, `fontStyle(kit.tipografia.*)` from
//            `src/_shared/marca.tsx`).
// WHY   Every Vídeo of a Projeto must look like the same brand, and a hand-made split drifts out
//       of sync. A line scan is enough: it names the file and line to fix.
// HOW   node scripts/guard.mjs
//       Prints one `path:line: reason` line per violation and exits 1; prints "guard: ok" otherwise.
//       Passes when `src/videos/` is missing or empty.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const estudioRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The one file allowed to animate the split geometry by hand: the primitive itself.
const SPLIT_PRIMITIVE = '_shared/synchronized-split.tsx';
const SOURCE_FILE = /\.(ts|tsx)$/;
const VIDEO_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|css)$/;

const HEX_COLOR = /(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w])/g;
const STRING_FONT_FAMILY = /fontFamily\s*:\s*['"`]/;

function collect(directory, pattern) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(absolute, pattern);
    return entry.isFile() && pattern.test(entry.name) ? [absolute] : [];
  });
}

const relativeTo = (base, file) => path.relative(base, file).split(path.sep).join('/');
const readLines = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/);

// Blanks out comments, keeping every line in place, so a note like "see #123" is not code.
function withoutComments(lines) {
  let inBlock = false;
  return lines.map((line) => {
    let code = '';
    for (let at = 0; at < line.length;) {
      if (inBlock) {
        const end = line.indexOf('*/', at);
        if (end === -1) return code;
        inBlock = false;
        at = end + 2;
        continue;
      }
      const start = line.indexOf('/*', at);
      const lineComment = /(^|\s)\/\//.exec(line.slice(at));
      const lineAt = lineComment ? at + lineComment.index + lineComment[1].length : -1;
      if (lineAt !== -1 && (start === -1 || lineAt < start)) return code + line.slice(at, lineAt);
      if (start === -1) return code + line.slice(at);
      code += line.slice(at, start);
      inBlock = true;
      at = start + 2;
    }
    return code;
  });
}

// Rule 1: hand-made split geometry. Returns {file, line, reason} items, `file` relative to srcRoot.
export function checkSplitLayouts(srcRoot) {
  const violations = [];
  for (const absolute of collect(srcRoot, SOURCE_FILE)) {
    const file = relativeTo(srcRoot, absolute);
    if (file === SPLIT_PRIMITIVE) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    const buildsCameraGeometryManually =
      /cameraLeft\s*=\s*interpolate/.test(source) &&
      /cameraWidth\s*=\s*interpolate/.test(source) &&
      /(splitOut|windowProgress)/.test(source);
    if (!buildsCameraGeometryManually || source.includes('getSynchronizedSplitState')) continue;
    const line = source.split(/\r?\n/).findIndex((text) => /cameraLeft\s*=\s*interpolate/.test(text)) + 1;
    violations.push({
      file,
      line,
      reason: `hand-made split screen; build it with src/${SPLIT_PRIMITIVE} (getSynchronizedSplitState)`,
    });
  }
  return violations;
}

// Rule 2: brand values written in a Vídeo's code. Scans `<srcRoot>/videos/` only.
export function checkBrandValues(srcRoot) {
  const violations = [];
  for (const absolute of collect(path.join(srcRoot, 'videos'), VIDEO_FILE)) {
    const file = relativeTo(srcRoot, absolute);
    withoutComments(readLines(absolute)).forEach((code, index) => {
      for (const [hex] of code.matchAll(HEX_COLOR)) {
        violations.push({ file, line: index + 1, reason: `hex color ${hex}; take the color from the Kit (kit.cores)` });
      }
      if (STRING_FONT_FAMILY.test(code)) {
        violations.push({
          file,
          line: index + 1,
          reason: 'fontFamily set to a string; take the font from the Kit (fontStyle(kit.tipografia.*))',
        });
      }
    });
  }
  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const srcRoot = path.join(estudioRoot, 'src');
  const violations = [...checkSplitLayouts(srcRoot), ...checkBrandValues(srcRoot)];
  for (const { file, line, reason } of violations) console.error(`src/${file}:${line}: ${reason}`);
  if (violations.length > 0) process.exit(1);
  console.log('guard: ok');
}
