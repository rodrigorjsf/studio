// `novo-video`: takes one recording of the Criadora into a new Vídeo of an approved Projeto.
// The recording is copied, byte for byte, into the Vídeo's `original/` folder (the Original):
// her own file is never moved or changed, and the copy is never touched again. One recording
// is one Vídeo; joining two recordings is never done here.
import fs from 'node:fs';
import path from 'node:path';
import { PLACEHOLDER } from './briefing.mjs';
import { COUNTERS, STATUS_NAMES, estado, nfc, subfolders } from './estado.mjs';
import { parseFrontmatter, replaceFrontmatter } from './frontmatter.mjs';
import { findProjeto, nameProblem } from './projeto.mjs';
import { measureZone } from './ingest.mjs';
import {
  AMOSTRAS_ROSTO, FRAMES_ROSTO, FRAMES_VISAO_GERAL, KIT, MEDICOES_ROSTO, ORIGINAL, PRINTS, PROJETOS, VIDEO_DOC, VIDEOS, ZONA_DO_ROSTO,
} from './layout.mjs';

// The Vídeo briefing asks only what a Kit de marca never answers — these five, every time —
// plus the Kit's own gaps (see kitGaps). Formato, style, captions, music and the rest come
// from the Kit and are not asked again. Each answer but the Nível (a frontmatter field) is a
// pt-BR section of the Vídeo document; the Prints section is filled after the ingest, from
// what she says in the recording.
const QUESTIONS = ['objetivo', 'chamada-para-acao', 'momentos-chave', 'o-que-muda-do-kit', 'nivel'];
const SECTIONS = ['Objetivo', 'Chamada para ação', 'Momentos-chave', 'O que muda do Kit', 'Prints que ajudariam'];

// The Kit's text fields left empty in the Projeto Grilling ("sem preferência" then): the only
// Kit topics the Vídeo briefing may ask again, as `field.path` names.
function kitGaps(value, where = '') {
  if (value === '') return [where];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => kitGaps(child, where ? `${where}.${key}` : key));
}

// The Vídeo document: its frontmatter is the Vídeo's record (Status, Nível, cost and the
// metric counters), its pt-BR body the short briefing she answers.
function videoDocument(nome, original, iniciadoEm) {
  const fields = [
    ['status', 'Briefing'],
    ['nivel', ''],
    ['rodada', ''],
    ['gate', ''],
    ['original', original],
    ['master', original],
    ['creditosEstimados', ''],
    ['creditosGastos', 0],
    ['perguntas', 0],
    ['gates', 0],
    ['aprovacoesAutomaticas', 0],
    ['iniciadoEm', iniciadoEm],
    ['entregueEm', ''],
  ];
  const frontmatter = fields.map(([key, value]) => (value === '' ? `${key}:` : `${key}: ${value}`)).join('\n');
  const sections = SECTIONS.map((title) => `## ${title}\n\n${PLACEHOLDER}\n`).join('\n');
  return `---\n${frontmatter}\n---\n# ${nome}\n\n${sections}`;
}

export function novoVideo(folder, projetoNome, videoNome, recording) {
  const state = estado(folder);
  const projeto = state.isEstudio && state.projetos?.find((p) => p.id === nfc(projetoNome));
  if (!projeto) return { created: false, reason: 'unknown-projeto' };
  if (projeto.kit !== 'ok') return { created: false, reason: 'kit-not-approved', projeto: projeto.id, kit: projeto.kit };
  const problem = nameProblem(videoNome);
  if (problem) return { created: false, reason: 'invalid-name', message: problem };
  const source = path.resolve(recording);
  if (!fs.statSync(source, { throwIfNoEntry: false })?.isFile()) return { created: false, reason: 'recording-not-found', recording: source };

  const video = nfc(videoNome);
  // A Vídeo that exists keeps its one Original: a second recording is a second Vídeo.
  if (projeto.videos.some((v) => v.id === video)) return { created: false, reason: 'already-exists', projeto: projeto.id, video };
  const projetoDir = path.join(folder, PROJETOS, findProjeto(folder, projetoNome));
  const dir = path.join(projetoDir, VIDEOS, video);
  const original = `${ORIGINAL}/${nfc(path.basename(source))}`;
  fs.mkdirSync(path.join(dir, ORIGINAL), { recursive: true });
  // Created up front, so the ingest can save the sampler's JSON next to its frames.
  for (const folder of [PRINTS, FRAMES_VISAO_GERAL, FRAMES_ROSTO]) fs.mkdirSync(path.join(dir, ...folder.split('/')), { recursive: true });
  fs.copyFileSync(source, path.join(dir, ...original.split('/')), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(dir, VIDEO_DOC), videoDocument(video, original, new Date().toISOString()));
  const kit = JSON.parse(fs.readFileSync(path.join(projetoDir, KIT), 'utf8'));
  return {
    created: true,
    projeto: projeto.id,
    video,
    original,
    path: `${PROJETOS}/${projeto.id}/${VIDEOS}/${video}`,
    briefing: { perguntas: QUESTIONS, lacunasDoKit: kitGaps(kit) },
  };
}

