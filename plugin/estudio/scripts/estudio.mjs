#!/usr/bin/env node
// WHAT  The Estúdio's deterministic CLI: JSON out on stdout, one subcommand per job.
// WHY   Deterministic logic (state, scaffold, later QC and Pré-corte) lives behind one tested
//       command so skills read facts instead of re-deriving them, and regressions are caught
//       without running a model.
// WHEN  Skills run it at every session start (`estado`), when the Criadora accepts turning
//       a folder into an Estúdio (`criar`), and in the Projeto Grilling (`novo-projeto`,
//       then `aprovar-kit` once she approves the Kit de marca), and when she changes an
//       approved Kit (`editar-kit`) or opts an existing Vídeo into it (`atualizar-kit-video`).
// HOW   node "<plugin root>/scripts/estudio.mjs" estado "<folder>"
//       node "<plugin root>/scripts/estudio.mjs" criar  "<folder>"
//       node "<plugin root>/scripts/estudio.mjs" novo-projeto "<folder>" "<projeto>"
//       node "<plugin root>/scripts/estudio.mjs" aprovar-kit  "<folder>" "<projeto>"
//       node "<plugin root>/scripts/estudio.mjs" editar-kit   "<folder>" "<projeto>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" atualizar-kit-video "<folder>" "<projeto>" "<vídeo>"
//       Always quote every argument: the Criadora's paths and names carry spaces and accents.
//       Exit 0 with a JSON report; exit 2 with {"error": ...} on a usage error.
import fs from 'node:fs';
import path from 'node:path';
import { criar } from './lib/criar.mjs';
import { estado } from './lib/estado.mjs';
import { atualizarKitVideo, editarKit } from './lib/editar.mjs';
import { aprovarKit, novoProjeto } from './lib/projeto.mjs';

// Each subcommand with the arguments it takes after the Estúdio folder.
const COMMANDS = {
  estado: { run: estado, args: [] },
  criar: { run: criar, args: [] },
  'novo-projeto': { run: novoProjeto, args: ['"<projeto>"'] },
  'aprovar-kit': { run: aprovarKit, args: ['"<projeto>"'] },
  'editar-kit': { run: editarKit, args: ['"<projeto>"', "'<json>'"] },
  'atualizar-kit-video': { run: atualizarKitVideo, args: ['"<projeto>"', '"<vídeo>"'] },
};

function usageError(error) {
  process.stdout.write(`${JSON.stringify({ error })}\n`);
  process.exit(2);
}

const usage = Object.entries(COMMANDS).map(([name, { args }]) => [name, '"<folder>"', ...args].join(' ')).join(' | ');
const [command, folder, ...args] = process.argv.slice(2);
const entry = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : null;
if (!entry || !folder || args.length !== entry.args.length) usageError(`usage: estudio.mjs ${usage}`);
const target = path.resolve(folder);
if (!fs.statSync(target, { throwIfNoEntry: false })?.isDirectory()) usageError(`not a folder: ${target}`);
process.stdout.write(`${JSON.stringify(entry.run(target, ...args), null, 2)}\n`);
