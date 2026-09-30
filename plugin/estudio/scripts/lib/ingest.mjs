// What the ingest of a Vídeo leaves, checked deterministically: the word-timed transcript
// (`transcricao/palavras.json`) and the Zona do rosto — where her face moves across the whole
// clip, measured from real frames, so nothing is ever placed over it.
//
// The Assistente de edição samples the Master in face-zone mode (one frame per second over the
// whole clip, near-duplicates kept), saves the sampler's JSON as `amostras.json`, looks at every
// frame and writes one face box per frame to `medicoes.json`:
//
//   [{"t": 0, "rosto": {"x": 0.35, "y": 0.2, "largura": 0.3, "altura": 0.2}}, {"t": 1, "rosto": null}, …]
//
// Boxes are fractions of the frame from its top-left corner, like the Kit's `zonaDoRosto`;
// `rosto: null` means no face on that frame. This module checks that the measurements cover
// the whole clip, frame by frame, and joins them into one zone.

// Space kept free around the measured face, as a fraction of the frame on each side.
export const MARGIN = 0.05;
// Timestamps are matched to the sampler's with this tolerance (seconds).
const SAME_TIME = 0.05;

const round = (v) => Math.round(v * 10000) / 10000;
const isFraction = (v) => typeof v === 'number' && v >= 0 && v <= 1;

// Null when `box` is a face box inside the frame, otherwise the plain problem.
export function boxProblem(box) {
  if (box === null || typeof box !== 'object' || !['x', 'y', 'largura', 'altura'].every((k) => isFraction(box[k]))) {
    return 'must be a box {x, y, largura, altura} of fractions from 0 to 1';
  }
  if (box.x + box.largura > 1 + 1e-9) return 'the box leaves the frame (x + largura above 1)';
  if (box.y + box.altura > 1 + 1e-9) return 'the box leaves the frame (y + altura above 1)';
  return null;
}

// Whether the sampler's run is a face-zone pass over the whole clip: no near-duplicate dropped,
// no stretch left out at the start, the end or in between.
function coversWholeClip(samples) {
  const times = (samples?.frames ?? []).map((f) => f.timestamp_seconds);
  const duration = samples?.meta?.duration_seconds;
  if (samples?.modo !== 'zona-do-rosto' || samples.dedup !== false || times.length === 0 || !(duration > 0)) return false;
  const spacing = duration / times.length;
  const gaps = [times[0], ...times.slice(1).map((t, i) => t - times[i]), duration - times.at(-1)];
  return gaps[0] <= spacing + SAME_TIME && gaps.at(-1) <= spacing + SAME_TIME && gaps.every((gap) => gap <= 2 * spacing + SAME_TIME);
}

// The Zona do rosto from the sampler's JSON and the per-frame measurements, or the refusal.
export function measureZone(samples, measurements) {
  if (!coversWholeClip(samples)) return { measured: false, reason: 'not-whole-clip' };
  if (!Array.isArray(measurements)) return { measured: false, reason: 'invalid-measurements', errors: ['medicoes.json must be a list of {t, rosto}'] };
  const errors = measurements
    .filter((m) => m?.rosto !== null && boxProblem(m?.rosto))
    .map((m) => `t=${m?.t}: ${boxProblem(m?.rosto)}`);
  if (errors.length > 0) return { measured: false, reason: 'invalid-measurements', errors };

  const times = samples.frames.map((f) => f.timestamp_seconds);
  const at = (t) => measurements.find((m) => typeof m?.t === 'number' && Math.abs(m.t - t) <= SAME_TIME);
  const unmeasured = times.filter((t) => !at(t));
  if (unmeasured.length > 0) return { measured: false, reason: 'unmeasured-frames', timestamps: unmeasured };

  const faces = times.map((t) => at(t).rosto).filter(Boolean);
  let zona = null;
  if (faces.length > 0) {
    const left = Math.max(0, Math.min(...faces.map((b) => b.x)) - MARGIN);
    const top = Math.max(0, Math.min(...faces.map((b) => b.y)) - MARGIN);
    const right = Math.min(1, Math.max(...faces.map((b) => b.x + b.largura)) + MARGIN);
    const bottom = Math.min(1, Math.max(...faces.map((b) => b.y + b.altura)) + MARGIN);
    zona = { x: round(left), y: round(top), largura: round(right - left), altura: round(bottom - top) };
  }
  return {
    measured: true,
    zona,
    margem: MARGIN,
    quadros: times.length,
    quadrosComRosto: faces.length,
    duracao: samples.meta.duration_seconds,
    medidoEm: new Date().toISOString(),
  };
}

// Null when a parsed palavras.json is a word-timed transcript, otherwise the plain problem.
export function transcriptProblem(words) {
  if (!Array.isArray(words)) return 'must be a list of words {w, s, e}';
  const bad = words.findIndex((word) => typeof word?.w !== 'string' || typeof word?.s !== 'number'
    || typeof word?.e !== 'number' || word.s > word.e);
  return bad === -1 ? null : `word ${bad} must be {w, s, e}: the word, its start and its end in seconds`;
}