// What the Diretor records on a Vídeo as it moves: the Nível she chose, a new Status, and
// what to add to the metric counters. Anything else in the record is not hers to change here.
const RECORDABLE = ['nivel', 'status', 'somar'];
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function recordProblem(record) {
  if (!isObject(record)) return 'must be a JSON object with nivel, status or somar';
  const other = Object.keys(record).find((key) => !RECORDABLE.includes(key));
  if (other) return `${other} cannot be recorded here (${RECORDABLE.join(', ')})`;
  if ('nivel' in record && ![1, 2].includes(record.nivel)) return 'nivel must be 1 or 2';
  if ('status' in record && !STATUS_NAMES.includes(record.status)) return `status must be one of: ${STATUS_NAMES.join(', ')}`;
  if ('somar' in record) {
    if (!isObject(record.somar)) return 'somar must be an object of counters';
    for (const [key, value] of Object.entries(record.somar)) {
      if (!COUNTERS.includes(key)) return `somar.${key} is not a counter (${COUNTERS.join(', ')})`;
      if (!(Number.isInteger(value) && value >= 0)) return `somar.${key} must be a whole number, 0 or more`;
    }
  }
  return null;
}

// The Vídeo `videoNome` of the Projeto `projetoNome`, with its folder on disk (a Mac may
// store names decomposed), or the refusal to return.
function findVideo(folder, projetoNome, videoNome) {
  const state = estado(folder);
  const projeto = state.isEstudio && state.projetos?.find((p) => p.id === nfc(projetoNome));
  if (!projeto) return { refusal: { reason: 'unknown-projeto' } };
  const videosDir = path.join(folder, PROJETOS, findProjeto(folder, projetoNome), VIDEOS);
  const videoFolder = subfolders(videosDir).find((name) => nfc(name) === nfc(videoNome));
  if (!videoFolder || !fs.existsSync(path.join(videosDir, videoFolder, VIDEO_DOC))) {
    return { refusal: { reason: 'unknown-video', projeto: projeto.id } };
  }
  return { projeto: projeto.id, video: nfc(videoFolder), dir: path.join(videosDir, videoFolder) };
}

export function registrarVideo(folder, projetoNome, videoNome, recordText) {
  let record;
  try {
    record = JSON.parse(recordText);
  } catch (err) {
    return { recorded: false, reason: 'invalid-record', message: `not valid JSON (${err.message})` };
  }
  const problem = recordProblem(record);
  if (problem) return { recorded: false, reason: 'invalid-record', message: problem };
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { recorded: false, ...refusal };

  const doc = path.join(dir, VIDEO_DOC);
  const text = fs.readFileSync(doc, 'utf8');
  let data;
  try {
    data = parseFrontmatter(text);
  } catch (err) {
    return { recorded: false, reason: 'invalid-document', projeto, video, message: err.message };
  }
  if ('nivel' in record) data.nivel = record.nivel;
  if ('status' in record) data.status = record.status;
  for (const [key, value] of Object.entries(record.somar ?? {})) data[key] = (data[key] ?? 0) + value;
  fs.writeFileSync(doc, replaceFrontmatter(text, data));
  const counters = Object.fromEntries(COUNTERS.map((key) => [key, data[key] ?? 0]));
  return { recorded: true, projeto, video, status: data.status, nivel: data.nivel, ...counters };
}

// `zona-do-rosto`: joins the Assistente de edição's per-frame face measurements into the
// Vídeo's Zona do rosto (`zona-do-rosto.json`), refusing any that miss part of the clip.
export function zonaDoRosto(folder, projetoNome, videoNome) {
  const { dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { measured: false, ...refusal };
  const read = (rel) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8'));
    } catch {
      return undefined;
    }
  };
  const samples = read(AMOSTRAS_ROSTO);
  if (samples === undefined) return { measured: false, reason: 'no-samples' };
  const result = measureZone(samples, read(MEDICOES_ROSTO));
  if (result.measured) fs.writeFileSync(path.join(dir, ZONA_DO_ROSTO), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
