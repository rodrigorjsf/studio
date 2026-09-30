// `estado`: reads an Estúdio folder, validates every document it knows, and reports each
// Projeto's and Vídeo's Status, what waits for the Criadora, and the next step.
import fs from 'node:fs';
import path from 'node:path';
import { unansweredSections } from './briefing.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { transcriptProblem, zonaProblem } from './ingest.mjs';
import { validateKit } from './kit.mjs';
import { readNotion } from './notion.mjs';
import { readPerfil } from './perfil.mjs';
import {
  DECISAO, KIT, MARKER, PALAVRAS, PERFIL, PLANO, PROJETO_DOC, PROJETOS, REVISAO, SCHEMA_VERSION, VIDEO_DOC, VIDEO_KIT, VIDEOS, ZONA_DO_ROSTO,
} from './layout.mjs';

// Files an OS or Claude drops into any folder; they do not make a folder "not empty".
const IGNORABLE = new Set(['Thumbs.db', 'desktop.ini']);
const isIgnorable = (name) => name.startsWith('.') || IGNORABLE.has(name);

// The Esteira's Status values, in order: whose turn each one is, and whether the Vídeo is
// finished (delivered or archived). Briefing and Revisão are the Criadora's turn by nature;
// in any other Status a Vídeo waits for her only while its document says `gate: aberto`
// (the Diretor opened a Gate — Plano, Quadros de estilo, credits — and awaits her decision).
const STATUSES = new Map([
  ['Briefing', { waitsForCriadora: true, finished: false }],
  ['Planejamento', { waitsForCriadora: false, finished: false }],
  ['Construção', { waitsForCriadora: false, finished: false }],
  ['QC interno', { waitsForCriadora: false, finished: false }],
  ['Revisão', { waitsForCriadora: true, finished: false }],
  ['Ajustes', { waitsForCriadora: false, finished: false }],
  ['Aprovado', { waitsForCriadora: false, finished: false }],
  ['Entregue', { waitsForCriadora: false, finished: true }],
  ['Arquivado', { waitsForCriadora: false, finished: true }],
]);
export const NIVEIS = new Set([1, 2]);
// Her three decisions on a version of the edit, at the review Gate.
export const DECISIONS = ['aprovar', 'aprovar-com-ajustes', 'pedir-mudancas'];
// The Vídeo document's metric counters: questions asked, Gates opened, Gates Autonomia approved.
export const COUNTERS = ['perguntas', 'gates', 'aprovacoesAutomaticas'];
export const STATUS_NAMES = [...STATUSES.keys()];
export const wholeCount = (v) => Number.isInteger(v) && v >= 0;
const credits = (v) => typeof v === 'number' && v >= 0;
const isoDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// The Vídeo document's record fields other than Status, Rodada and Nível, each checked only
// when present and not empty (documents from before ticket #9 have none of them).
const VIDEO_RECORD = [
  ...COUNTERS.map((key) => [key, wholeCount, 'must be a whole number, 0 or more']),
  ['creditosEstimados', credits, 'must be a number of credits, 0 or more'],
  ['creditosGastos', credits, 'must be a number of credits, 0 or more'],
  ['iniciadoEm', isoDate, 'must be a date (ISO)'],
  ['entregueEm', isoDate, 'must be a date (ISO)'],
];
// Delivered or archived: the Vídeo's work is done.
export const isFinished = (status) => STATUSES.get(status)?.finished === true;

// Mac file systems hand back decomposed accents (NFD); report every name composed (NFC)
// so "Lançamento" is the same string on Mac, Windows and Linux.
export const nfc = (name) => name.normalize('NFC');
const byName = (a, b) => a.localeCompare(b, 'pt-BR');

// A folder's subfolders (Projetos, Vídeos), hidden and system ones left out, in pt-BR order.
export function subfolders(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !isIgnorable(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => byName(nfc(a), nfc(b)));
}

// The versions of a Vídeo's edit, `revisao/v01`, `revisao/v02`…, oldest first.
const VERSION = /^v(\d{2,})$/;
export function versions(videoDir) {
  return subfolders(path.join(videoDir, REVISAO))
    .filter((name) => VERSION.test(name))
    .sort((a, b) => Number(VERSION.exec(a)[1]) - Number(VERSION.exec(b)[1]));
}
export const versionNumber = (name) => Number(VERSION.exec(name)[1]);
export const versionName = (n) => `v${String(n).padStart(2, '0')}`;
// The file holding her decision on the version `name` (absent while her review is pending).
export const decisionFile = (videoDir, name) => path.join(videoDir, REVISAO, name, DECISAO);

