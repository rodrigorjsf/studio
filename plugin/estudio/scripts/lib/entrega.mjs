// `entregar`: the Entrega. The Finalizador renders the approved edit into the Vídeo's `entrega/`
// folder — the vertical 9:16 MP4 by default; a 16:9 MP4 or transparent MOV overlays only when she
// asked — and this command holds every file there against the Master before the Vídeo is marked
// Entregue:
//   - each file lasts as long as the Master, within one frame of the file itself;
//   - an MP4 carries exactly one audio track (her original audio, once); an overlay (MOV) none,
//     since her voice is already in the Master it is laid over.
// A file that fails is named with its reason and nothing changes. On success it returns the
// program that opens the delivery folder on this computer, for the Diretor to run.
//
// This is the delivery's own check of the two standing rules it carries; the full technical QC
// (resolution, frame rate, loudness, black and frozen frames) is `qc`'s, ticket #12.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { nfc } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { ENTREGA, VIDEO_DOC } from './layout.mjs';
import { findVideo, updateVideoRecord } from './video.mjs';

const roundMs = (v) => Math.round(v * 1000) / 1000;
const extension = (name) => path.extname(name).toLowerCase();
const DELIVERABLE = new Set(['.mp4', '.mov']);

// Duration of the picture (seconds), its frame rate and the number of audio tracks, from ffprobe;
// null when the file cannot be read. The picture's duration, not the container's: an AAC track
// runs a few milliseconds past the last frame.
function probe(ffprobe, file) {
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,avg_frame_rate,duration', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    const { streams, format } = JSON.parse(r.stdout);
    const picture = streams.find((s) => s.codec_type === 'video');
    const [num, den] = (picture?.avg_frame_rate ?? '0/0').split('/').map(Number);
    const duration = Number(picture?.duration ?? format.duration);
    if (!(num / den > 0) || !(duration > 0)) return null;
    return { duration, fps: num / den, audioTracks: streams.filter((s) => s.codec_type === 'audio').length };
  } catch {
    return null;
  }
}

function fileProblems(name, media, master) {
  if (!media) return [`${name}: cannot be read as a video`];
  const problems = [];
  // One frame of the delivered file, plus a millisecond for the rounding of the timestamps.
  if (Math.abs(media.duration - master.duration) > 1 / media.fps + 0.001) {
    problems.push(`${name}: lasts ${roundMs(media.duration)} s, the Master ${roundMs(master.duration)} s (more than one frame apart)`);
  }
  if (extension(name) === '.mp4' && media.audioTracks !== 1) {
    problems.push(`${name}: has ${media.audioTracks} audio tracks; her original audio must play exactly once`);
  }
  if (extension(name) === '.mov' && media.audioTracks > 0) {
    problems.push(`${name}: an overlay carries no audio (${media.audioTracks} track${media.audioTracks > 1 ? 's' : ''}); her voice is in the Master`);
  }
  return problems;
}

// The program that shows a folder in the computer's file manager: Finder, Explorer, or the
// Linux desktop's; in WSL, Windows' Explorer on the folder's Windows path. Explorer exits 1 even
// when it opened the folder.
function opener(folder) {
  if (process.platform === 'darwin') return { programa: 'open', argumentos: [folder] };
  if (process.platform === 'win32') return { programa: 'explorer', argumentos: [folder] };
  const wsl = /microsoft/i.test(fs.existsSync('/proc/version') ? fs.readFileSync('/proc/version', 'utf8') : '');
  const windowsPath = wsl ? spawnSync('wslpath', ['-w', folder], { encoding: 'utf8' }) : null;
  if (windowsPath?.status === 0) return { programa: 'explorer.exe', argumentos: [windowsPath.stdout.trim()] };
  return { programa: 'xdg-open', argumentos: [folder] };
}

export function entregar(folder, projetoNome, videoNome, ffprobe) {
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { delivered: false, ...refusal };
  const refuse = (reason, extra = {}) => ({ delivered: false, reason, projeto, video, ...extra });
  let record;
  try {
    record = parseFrontmatter(fs.readFileSync(path.join(dir, VIDEO_DOC), 'utf8'));
  } catch (err) {
    return refuse('invalid-document', { message: err.message });
  }
  const status = typeof record.status === 'string' ? nfc(record.status) : null;
  if (status !== 'Aprovado') return refuse('not-approved', { status });

  const pasta = path.join(dir, ENTREGA);
  const arquivos = fs.existsSync(pasta)
    ? fs.readdirSync(pasta).filter((name) => DELIVERABLE.has(extension(name))).map(nfc).sort()
    : [];
  if (arquivos.length === 0) return refuse('no-deliverable', { pasta });
  // Overlays finish an edit elsewhere; the Entrega itself is always a full MP4 with her voice.
  if (!arquivos.some((name) => extension(name) === '.mp4')) return refuse('no-main-video', { pasta, arquivos });
  const master = typeof record.master === 'string' ? probe(ffprobe, path.join(dir, ...record.master.split('/'))) : null;
  if (!master) return refuse('probe-failed', { master: record.master ?? null });
  const problemas = arquivos.flatMap((name) => fileProblems(name, probe(ffprobe, path.join(pasta, name)), master));
  if (problemas.length > 0) return refuse('not-ready', { problemas });

  const entregueEm = new Date().toISOString();
  const { data, message } = updateVideoRecord(dir, (current) => {
    current.status = 'Entregue';
    current.gate = null;
    current.entregueEm = entregueEm;
  });
  if (!data) return refuse('invalid-document', { message });
  return { delivered: true, projeto, video, status: data.status, entregueEm, pasta, arquivos, abrir: opener(pasta) };
}
