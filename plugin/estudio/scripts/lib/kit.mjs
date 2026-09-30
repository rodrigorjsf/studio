// The Kit de marca: the machine-readable identity of a Projeto (`projetos/<p>/kit.json`).
// The Remotion compositions and the Guardião da marca read the same values, so the schema is
// checked here, deterministically, instead of trusted. The field-by-field description the
// Entrevistador follows lives in skills/novo-projeto/references/kit-schema.md.
//
// Keys are pt-BR, like every document in the Estúdio. Unknown keys are allowed, so later
// stages (Kit learnings, Notion) can add fields without breaking older Estúdios.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT_ASSETS } from './layout.mjs';
import { isIsoDate, isObject } from './valores.mjs';

const KIT_SCHEMA_VERSION = 1;
const FORMATOS = ['9:16', '16:9', '1:1'];
// no-app: she adds the music herself in Instagram/TikTok (trending audio, no copyright mute).
const POLITICAS_MUSICA = ['no-app', 'arquivo-dela', 'sem-musica'];
// The platforms a Projeto posts on; the Social media writes a Texto do post for each of them.
export const PLATAFORMAS = ['reels', 'tiktok', 'shorts'];

// The platforms of a Kit. A Kit without the field (made before it existed) posts on all three.
export const plataformasDoKit = (kit) => kit?.plataformas ?? PLATAFORMAS;

// A complete, valid Kit: what "decide você" answers when she has no preference.
// Vertical 9:16 and music added by her in the app are the spec's defaults. It lives in the
// Remotion template, which previews it before any Projeto exists, so both read one file.
const DEFAULT_KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'template', 'src', '_shared', 'kit-padrao.json');

export function defaultKit() {
  return JSON.parse(fs.readFileSync(DEFAULT_KIT, 'utf8'));
}

// ---- checkers: each returns null when the value is fine, or a plain problem ----
const oneOf = (values) => (v) => (values.includes(v) ? null : `must be one of: ${values.join(', ')}`);
const text = (v) => (typeof v === 'string' ? null : 'must be text');
const flag = (v) => (typeof v === 'boolean' ? null : 'must be true or false');
const positive = (v) => (typeof v === 'number' && v > 0 ? null : 'must be a number above 0');
const positiveInt = (v) => (Number.isInteger(v) && v > 0 ? null : 'must be a whole number above 0');
const weight = (v) => (Number.isInteger(v) && v >= 100 && v <= 900 ? null : 'must be a font weight from 100 to 900');
const budget = (v) => (v === null || (typeof v === 'number' && v >= 0) ? null : 'must be a number of credits (0 or more) or null');
const color = (v) => (typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v) ? null : 'must be a color like "#1A2B3C"');
const isoDateOrNull = (v) => (v === null || isIsoDate(v) ? null : 'must be a date (ISO) or null');
const orNull = (check) => (v, ...rest) => (v === null ? null : check(v, ...rest));
const listOf = (check) => (v, ctx, where) => {
  if (!Array.isArray(v)) return 'must be a list';
  v.forEach((item, i) => ctx.check(check, item, `${where}[${i}]`));
  return null;
};
const nonEmptyListOf = (check) => (v, ctx, where) => (Array.isArray(v) && v.length === 0 ? 'must list at least one' : listOf(check)(v, ctx, where));
// A field an older Kit may lack: fine when absent, checked when present.
const optional = (check) => Object.assign((...args) => check(...args), { optional: true });
const shape = (fields) => (v, ctx, where) => {
  if (!isObject(v)) return 'must be an object';
  for (const [key, check] of Object.entries(fields)) {
    if (check.optional && !(key in v)) continue;
    ctx.check(check, v[key], `${where}.${key}`, key in v);
  }
  return null;
};
// A map whose keys she names (color names, recording setups) and whose values share a check.
const mapOf = (check, required = []) => (v, ctx, where) => {
  if (!isObject(v)) return 'must be an object';
  for (const key of required) if (!(key in v)) ctx.problem(`${where}.${key}`, 'is missing');
  for (const [key, value] of Object.entries(v)) ctx.check(check, value, `${where}.${key}`);
  return null;
};
// A file stored in the Projeto's assets folder, referenced by its path from the Projeto.
const asset = (v, ctx) => {
  if (typeof v !== 'string') return 'must be a file path like "kit/logo.png"';
  const parts = v.split('/');
  if (parts[0] !== KIT_ASSETS || parts.length < 2 || parts.includes('..') || v.includes('\\')) {
    return `must be a path inside the "${KIT_ASSETS}/" folder, like "${KIT_ASSETS}/logo.png"`;
  }
  return fs.existsSync(path.join(ctx.projetoDir, ...parts)) ? null : `file not found: ${v}`;
};
const fraction = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? null : 'must be a fraction of the frame, from 0 to 1');
const faceZone = shape({ x: fraction, y: fraction, largura: fraction, altura: fraction });
const font = shape({ familia: text, peso: weight, arquivo: orNull(asset) });

