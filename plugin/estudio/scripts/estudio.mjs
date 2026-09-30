#!/usr/bin/env node
// WHAT  The Estúdio's deterministic CLI: JSON out on stdout, one subcommand per job.
// WHY   Deterministic logic (state, scaffold, later QC and Pré-corte) lives behind one tested
//       command so skills read facts instead of re-deriving them, and regressions are caught
//       without running a model.
// WHEN  Skills run it at every session start (`estado`) and when the Criadora accepts turning
//       a folder into an Estúdio (`criar`).
// HOW   node "<plugin root>/scripts/estudio.mjs" estado "<folder>"
//       node "<plugin root>/scripts/estudio.mjs" criar  "<folder>"
//       Always quote the folder: the Criadora's paths carry spaces and accents.
//       Exit 0 with a JSON report; exit 2 with {"error": ...} on a usage error.
import fs from 'node:fs';
import path from 'node:path';
import { criar } from './lib/criar.mjs';
import { estado } from './lib/estado.mjs';

const COMMANDS = { estado, criar };

function usageError(error) {
  process.stdout.write(`${JSON.stringify({ error })}\n`);
  process.exit(2);
}

const [command, folder] = process.argv.slice(2);
if (!COMMANDS[command] || !folder) usageError(`usage: estudio.mjs <${Object.keys(COMMANDS).join('|')}> "<folder>"`);
const target = path.resolve(folder);
if (!fs.statSync(target, { throwIfNoEntry: false })?.isDirectory()) usageError(`not a folder: ${target}`);
process.stdout.write(`${JSON.stringify(COMMANDS[command](target), null, 2)}\n`);
