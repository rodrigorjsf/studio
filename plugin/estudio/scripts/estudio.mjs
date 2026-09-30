#!/usr/bin/env node
// WHAT  The Estúdio's deterministic CLI: JSON out on stdout, one subcommand per job.
// WHY   Deterministic logic (state, scaffold, Pré-corte, technical QC) lives behind one tested
//       command so skills read facts instead of re-deriving them, and regressions are caught
//       without running a model.
// WHEN  Skills run it at every session start (`estado`), when the Criadora accepts turning
//       a folder into an Estúdio (`criar`), and in the Projeto Grilling (`novo-projeto`,
//       then `aprovar-kit` once she approves the Kit de marca), and when she changes an
//       approved Kit (`editar-kit`) or opts an existing Vídeo into it (`atualizar-kit-video`);
//       when a recording starts a Vídeo (`novo-video`), as the Diretor records its Nível, Status,
//       Gate and counters (`registrar-video`), when the Assistente de edição has measured the
//       face on every frame (`zona-do-rosto`), when the Diretor checks whether a recording looks
//       untrimmed (`pausas`), when the Criadora approved the cuts of a Pré-corte (`precorte`), when
//       the Plano and its Quadros de estilo are checked (`plano`) and when she approves them at
//       their Gate (`aprovar-plano`); when she links Páginas Notion to a Projeto or Vídeo
//       (`vincular-notion`), the Diretor records the Resumo Notion it read from them
//       (`resumo-notion`), and before the Plano checks whether a page changed (`conferir-notion`);
//       when the Motion designer builds a version of the edit (`nova-versao`), her review of it
//       opens (`abrir-revisao`) and she decides on it (`decidir-revisao`); when the QC técnico holds
//       a render against the Master (`qc`); when the Entrega is rendered and judged (`entregar`);
//       and in Nível 2, when she approves the credit cost (`aprovar-creditos`) and before each
//       Higgsfield generation is paid (`gastar-creditos`), and, only on her explicit request, when
//       she approves a Higgsedit montage's cost (`aprovar-higgsedit`) and before each paid Higgsedit
//       run (`gastar-higgsedit`).
// HOW   node "<plugin root>/scripts/estudio.mjs" estado "<folder>"
//       node "<plugin root>/scripts/estudio.mjs" criar  "<folder>"
//       node "<plugin root>/scripts/estudio.mjs" novo-projeto "<folder>" "<projeto>"
//       node "<plugin root>/scripts/estudio.mjs" aprovar-kit  "<folder>" "<projeto>"
//       node "<plugin root>/scripts/estudio.mjs" editar-kit   "<folder>" "<projeto>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" atualizar-kit-video "<folder>" "<projeto>" "<vídeo>"
//       node "<plugin root>/scripts/estudio.mjs" novo-video "<folder>" "<projeto>" "<vídeo>" "<gravação>"
//       node "<plugin root>/scripts/estudio.mjs" registrar-video "<folder>" "<projeto>" "<vídeo>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" zona-do-rosto "<folder>" "<projeto>" "<vídeo>"
//       node "<plugin root>/scripts/estudio.mjs" plano "<folder>" "<projeto>" "<vídeo>"
//       node "<plugin root>/scripts/estudio.mjs" aprovar-plano "<folder>" "<projeto>" "<vídeo>" "<plano|quadros|plano-e-quadros>"
//       node "<plugin root>/scripts/estudio.mjs" vincular-notion "<folder>" "<projeto>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" resumo-notion "<folder>" "<projeto>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" conferir-notion "<folder>" "<projeto>" "<vídeo>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" pausas "<folder>" "<projeto>" "<vídeo>" "<ffprobe>"
//       node "<plugin root>/scripts/estudio.mjs" precorte "<folder>" "<projeto>" "<vídeo>" '<json>' "<ffmpeg>" "<ffprobe>"
//       node "<plugin root>/scripts/estudio.mjs" nova-versao "<folder>" "<projeto>" "<vídeo>"
//       node "<plugin root>/scripts/estudio.mjs" abrir-revisao "<folder>" "<projeto>" "<vídeo>"
//       node "<plugin root>/scripts/estudio.mjs" decidir-revisao "<folder>" "<projeto>" "<vídeo>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" entregar "<folder>" "<projeto>" "<vídeo>" "<ffmpeg>" "<ffprobe>"
//       node "<plugin root>/scripts/estudio.mjs" qc "<folder>" "<projeto>" "<vídeo>" "<render>" "<ffmpeg>" "<ffprobe>"
//       node "<plugin root>/scripts/estudio.mjs" aprovar-creditos "<folder>" "<projeto>" "<vídeo>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" gastar-creditos "<folder>" "<projeto>" "<vídeo>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" aprovar-higgsedit "<folder>" "<projeto>" "<vídeo>" '<json>'
//       node "<plugin root>/scripts/estudio.mjs" gastar-higgsedit "<folder>" "<projeto>" "<vídeo>" '<json>'
//       Always quote every argument: the Criadora's paths and names carry spaces and accents.
//       Exit 0 with a JSON report; exit 2 with {"error": ...} on a usage error.
import fs from 'node:fs';
import path from 'node:path';
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
import { abrirRevisao, decidirRevisao, novaVersao } from './lib/revisao.mjs';
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
  'vincular-notion': { run: vincularNotion, args: ['"<projeto>"', "'<json>'"] },
  'resumo-notion': { run: resumoNotion, args: ['"<projeto>"', "'<json>'"] },
  'conferir-notion': { run: conferirNotion, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  pausas: { run: pausas, args: ['"<projeto>"', '"<vídeo>"', '"<ffprobe>"'] },
  precorte: { run: precorte, args: ['"<projeto>"', '"<vídeo>"', "'<json>'", '"<ffmpeg>"', '"<ffprobe>"'] },
  'nova-versao': { run: novaVersao, args: ['"<projeto>"', '"<vídeo>"'] },
  'abrir-revisao': { run: abrirRevisao, args: ['"<projeto>"', '"<vídeo>"'] },
  'decidir-revisao': { run: decidirRevisao, args: ['"<projeto>"', '"<vídeo>"', "'<json>'"] },
  entregar: { run: entregar, args: ['"<projeto>"', '"<vídeo>"', '"<ffmpeg>"', '"<ffprobe>"'] },
  qc: { run: qc, args: ['"<projeto>"', '"<vídeo>"', '"<render>"', '"<ffmpeg>"', '"<ffprobe>"'] },
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
