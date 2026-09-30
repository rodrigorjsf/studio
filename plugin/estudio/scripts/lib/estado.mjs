// `estado`: reads an Estúdio folder, validates every document it knows, and reports each
// Projeto's and Vídeo's Status, what waits for the Criadora, and the next step.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';
import { KIT, MARKER, PERFIL, PROJETO_DOC, PROJETOS, SCHEMA_VERSION, VIDEO_DOC, VIDEOS } from './layout.mjs';

// Files an OS or Claude drops into any folder; they do not make a folder "not empty".
const IGNORABLE = new Set(['Thumbs.db', 'desktop.ini']);
const isIgnorable = (name) => name.startsWith('.') || IGNORABLE.has(name);

// The Esteira's Status values (CONTEXT.md) and whose turn each one is. A Vídeo whose
// document says `gate: aberto` waits for the Criadora whatever its Status (a Gate is open).
const STATUS_WAITS_FOR_CRIADORA = new Map([
  ['Briefing', true],
  ['Planejamento', false],
  ['Construção', false],
  ['QC interno', false],
  ['Revisão', true],
  ['Ajustes', false],
  ['Aprovado', false],
  ['Entregue', true],
  ['Arquivado', false],
]);
const NIVEIS = new Set([1, 2]);

// Mac file systems hand back decomposed accents (NFD); report every name composed (NFC)
// so "Lançamento" is the same string on Mac, Windows and Linux.
const nfc = (name) => name.normalize('NFC');
const byName = (a, b) => a.localeCompare(b, 'pt-BR');

function subfolders(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !isIgnorable(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => byName(nfc(a), nfc(b)));
}

export function estado(folder) {
  const isEmpty = fs.readdirSync(folder).filter((name) => !isIgnorable(name)).length === 0;
  const isEstudio = fs.existsSync(path.join(folder, MARKER));
  if (!isEstudio) return { folder, isEstudio, isEmpty, errors: [], nextStep: { action: 'criar-estudio' } };

  const errors = [];
  const rel = (file) => nfc(path.relative(folder, file).split(path.sep).join('/'));
  const fail = (file, message) => errors.push({ file: rel(file), message });

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
  const perfil = { present: fs.existsSync(perfilFile) };
  if (perfil.present) readDoc(perfilFile);

  const projetos = subfolders(path.join(folder, PROJETOS)).map((name) => {
    const dir = path.join(folder, PROJETOS, name);
    const briefing = path.join(dir, PROJETO_DOC);
    if (fs.existsSync(briefing)) readDoc(briefing);
    else fail(briefing, 'missing: every Projeto needs its briefing document');

    const kitFile = path.join(dir, KIT);
    let kit = 'pendente';
    if (fs.existsSync(kitFile)) {
      const data = readJson(kitFile);
      if (data !== null && (typeof data !== 'object' || Array.isArray(data))) fail(kitFile, 'must be a JSON object');
      kit = 'ok';
    }

    const videos = subfolders(path.join(dir, VIDEOS)).map((videoName) => {
      const doc = path.join(dir, VIDEOS, videoName, VIDEO_DOC);
      const video = { id: nfc(videoName), status: null, rodada: null, nivel: null, waitingForCriadora: false };
      if (!fs.existsSync(doc)) {
        fail(doc, 'missing: every Vídeo needs its document');
        return video;
      }
      const data = readDoc(doc);
      if (!data) return video;
      const status = typeof data.status === 'string' ? nfc(data.status) : data.status;
      if (!STATUS_WAITS_FOR_CRIADORA.has(status)) {
        fail(doc, `status ${JSON.stringify(data.status ?? null)} is not one of: ${[...STATUS_WAITS_FOR_CRIADORA.keys()].join(', ')}`);
      } else {
        video.status = status;
        video.waitingForCriadora = STATUS_WAITS_FOR_CRIADORA.get(status) || data.gate === 'aberto';
      }
      if (data.rodada != null && !(Number.isInteger(data.rodada) && data.rodada >= 0)) {
        fail(doc, `rodada ${JSON.stringify(data.rodada)} must be a whole number`);
      } else video.rodada = data.rodada ?? null;
      if (data.nivel != null && !NIVEIS.has(data.nivel)) {
        fail(doc, `nivel ${JSON.stringify(data.nivel)} must be 1 or 2`);
      } else video.nivel = data.nivel ?? null;
      return video;
    });
    return { id: nfc(name), kit, videos };
  });

  const waiting = projetos.flatMap((projeto) => projeto.videos
    .filter((video) => video.waitingForCriadora)
    .map((video) => ({ projeto: projeto.id, video: video.id, status: video.status })));

  return { folder, isEstudio, isEmpty, errors, perfil, projetos, waiting, nextStep: nextStep({ errors, perfil, projetos, waiting }) };
}

// One next step, in the order the Esteira needs them: a broken document first, then the
// Perfil, a first Projeto, an unfinished Kit, a Vídeo waiting for her, a Vídeo in progress,
// and finally a new Vídeo.
function nextStep({ errors, perfil, projetos, waiting }) {
  if (errors.length > 0) return { action: 'corrigir-erros' };
  if (!perfil.present) return { action: 'perfil' };
  if (projetos.length === 0) return { action: 'novo-projeto' };
  const unfinished = projetos.find((projeto) => projeto.kit !== 'ok');
  if (unfinished) return { action: 'concluir-projeto', projeto: unfinished.id };
  if (waiting.length > 0) return { action: 'continuar-video', ...waiting[0] };
  for (const projeto of projetos) {
    const video = projeto.videos.find((v) => v.status !== 'Arquivado' && v.status !== 'Entregue');
    if (video) return { action: 'continuar-video', projeto: projeto.id, video: video.id, status: video.status };
  }
  return { action: 'novo-video' };
}
