// The Pré-corte: the optional stage that removes silences and fumbles from the
// Original to make a new Master; the Original is never touched. Off by default — a Criadora who trims her own videos is never
// second-guessed — so the studio only warns when a Master looks untrimmed (`pausas`), and cuts
// only what she approved (`precorte`).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { replaceFrontmatter } from './frontmatter.mjs';
import { transcriptProblem } from './ingest.mjs';
import {
  MASTER, PALAVRAS, PRECORTE_MAPA, TRANSCRICAO_ORIGINAL, TRANSCRIPT_MD, VIDEO_DOC,
} from './layout.mjs';
import { STATUS_NAMES } from './estado.mjs';
import { findVideo, readVideoRecord } from './video.mjs';
import { parseJson } from './valores.mjs';

// A silence at least this long (seconds) before the first word, between two words or after the
// last one is a long pause; breaths and the pauses of normal speech are shorter.
export const PAUSA_LONGA = 1.5;
// Long pauses adding up to this much (seconds) make a Master look untrimmed.
export const SEM_CORTE = 3;

const round = (v) => Math.round(v * 1000) / 1000;
const at = (dir, rel) => path.join(dir, ...rel.split('/'));

function readTranscript(dir) {
  try {
    const words = JSON.parse(fs.readFileSync(at(dir, PALAVRAS), 'utf8'));
    return transcriptProblem(words) ? null : words;
  } catch {
    return null;
  }
}

// The Vídeo document's record, or the refusal to return.
// `pausas`: the long pauses of the Master, from its word-timed transcript and its duration, and
// whether they add up to an untrimmed recording (`semCorte`), so the Diretor warns her and
// offers the Pré-corte.
export function pausas(folder, projetoNome, videoNome, ffprobe) {
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { analyzed: false, ...refusal };
  const words = readTranscript(dir);
  if (!words) return { analyzed: false, reason: 'no-transcript' };
  const doc = readVideoRecord({ dir, projeto, video });
  if (doc.refusal) return { analyzed: false, ...doc.refusal };
  const media = typeof doc.record.master === 'string' ? probe(ffprobe, at(dir, doc.record.master)) : null;
  if (!media) return { analyzed: false, reason: 'probe-failed', projeto, video };

  const edges = [0, ...words.flatMap((w) => [w.s, w.e]), media.duration];
  const found = Array.from({ length: words.length + 1 }, (_, i) => ({ inicio: edges[2 * i], fim: edges[2 * i + 1] }))
    .map(({ inicio, fim }) => ({ inicio: round(inicio), fim: round(fim), duracao: round(fim - inicio) }))
    .filter((pause) => pause.duracao >= PAUSA_LONGA);
  const totalPausas = round(found.reduce((sum, pause) => sum + pause.duracao, 0));
  return { analyzed: true, semCorte: totalPausas >= SEM_CORTE, pausas: found, totalPausas, limites: { pausaLonga: PAUSA_LONGA, semCorte: SEM_CORTE } };
}

// The Pré-corte is Esteira step 3, between the ingest and the Plano: only a Vídeo still before
// `Planejamento` may be cut. Once the Plano is timed on the Master, the Master is locked
// (`locked-final-cut`) and never cut again.
const CUTTABLE = new Set(STATUS_NAMES.slice(0, STATUS_NAMES.indexOf('Planejamento')));
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;

// The approved kept segments, `{"manter": [{"inicio": s, "fim": s}, …]}` in seconds of the
// Original, in order and not overlapping; or the plain problem.
function segmentsProblem(approved) {
  const manter = approved?.manter;
  if (!Array.isArray(manter) || manter.length === 0) return 'must be {"manter": [{"inicio": s, "fim": s}, …]} with at least one segment';
  for (const [i, seg] of manter.entries()) {
    if (!isNumber(seg?.inicio) || !isNumber(seg?.fim) || seg.inicio < 0 || seg.fim <= seg.inicio) {
      return `segment ${i} must be {"inicio", "fim"} in seconds, with fim after inicio`;
    }
    if (i > 0 && seg.inicio < manter[i - 1].fim) return `segment ${i} starts before segment ${i - 1} ends: keep them in order, without overlaps`;
  }
  return null;
}

// Duration, frame rate and audio of the Original, from ffprobe; null when it cannot be read.
function probe(ffprobe, file) {
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,avg_frame_rate', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    const data = JSON.parse(r.stdout);
    const video = data.streams.find((s) => s.codec_type === 'video');
    const [num, den] = (video?.avg_frame_rate ?? '0/0').split('/').map(Number);
    const fps = num / den;
    const duration = Number(data.format.duration);
    if (!(fps > 0) || !(duration > 0)) return null;
    return { duration, fps, audio: data.streams.some((s) => s.codec_type === 'audio') };
  } catch {
    return null;
  }
}

// Picture and sound of every kept segment, one after the other, re-encoded into one file.
function cut(ffmpeg, source, target, segments, audio) {
  const parts = segments.map(({ inicio, fim }, i) => [
    `[0:v]trim=start=${inicio}:end=${fim},setpts=PTS-STARTPTS[v${i}]`,
    ...(audio ? [`[0:a]atrim=start=${inicio}:end=${fim},asetpts=PTS-STARTPTS[a${i}]`] : []),
  ]).flat();
  const inputs = segments.map((_, i) => (audio ? `[v${i}][a${i}]` : `[v${i}]`)).join('');
  const graph = [...parts, `${inputs}concat=n=${segments.length}:v=1:a=${audio ? 1 : 0}[v]${audio ? '[a]' : ''}`].join(';');
  const r = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-filter_complex', graph,
    '-map', '[v]', ...(audio ? ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-f', 'mp4', target,
  ], { encoding: 'utf8' });
  return r.status === 0 ? null : (r.stderr || r.error?.message || 'ffmpeg failed').trim().split('\n').slice(-3).join('\n');
}

