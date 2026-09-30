// `qc`: the technical QC. The QC técnico runs it on the full render of a version before the
// Criadora sees its stills, and on every MP4 of the Entrega before it is delivered (`entregar`
// runs the same checks, so a failed QC always blocks delivery). It holds one render against the
// Vídeo's Master and fails it, with one reason per check, when:
//   - duration      it does not last as long as the Master, within one frame of the render;
//   - resolution    its frame is not the canvas of an Estúdio Formato (9:16 1080×1920,
//                   16:9 1920×1080, 1:1 1080×1080), the sizes the Remotion template renders;
//   - frame-rate    it does not run at the edit's 30 frames per second, constant;
//   - audio-tracks  it does not carry exactly one audio track (her original audio, once);
//   - loudness      its integrated loudness is more than 1.5 LU away from the Master's: her voice
//                   was doubled, dropped or re-mixed. Integrated loudness and true peak are
//                   measured and reported for both files and never normalized;
//   - black-frames  it holds black for 0.5 s or more where the Master does not;
//   - frozen-frames its picture stands still for 2 s or more where the Master does not (a black
//                   stretch is reported as black only).
// Photosensitivity (flashes) is not measured: it is always returned as a check left to a person.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { nfc } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { VIDEO_DOC } from './layout.mjs';
import { findVideo } from './video.mjs';

const FPS_DA_EDICAO = 30;
const CANVASES = ['1080x1920', '1920x1080', '1080x1080'];
const LOUDNESS_TOLERANCE_LU = 1.5;
const BLACK_MIN_S = 0.5;
const FROZEN_MIN_S = 2;

const roundMs = (v) => Math.round(v * 1000) / 1000;
const rate = (fraction) => {
  const [num, den] = (fraction ?? '0/0').split('/').map(Number);
  return num / den > 0 ? num / den : 0;
};

// Picture size, frame rate, duration and audio tracks from ffprobe; null when unreadable. The
// picture's duration, not the container's: an AAC track runs a few milliseconds past the last frame.
export function probe(ffprobe, file) {
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,avg_frame_rate,r_frame_rate,duration,channels', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    const { streams, format } = JSON.parse(r.stdout);
    const picture = streams.find((s) => s.codec_type === 'video');
    const audio = streams.filter((s) => s.codec_type === 'audio');
    const fps = rate(picture?.avg_frame_rate);
    const duracao = Number(picture?.duration ?? format.duration);
    if (!(fps > 0) || !(duracao > 0)) return null;
    return {
      duracao,
      largura: picture.width,
      altura: picture.height,
      fps: Math.round(fps * 1000) / 1000,
      fpsConstante: Math.abs(rate(picture.r_frame_rate) - fps) < 0.01,
      faixasDeAudio: audio.length,
      canaisDeAudio: audio[0]?.channels ?? 0,
    };
  } catch {
    return null;
  }
}

// Stretches [{inicio, fim}] a detector printed; a stretch still open at the end runs to `fim`.
function stretches(log, startKey, endKey, fim) {
  const found = [];
  for (const [, key, value] of log.matchAll(new RegExp(`(${startKey}|${endKey})[:=]\\s*(-?[\\d.]+)`, 'g'))) {
    if (key === startKey) found.push({ inicio: Number(value), fim });
    else if (found.length > 0) found[found.length - 1].fim = Number(value);
  }
  return found.map((s) => ({ inicio: roundMs(s.inicio), fim: roundMs(s.fim) }));
}

// A level from the ebur128 summary; null for silence (-inf, or the -70 LUFS absolute gate).
const summaryLevel = (log, label) => {
  const m = log.match(new RegExp(`${label}:\\s+(-?[\\d.]+|-inf)`));
  const value = m && m[1] !== '-inf' ? Number(m[1]) : null;
  return value !== null && value > -70 ? value : null;
};

// One decoding pass: black and frozen stretches of the picture; integrated loudness (LUFS) and
// true peak (dBTP) of the first audio track, null when silent or absent. Loudness is measured as
// the track plays in stereo: a mono recording goes to both channels, as Remotion renders it, so a
// mono Master and its stereo render measure alike.
function analyse(ffmpeg, file, media) {
  const audio = media.faixasDeAudio > 0;
  const upmix = media.canaisDeAudio === 1 ? 'pan=stereo|c0=c0|c1=c0,' : '';
  const graph = `[0:v:0]blackdetect=d=${BLACK_MIN_S}:pix_th=0.10,freezedetect=n=-60dB:d=${FROZEN_MIN_S}[v]${audio ? `;[0:a:0]${upmix}ebur128=peak=true[a]` : ''}`;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-filter_complex', graph, '-map', '[v]', ...(audio ? ['-map', '[a]'] : []), '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) return null;
  const log = r.stderr;
  const summary = log.slice(log.lastIndexOf('Summary:'));
  return {
    pretos: stretches(log, 'black_start', 'black_end', media.duracao),
    congelados: stretches(log, 'lavfi.freezedetect.freeze_start', 'lavfi.freezedetect.freeze_end', media.duracao),
    loudnessIntegrado: audio ? summaryLevel(summary, 'I') : null,
    truePeak: audio ? summaryLevel(summary, 'Peak') : null,
  };
}