const KIT_SHAPE = shape({
  schemaVersion: (v) => (v === KIT_SCHEMA_VERSION ? null : `must be ${KIT_SCHEMA_VERSION}`),
  aprovadoEm: isoDateOrNull,
  formato: oneOf(FORMATOS),
  cores: mapOf(color, ['primaria', 'destaque', 'fundo', 'texto']),
  tipografia: shape({ titulo: font, texto: font, escala: mapOf(positive, ['titulo', 'corpo']) }),
  legendas: shape({
    ativas: flag, estilo: text, fonte: oneOf(['titulo', 'texto']), tamanho: positive,
    cor: color, destaque: orNull(color), posicao: oneOf(['superior', 'centro', 'inferior']),
    caixaAlta: flag, palavrasPorVez: positiveInt,
  }),
  movimento: shape({
    intensidade: oneOf(['sutil', 'equilibrada', 'dominante']),
    ritmo: oneOf(['calmo', 'equilibrado', 'acelerado']),
    entradaMs: positiveInt, transicao: text, recursos: listOf(text),
  }),
  camera: shape({ comportamento: text, enquadramento: text }),
  zonaDoRosto: mapOf(faceZone),
  imagens: shape({ prints: text, interacao: text }),
  som: shape({ efeitos: text }),
  musica: shape({ politica: oneOf(POLITICAS_MUSICA) }),
  entregaveis: shape({ formatos: nonEmptyListOf(oneOf(FORMATOS)), overlays: flag }),
  plataformas: optional(nonEmptyListOf(oneOf(PLATAFORMAS))),
  creditos: shape({ porVideo: budget, porMes: budget }),
  fazer: listOf(text),
  evitar: listOf(text),
  glossario: listOf(text),
  referencias: listOf(shape({ arquivo: asset, nota: text })),
  ativos: shape({ logos: listOf(asset), fontes: listOf(asset), cartaoFinal: orNull(asset), outros: listOf(asset) }),
});

// Every problem of a parsed kit.json, as plain `field: problem` messages. `projetoDir`
// is the Projeto folder, where asset paths must resolve.
export function validateKit(kit, projetoDir) {
  const problems = [];
  const ctx = {
    projetoDir,
    problem: (where, message) => problems.push(`${where.replace(/^\./, '') || 'kit'} ${message}`),
    check(checker, value, where, present = true) {
      if (!present) return this.problem(where, 'is missing');
      const message = checker(value, this, where);
      if (message) this.problem(where, message);
    },
  };
  ctx.check(KIT_SHAPE, kit, '');
  // The default Formato is the one every Vídeo gets unless she asks, so it must be delivered.
  const formatos = kit?.entregaveis?.formatos;
  if (FORMATOS.includes(kit?.formato) && Array.isArray(formatos) && formatos.length > 0 && !formatos.includes(kit.formato)) {
    problems.push(`formato ${JSON.stringify(kit.formato)} must be listed in entregaveis.formatos`);
  }
  return problems;
}