// The kept words as transcript sentences: a sentence ends at . ! ? … or where a cut falls.
function sentences(kept) {
  return kept.flatMap((ws) => ws.reduce((out, w) => {
    const current = out.at(-1);
    if (current && !/[.!?…]$/.test(current.at(-1).w)) current.push(w);
    else out.push([w]);
    return out;
  }, []));
}

// `precorte`: writes a new Master from the kept segments the Criadora approved, leaves the
// Original untouched, moves the transcript onto the new Master's clock (the Original's is kept
// in `transcricao/original/`), records the segment map and makes the result the Vídeo's Master.
export function precorte(folder, projetoNome, videoNome, approvedText, ffmpeg, ffprobe) {
  const { value: approved, problem: notJson } = parseJson(approvedText);
  if (notJson) return { cut: false, reason: 'invalid-segments', message: notJson };
  const problem = segmentsProblem(approved);
  if (problem) return { cut: false, reason: 'invalid-segments', message: problem };
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { cut: false, ...refusal };

  const doc = readVideoRecord({ dir, projeto, video });
  if (doc.refusal) return { cut: false, ...doc.refusal };
  const { record, text: docText } = doc;
  if (typeof record.original !== 'string' || !fs.existsSync(at(dir, record.original))) {
    return { cut: false, reason: 'no-original', projeto, video };
  }
  if (record.master !== record.original || !CUTTABLE.has(record.status)) {
    return { cut: false, reason: 'master-locked', projeto, video, master: record.master, status: record.status };
  }
  const words = readTranscript(dir);
  if (!words) return { cut: false, reason: 'no-transcript', projeto, video };
  const media = probe(ffprobe, at(dir, record.original));
  if (!media) return { cut: false, reason: 'probe-failed', projeto, video };

  // Every cut lands on a frame, so picture and sound stay in step and the map is exact.
  const frame = (t) => round(Math.min(media.duration, Math.round(t * media.fps) / media.fps));
  const segments = approved.manter.map(({ inicio, fim }) => ({ inicio: frame(inicio), fim: frame(fim) }));
  const past = segments.findIndex((seg) => seg.fim <= seg.inicio || seg.inicio >= media.duration);
  if (past !== -1) return { cut: false, reason: 'invalid-segments', message: `segment ${past} is shorter than a frame or past the end of the Original (${round(media.duration)} s)` };
  // Nothing she said is cut in half: a cut falls between words, never inside one.
  const halved = segments.flatMap(({ inicio, fim }) => [inicio, fim])
    .flatMap((t) => words.filter((w) => w.s < t && t < w.e).map((w) => ({ ...w, corte: t })));
  if (halved.length > 0) return { cut: false, reason: 'cuts-a-word', projeto, video, palavras: halved };

  const name = `${path.parse(record.original).name}.mp4`;
  const master = `${MASTER}/${name}`;
  fs.mkdirSync(path.join(dir, MASTER), { recursive: true });
  const partial = path.join(dir, MASTER, `.${name}.parcial`);
  const failure = cut(ffmpeg, at(dir, record.original), partial, segments, media.audio);
  if (failure) {
    fs.rmSync(partial, { force: true });
    return { cut: false, reason: 'ffmpeg-failed', projeto, video, message: failure };
  }
  fs.renameSync(partial, at(dir, master));
  const made = probe(ffprobe, at(dir, master));

  let offset = 0;
  const segmentos = segments.map(({ inicio, fim }) => {
    const entry = { original: { inicio, fim }, master: { inicio: round(offset), fim: round(offset + fim - inicio) } };
    offset += fim - inicio;
    return entry;
  });
  const kept = segmentos.map(({ original, master: m }) => words
    .filter((w) => w.s >= original.inicio && w.e <= original.fim)
    .map((w) => ({ w: w.w, s: round(w.s - original.inicio + m.inicio), e: round(w.e - original.inicio + m.inicio) })));

  // The Original's transcript stays next to it; palavras.json now follows the Master's clock.
  const transcricaoOriginal = at(dir, TRANSCRICAO_ORIGINAL);
  fs.mkdirSync(transcricaoOriginal, { recursive: true });
  for (const rel of [PALAVRAS, TRANSCRIPT_MD]) {
    if (fs.existsSync(at(dir, rel))) fs.renameSync(at(dir, rel), path.join(transcricaoOriginal, path.basename(rel)));
  }
  fs.writeFileSync(at(dir, PALAVRAS), JSON.stringify(kept.flat(), null, 1));
  const lines = sentences(kept).map((ws) => `[${mmss(ws[0].s)}] ${ws.map((w) => w.w).join(' ')}`);
  fs.writeFileSync(at(dir, TRANSCRIPT_MD), [`<!-- Pré-corte: times on the new Master's clock; the Original's transcript is in original/ -->`, ...lines, ''].join('\n'));

  const duracao = made ? round(made.duration) : null;
  const report = { original: record.original, master, duracaoOriginal: round(media.duration), duracao, segmentos };
  fs.mkdirSync(path.dirname(at(dir, PRECORTE_MAPA)), { recursive: true });
  fs.writeFileSync(at(dir, PRECORTE_MAPA), `${JSON.stringify({ ...report, feitoEm: new Date().toISOString() }, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, VIDEO_DOC), replaceFrontmatter(docText, { ...record, master }));
  return { cut: true, projeto, video, ...report, palavras: kept.flat().length, palavrasCortadas: words.length - kept.flat().length };
}
