// WHAT  The split-layout rule over the Remotion template this repo ships.
// WHY   The rule has one source: the guard inside the template (`scripts/guard.mjs`), which every
//       Estúdio runs from its own `npm run typecheck`. This wrapper runs the same rule on
//       plugin/estudio/template/src for the repo's typecheck.
// HOW   node scripts/check-split-layouts.mjs   (exits 1 on a hand-made split)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSplitLayouts } from '../plugin/estudio/template/scripts/guard.mjs';

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'plugin', 'estudio', 'template', 'src');
const violations = checkSplitLayouts(srcRoot);

for (const { file, line, reason } of violations) {
  console.error(`plugin/estudio/template/src/${file}:${line}: ${reason}`);
}
if (violations.length > 0) process.exit(1);
console.log('split layouts: ok');