export function estado(folder) {
  const isEmpty = fs.readdirSync(folder).filter((name) => !isIgnorable(name)).length === 0;
  const isEstudio = fs.existsSync(path.join(folder, MARKER));
  if (!isEstudio) return { folder, isEstudio, isEmpty, errors: [], nextStep: { action: 'criar-estudio' } };

  const errors = [];
  const rel = (file) => nfc(path.relative(folder, file).split(path.sep).join('/'));
  const fail = (file, message) => errors.push({ file: rel(file), message });
  // The Página Notion links and the Resumo Notion of a Projeto or Vídeo folder, validated.
  const notion = (dir) => {
    const { problems, state } = readNotion(dir);
    problems.forEach((p) => fail(p.file, p.message));
    return state;
  };

  const readJson = (file) => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      fail(file, `not valid JSON (${err.message})`);
      return null;
    }
  };
  const readDoc = (file) => {
    try {
      return parseFrontmatter(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      fail(file, err.message);
      return null;
    }
  };

  const markerFile = path.join(folder, MARKER);
  const marker = readJson(markerFile);
  if (marker && marker.schemaVersion !== SCHEMA_VERSION) {
    fail(markerFile, `schemaVersion ${JSON.stringify(marker.schemaVersion)} is not supported (expected ${SCHEMA_VERSION})`);
  }

  const perfilFile = path.join(folder, PERFIL);
  let perfil = { present: fs.existsSync(perfilFile) };
  const perfilData = perfil.present ? readDoc(perfilFile) : null;
  if (perfilData) {
    const { messages, fields } = readPerfil(perfilData);
    messages.forEach((message) => fail(perfilFile, message));
    perfil = { ...perfil, ...fields };
  }

  const projetos = subfolders(path.join(folder, PROJETOS)).map((name) => {
    const dir = path.join(folder, PROJETOS, name);
    const briefing = path.join(dir, PROJETO_DOC);
    // `incompleto` while a section still waits for her answer: the Grilling was interrupted.
    let briefingState = 'incompleto';
    if (fs.existsSync(briefing)) {
      if (readDoc(briefing) && unansweredSections(fs.readFileSync(briefing, 'utf8')) === 0) briefingState = 'completo';
    } else fail(briefing, 'missing: every Projeto needs its briefing document');

    // The Kit's state: `pendente` (no kit.json yet), `invalido`, `aguardando-aprovacao`
    // (valid, its approval Gate still open) or `ok` (approved: the Projeto is usable).
    const kitFile = path.join(dir, KIT);
    let kit = 'pendente';
    if (fs.existsSync(kitFile)) {
      const data = readJson(kitFile);
      const problems = data === null ? null : validateKit(data, dir);
      problems?.forEach((message) => fail(kitFile, message));
      if (problems === null || problems.length > 0) kit = 'invalido';
      else kit = data.aprovadoEm ? 'ok' : 'aguardando-aprovacao';
    }

    const videos = subfolders(path.join(dir, VIDEOS)).map((videoName) => {
      const doc = path.join(dir, VIDEOS, videoName, VIDEO_DOC);
      const video = {
        id: nfc(videoName), status: null, rodada: null, nivel: null, briefing: 'completo',
        ingest: { transcricao: false, zonaDoRosto: false }, plano: 'ausente', quadros: 'ausentes', versao: null,
        notion: notion(path.join(dir, VIDEOS, videoName)), waitingForCriadora: false,
      };
      // The ingest, as far as it went: a Vídeo interrupted midway resumes from what is missing.
      const videoFile = (rel) => path.join(dir, VIDEOS, videoName, ...rel.split('/'));
      const ingested = (rel, problemOf) => {
        const data = fs.existsSync(videoFile(rel)) ? readJson(videoFile(rel)) : null;
        const problem = data === null ? 'absent' : problemOf(data);
        if (problem && problem !== 'absent') fail(videoFile(rel), problem);
        return !problem;
      };
      video.ingest.transcricao = ingested(PALAVRAS, transcriptProblem);
      video.ingest.zonaDoRosto = ingested(ZONA_DO_ROSTO, zonaProblem);
      // The Plano and its Quadros de estilo: `rascunho` until `aprovar-plano` stamps them.
      // Whether they break a rule is `plano`'s to check, against the transcript and the face.
      const planoFile = videoFile(PLANO);
      const planoData = fs.existsSync(planoFile) ? readJson(planoFile) : null;
      if (planoData !== null && (typeof planoData !== 'object' || Array.isArray(planoData))) fail(planoFile, 'must be a JSON object');
      else if (planoData !== null) {
        video.plano = planoData.aprovadoEm ? 'aprovado' : 'rascunho';
        if (planoData.quadrosAprovadosEm) video.quadros = 'aprovados';
        else if (Array.isArray(planoData.quadros) && planoData.quadros.length > 0) video.quadros = 'rascunho';
      }
      // The latest version of the edit and her decision on it (null while her review is pending).
      const latest = versions(path.join(dir, VIDEOS, videoName)).at(-1);
      if (latest) {
        const file = decisionFile(path.join(dir, VIDEOS, videoName), latest);
        const decided = fs.existsSync(file) ? readJson(file) : null;
        if (decided !== null && !DECISIONS.includes(decided?.decisao)) fail(file, `decisao must be one of: ${DECISIONS.join(', ')}`);
        video.versao = { nome: latest, decisao: DECISIONS.includes(decided?.decisao) ? decided.decisao : null };
      }
      // The Vídeo's own Kit (its Kit snapshot), when it has one, is held to the same schema.
      const ownKit = path.join(dir, VIDEOS, videoName, VIDEO_KIT);
      const ownKitData = fs.existsSync(ownKit) ? readJson(ownKit) : null;
      if (ownKitData !== null) validateKit(ownKitData, dir).forEach((message) => fail(ownKit, message));
      if (!fs.existsSync(doc)) {
        fail(doc, 'missing: every Vídeo needs its document');
        return video;
      }
      const data = readDoc(doc);
      if (!data) return video;
      // `incompleto` while a section of the Vídeo's short briefing still waits for her answer.
      if (unansweredSections(fs.readFileSync(doc, 'utf8')) > 0) video.briefing = 'incompleto';
      const status = typeof data.status === 'string' ? nfc(data.status) : data.status;
      if (!STATUSES.has(status)) {
        fail(doc, `status ${JSON.stringify(data.status ?? null)} is not one of: ${[...STATUSES.keys()].join(', ')}`);
      } else {
        video.status = status;
        const { waitsForCriadora, finished } = STATUSES.get(status);
        video.waitingForCriadora = waitsForCriadora || (!finished && data.gate === 'aberto');
      }
      if (data.rodada != null && !(Number.isInteger(data.rodada) && data.rodada >= 0)) {
        fail(doc, `rodada ${JSON.stringify(data.rodada)} must be a whole number`);
      } else video.rodada = data.rodada ?? null;
      if (data.nivel != null && !NIVEIS.has(data.nivel)) {
        fail(doc, `nivel ${JSON.stringify(data.nivel)} must be 1 or 2`);
      } else video.nivel = data.nivel ?? null;
      for (const [key, check, problem] of VIDEO_RECORD) {
        if (data[key] != null && !check(data[key])) fail(doc, `${key} ${JSON.stringify(data[key])} ${problem}`);
      }
      return video;
    });
    return { id: nfc(name), briefing: briefingState, kit, notion: notion(dir), videos };
  });

  const waiting = projetos.flatMap((projeto) => projeto.videos
    .filter((video) => video.waitingForCriadora)
    .map((video) => ({ projeto: projeto.id, video: video.id, status: video.status })));

  return { folder, isEstudio, isEmpty, errors, perfil, projetos, waiting, nextStep: nextStep({ errors, perfil, projetos, waiting }) };
}

// One next step, in the order the Esteira needs them: a broken document first, then the
// Perfil, a first Projeto, an unfinished Grilling (briefing or Kit), a Kit awaiting her approval, a Vídeo waiting for her, a Vídeo in progress,
// and finally a new Vídeo.
function nextStep({ errors, perfil, projetos, waiting }) {
  if (errors.length > 0) return { action: 'corrigir-erros' };
  if (!perfil.present) return { action: 'perfil' };
  if (projetos.length === 0) return { action: 'novo-projeto' };
  const unfinished = projetos.find((projeto) => projeto.kit === 'pendente' || projeto.briefing === 'incompleto');
  if (unfinished) return { action: 'concluir-projeto', projeto: unfinished.id };
  const unapproved = projetos.find((projeto) => projeto.kit === 'aguardando-aprovacao');
  if (unapproved) return { action: 'aprovar-kit', projeto: unapproved.id };
  if (waiting.length > 0) return { action: 'continuar-video', ...waiting[0] };
  for (const projeto of projetos) {
    const video = projeto.videos.find((v) => v.status && !STATUSES.get(v.status).finished);
    if (video) return { action: 'continuar-video', projeto: projeto.id, video: video.id, status: video.status };
  }
  return { action: 'novo-video' };
}
