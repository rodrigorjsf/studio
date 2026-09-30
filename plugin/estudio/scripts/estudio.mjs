#!/usr/bin/env node
// WHAT  The Estúdio's deterministic CLI: JSON out on stdout, one subcommand per job.
// WHY   Deterministic logic (state, scaffold, Pré-corte, technical QC) lives behind one tested
//       command so skills read facts instead of re-deriving them, and regressions are caught
//       without running a model.
// WHEN  Skills run it at every session start (`estado`) and at each step of the Esteira that
//       reads or writes a fact of the Estúdio folder. Which skill runs which subcommand is in
//       that skill's SKILL.md; the subcommands themselves are listed once, in COMMANDS below.
// HOW   node "<plugin root>/scripts/estudio.mjs" <command> "<folder>" [arguments…]
//       The arguments each command takes are listed once, in COMMANDS below; run it with no
//       arguments to print them all.
//       Always quote every argument: the Criadora's paths and names carry spaces and accents.
//       Exit 0 with a JSON report; exit 2 with {"error": ...} on a usage error.
import fs from 'node:fs';
import path from 'node:path';
import { arquivar } from './lib/arquivar.mjs';
import { aprovarAutomatico } from './lib/autonomia.mjs';
import { caderno } from './lib/caderno.mjs';
import { criar } from './lib/criar.mjs';
import {
  aprovarCreditos, aprovarHiggsedit, gastarCreditos, gastarHiggsedit,
} from './lib/creditos.mjs';
import { entregar } from './lib/entrega.mjs';
import { estado } from './lib/estado.mjs';
import { atualizarKitVideo, editarKit } from './lib/editar.mjs';
import { conferirNotion, resumoNotion, vincularNotion } from './lib/notion.mjs';
import { aprovarKit, novoProjeto } from './lib/projeto.mjs';
import { aprovarPlano, plano } from './lib/plano.mjs';
import { pausas, precorte } from './lib/precorte.mjs';
import { qc } from './lib/qc.mjs';
import { qcInterno } from './lib/qc-interno.mjs';
import { rascunhoIssue } from './lib/rascunho-issue.mjs';
import { abrirRevisao, decidirRevisao, novaVersao } from './lib/revisao.mjs';
import { textoDoPost } from './lib/texto-do-post.mjs';
import { novoVideo, registrarVideo, zonaDoRosto } from './lib/video.mjs';

// Each subcommand with the arguments it takes after the Estúdio folder.
const COMMANDS = {
  estado: { run: estado, args: [] },
  criar: { run: criar, args: [] },
  'novo-projeto': { run: novoProjeto, args: ['"<projeto>"'] },
  'aprovar-kit': { run: aprovarKit, args: ['"<projeto>"'] },
  'editar-kit': { run: editarKit, args: ['"<projeto>"', "'<json>'"] },
  'atualizar-kit-video': { run: atualizarKitVideo, args: ['"<projeto>"', '"<vídeo>"'] },
  'novo-video': { run: novoVideo, args: ['"<projeto>"', '"<vídeo>"', '"<gravação>"'] },
  'registrar-video': { run: registrarVideo, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  'zona-do-rosto': { run: zonaDoRosto, args: ['"<projeto>"', '"<vídeo>"'] },
  plano: { run: plano, args: ['"<projeto>"', '"<vídeo>"'] },
  'aprovar-plano': { run: aprovarPlano, args: ['"<projeto>"', '"<vídeo>"', '"<etapa>"'] },
  'aprovar-automatico': { run: aprovarAutomatico, args: ['"<projeto>"', '"<vídeo>"', '"<gate>"'] },
  'vincular-notion': { run: vincularNotion, args: ['"<projeto>"', "'<json>'"] },
  'resumo-notion': { run: resumoNotion, args: ['"<projeto>"', "'<json>'"] },
  'conferir-notion': { run: conferirNotion, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  pausas: { run: pausas, args: ['"<projeto>"', '"<vídeo>"', '"<ffprobe>"'] },
  precorte: { run: precorte, args: ['"<projeto>"', '"<vídeo>"', "'<json>'", '"<ffmpeg>"', '"<ffprobe>"'] },
  'nova-versao': { run: novaVersao, args: ['"<projeto>"', '"<vídeo>"'] },
  'abrir-revisao': { run: abrirRevisao, args: ['"<projeto>"', '"<vídeo>"'] },
  'decidir-revisao': { run: decidirRevisao, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  entregar: { run: entregar, args: ['"<projeto>"', '"<vídeo>"', '"<ffmpeg>"', '"<ffprobe>"'] },
  caderno: { run: caderno, args: ["'<json>'"] },
  'rascunho-issue': { run: rascunhoIssue, args: ["'<json>'"] },
  'texto-do-post': { run: textoDoPost, args: ['"<projeto>"', '"<vídeo>"'] },
  arquivar: { run: arquivar, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  qc: { run: qc, args: ['"<projeto>"', '"<vídeo>"', '"<render>"', '"<ffmpeg>"', '"<ffprobe>"'] },
  'qc-interno': { run: qcInterno, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  'aprovar-creditos': { run: aprovarCreditos, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  'gastar-creditos': { run: gastarCreditos, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  'aprovar-higgsedit': { run: aprovarHiggsedit, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  'gastar-higgsedit': { run: gastarHiggsedit, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
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