// Everything `qc` measures on one file; null when it cannot be read as a video.
export function measure(ffmpeg, ffprobe, file) {
  const media = probe(ffprobe, file);
  const analysis = media && analyse(ffmpeg, file, media);
  return analysis ? { ...media, duracao: roundMs(media.duracao), ...analysis } : null;
}

const overlaps = (a, b) => a.inicio < b.fim && b.inicio < a.fim;
const formatStretch = (s) => `${s.inicio}–${s.fim} s`;

// Why a file does not last as long as the Master, within one frame of the file itself plus a
// millisecond for the rounding of the timestamps; null when it does.
export function durationProblem(media, master) {
  if (Math.abs(media.duracao - master.duracao) <= 1 / media.fps + 0.001) return null;
  return `lasts ${roundMs(media.duracao)} s, the Master ${roundMs(master.duracao)} s (more than one frame apart)`;
}

// The reasons one measured render fails against the measured Master: [{check, message}].
export function renderProblems(render, master) {
  const problems = [];
  const fail = (check, message) => problems.push({ check, message });
  const duration = durationProblem(render, master);
  if (duration) fail('duration', duration);
  if (!CANVASES.includes(`${render.largura}x${render.altura}`)) {
    fail('resolution', `is ${render.largura}×${render.altura}; a Formato's canvas is 1080×1920 (9:16), 1920×1080 (16:9) or 1080×1080 (1:1)`);
  }
  if (Math.abs(render.fps - FPS_DA_EDICAO) > 0.01 || !render.fpsConstante) {
    fail('frame-rate', `runs at ${render.fps} fps${render.fpsConstante ? '' : ' (variable)'}; the edit runs at a constant ${FPS_DA_EDICAO} fps`);
  }
  if (render.faixasDeAudio !== 1) {
    fail('audio-tracks', `has ${render.faixasDeAudio} audio tracks; her original audio must play exactly once`);
  } else if (master.faixasDeAudio > 0) {
    const [heard, recorded] = [render.loudnessIntegrado, master.loudnessIntegrado];
    // Silence on both sides is her recording as it is; silence on one side only is a fault.
    const same = heard === null || recorded === null ? heard === recorded : Math.abs(heard - recorded) <= LOUDNESS_TOLERANCE_LU;
    if (!same) {
      fail('loudness', `measures ${render.loudnessIntegrado ?? 'silence'} LUFS, the Master ${master.loudnessIntegrado ?? 'silence'} LUFS (more than ${LOUDNESS_TOLERANCE_LU} LU apart): her voice must play once, as recorded`);
    }
  }
  const pretos = render.pretos.filter((s) => !master.pretos.some((m) => overlaps(s, m)));
  if (pretos.length > 0) fail('black-frames', `turns black at ${pretos.map(formatStretch).join(', ')}, where the Master does not`);
  const congelados = render.congelados
    .filter((s) => !master.congelados.some((m) => overlaps(s, m)))
    .filter((s) => !render.pretos.some((p) => overlaps(s, p)));
  if (congelados.length > 0) fail('frozen-frames', `stands still at ${congelados.map(formatStretch).join(', ')}, where the Master does not`);
  return problems;
}

export const PHOTOSENSITIVITY = {
  check: 'photosensitivity',
  message: 'not measured: watch the render for flashes or fast flicker (more than three flashes in any one second) before it reaches her audience',
};

export function qc(folder, projetoNome, videoNome, renderPath, ffmpeg, ffprobe) {
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { passed: false, ...refusal };
  const refuse = (reason, extra = {}) => ({ passed: false, reason, projeto, video, ...extra });
  let record;
  try {
    record = parseFrontmatter(fs.readFileSync(path.join(dir, VIDEO_DOC), 'utf8'));
  } catch (err) {
    return refuse('invalid-document', { message: err.message });
  }
  const renderFile = path.resolve(dir, renderPath);
  if (!fs.existsSync(renderFile)) return refuse('no-render', { render: renderFile });
  const masterFile = typeof record.master === 'string' ? path.join(dir, ...record.master.split('/')) : null;
  const master = masterFile && measure(ffmpeg, ffprobe, masterFile);
  if (!master) return refuse('probe-failed', { master: record.master ?? null });
  const medido = measure(ffmpeg, ffprobe, renderFile);
  if (!medido) return refuse('probe-failed', { render: renderFile });
  const problemas = renderProblems(medido, master);
  return {
    passed: problemas.length === 0,
    projeto,
    video,
    render: nfc(renderFile),
    master: record.master,
    problemas,
    medidas: { render: medido, master },
    verificacaoManual: [PHOTOSENSITIVITY],
  };
}
