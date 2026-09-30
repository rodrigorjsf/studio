// `entregar`: the Entrega. The Finalizador renders the approved edit into the Vídeo's `entrega/`
// folder — the vertical 9:16 MP4 by default; a 16:9 MP4 or transparent MOV overlays only when she
// asked — the QC técnico judges it, and this command holds every file there against the Master
// before the Vídeo is marked Entregue:
//   - each MP4 passes the technical QC (`qc`, qc.mjs): duration within one frame, a Formato's
//     canvas, 30 fps, her original audio exactly once at the Master's loudness, no black or frozen
//     stretch the Master does not have — so a failed QC always blocks the Entrega;
//   - an overlay (MOV) lasts as long as the Master, within one frame, and carries no audio, since
//     her voice is already in the Master it is laid over.
// A file that fails is named with its reasons and nothing changes. On success it returns the
// program that opens the delivery folder on this computer, for the Diretor to run, and the
// photosensitivity check left to a person.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { nfc } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { ENTREGA, VIDEO_DOC } from './layout.mjs';
import { durationProblem, measure, PHOTOSENSITIVITY, probe, renderProblems } from './qc.mjs';
import { findVideo, updateVideoRecord } from './video.mjs';

const extension = (name) => path.extname(name).toLowerCase();
const DELIVERABLE = new Set(['.mp4', '.mov']);

function fileProblems(name, file, master, { ffmpeg, ffprobe }) {
  if (extension(name) === '.mp4') {
    const media = measure(ffmpeg, ffprobe, file);
    if (!media) return [`${name}: cannot be read as a video`];
    return renderProblems(media, master).map(({ message }) => `${name}: ${message}`);
  }
  const media = probe(ffprobe, file);
  if (!media) return [`${name}: cannot be read as a video`];
  const problems = [];
  const duration = durationProblem(media, master);
  if (duration) problems.push(`${name}: ${duration}`);
  if (media.faixasDeAudio > 0) {
    problems.push(`${name}: an overlay carries no audio (${media.faixasDeAudio} track${media.faixasDeAudio > 1 ? 's' : ''}); her voice is in the Master`);
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

export function entregar(folder, projetoNome, videoNome, ffmpeg, ffprobe) {
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
  const master = typeof record.master === 'string' ? measure(ffmpeg, ffprobe, path.join(dir, ...record.master.split('/'))) : null;
  if (!master) return refuse('probe-failed', { master: record.master ?? null });
  const problemas = arquivos.flatMap((name) => fileProblems(name, path.join(pasta, name), master, { ffmpeg, ffprobe }));
  if (problemas.length > 0) return refuse('not-ready', { problemas });

  const entregueEm = new Date().toISOString();
  const { data, message } = updateVideoRecord(dir, (current) => {
    current.status = 'Entregue';
    current.gate = null;
    current.entregueEm = entregueEm;
  });
  if (!data) return refuse('invalid-document', { message });
  return { delivered: true, projeto, video, status: data.status, entregueEm, pasta, arquivos, abrir: opener(pasta), verificacaoManual: [PHOTOSENSITIVITY] };
}
