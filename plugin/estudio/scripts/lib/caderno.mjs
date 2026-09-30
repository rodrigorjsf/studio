// `caderno`: the Caderno, what the studio has learned about working with the Criadora, kept in two
// layers — the Estúdio's (`caderno.md` at its root: her and her computer) and each Projeto's
// (`caderno.md` in its folder: that domain) — each with three sections: Elogios, Queixas, Soluções.
// Only the Diretor calls this command, one entry at a time, so personas running in
// parallel never overwrite each other's lines. The Caderno never changes the Kit de marca.
//
// Input, a JSON object:
//   {"acao": "anexar", "camada": "estudio" | "projeto", "secao": "elogios" | "queixas" | "solucoes",
//    "texto": "<pt-BR, one entry>", "persona": "<who proposed it>", "projeto": "<name>", "video": "<name>"}
//   {"acao": "substituir", "camada": …, "id": <n>, "texto": …, "persona": …, "projeto"?, "video"?}
//   {"acao": "remover", "camada": …, "id": <n>, "projeto"?}
// `projeto` is required for the Projeto layer; `video` is optional and needs its `projeto`. The
// command stamps the date. Deciding whether two entries conflict is the Diretor's; it then
// replaces or removes the old one. Anything it does not know is refused with a stable `reason`
// and no file changes.
//
// The file is readable pt-BR markdown, one line per entry: `- **#3** <text> — _<persona>, <Vídeo>, <date>_`.
import fs from 'node:fs';
import path from 'node:path';
import { CADERNO, MARKER, PROJETOS } from './layout.mjs';
import { findProjeto } from './projeto.mjs';
import { isObject, parseJson } from './valores.mjs';
import { findVideo } from './video.mjs';
import { nfc } from './estado.mjs';

export const CAMADAS = ['estudio', 'projeto'];
// Section ids as the Diretor passes them, and the heading each one has in the file.
export const SECOES = { elogios: 'Elogios', queixas: 'Queixas', solucoes: 'Soluções' };

const entryLine = (id, texto, persona, video, data) => `- **#${id}** ${texto} — _${[persona, video, data].filter(Boolean).join(', ')}_`;
const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

function skeleton(title) {
  return [`# ${title}`, '', ...Object.values(SECOES).flatMap((heading) => [`## ${heading}`, ''])].join('\n');
}

// `text` with `line` added at the end of the section `heading`; a section the file lost is re-created.
function withEntry(text, heading, line) {
  const lines = text.split(/\r?\n/);
  let start = lines.indexOf(`## ${heading}`);
  if (start === -1) {
    lines.push('', `## ${heading}`);
    start = lines.length - 1;
  }
  const next = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  const end = next === -1 ? lines.length : next;
  const body = lines.slice(start + 1, end).filter((l) => l.trim() !== '');
  return [...lines.slice(0, start + 1), '', ...body, line, '', ...lines.slice(end)].join('\n').replace(/\n+$/, '\n');
}

const nextId = (text) => 1 + Math.max(0, ...[...text.matchAll(/^- \*\*#(\d+)\*\* /gm)].map((m) => Number(m[1])));

function readInput(text) {
  const { value: input, problem } = parseJson(text);
  if (problem) return { problem };
  if (!isObject(input)) return { problem: 'must be a JSON object with acao, camada, secao, texto and persona' };
  return { input };
}

// The Caderno file the input points at, and the Vídeo it names (as `estado` spells it), or the
// refusal to return: an unknown Projeto or Vídeo is never created on the fly.
function locate(folder, input) {
  const { camada, projeto, video } = input;
  const named = (value) => typeof value === 'string' && value.trim() !== '';
  if (video != null && !named(projeto)) return { refusal: { reason: 'invalid-input', message: 'video needs its projeto' } };
  if (camada === 'projeto' && !named(projeto)) return { refusal: { reason: 'invalid-input', message: 'the projeto layer needs its projeto' } };
  const projetoDir = named(projeto) ? findProjeto(folder, projeto) : null;
  if (named(projeto) && projetoDir === null) return { refusal: { reason: 'unknown-projeto', projeto } };
  let videoName = null;
  if (video != null) {
    const found = findVideo(folder, projeto, String(video));
    if (found.refusal) return { refusal: { ...found.refusal, video } };
    videoName = found.video;
  }
  if (camada === 'estudio') return { file: path.join(folder, CADERNO), title: 'Caderno do Estúdio', video: videoName };
  return { file: path.join(folder, PROJETOS, projetoDir, CADERNO), title: `Caderno do Projeto ${nfc(projetoDir)}`, video: videoName };
}

const ENTRY = (id) => new RegExp(`^- \\*\\*#${id}\\*\\* `);

// `text` without the entry `id`, or with `line` in its place: {text, secao} (the section heading
// it sat under), or null when no such entry is there.
function changeEntry(text, id, line) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => ENTRY(id).test(l));
  if (at === -1) return null;
  const heading = lines.slice(0, at).findLast((l) => l.startsWith('## '))?.slice(3) ?? null;
  const secao = Object.keys(SECOES).find((key) => SECOES[key] === heading) ?? null;
  if (line === null) lines.splice(at, 1);
  else lines[at] = line;
  return { text: lines.join('\n'), secao };
}

const ACOES = ['anexar', 'substituir', 'remover'];

export function caderno(folder, inputText) {
  const { input, problem } = readInput(inputText);
  if (problem) return { written: false, reason: 'invalid-input', message: problem };
  if (!ACOES.includes(input.acao)) return { written: false, reason: 'invalid-input', message: `acao must be one of: ${ACOES.join(', ')}` };
  if (!CAMADAS.includes(input.camada)) return { written: false, reason: 'unknown-layer', camada: input.camada ?? null };
  if (input.acao === 'anexar' && !Object.hasOwn(SECOES, input.secao)) return { written: false, reason: 'unknown-section', secao: input.secao ?? null };
  if (!fs.existsSync(path.join(folder, MARKER))) return { written: false, reason: 'not-estudio' };
  const texto = oneLine(String(input.texto ?? ''));
  const persona = oneLine(String(input.persona ?? ''));
  if (input.acao !== 'remover' && (texto === '' || persona === '')) return { written: false, reason: 'invalid-input', message: 'texto and persona must not be empty' };
  if (input.acao !== 'anexar' && !(Number.isInteger(input.id) && input.id > 0)) return { written: false, reason: 'invalid-input', message: 'id must be the number of an entry' };

  const where = locate(folder, input);
  if (where.refusal) return { written: false, ...where.refusal };
  const { file, title, video } = where;
  const data = new Date().toISOString().slice(0, 10);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : skeleton(title);
  const base = { written: true, acao: input.acao, camada: input.camada, data, caminho: file };

  if (input.acao === 'anexar') {
    const id = nextId(before);
    fs.writeFileSync(file, withEntry(before, SECOES[input.secao], entryLine(id, texto, persona, video, data)));
    return { ...base, secao: input.secao, id };
  }
  const line = input.acao === 'remover' ? null : entryLine(input.id, texto, persona, video, data);
  const changed = changeEntry(before, input.id, line);
  if (!changed) return { written: false, reason: 'unknown-entry', camada: input.camada, id: input.id };
  fs.writeFileSync(file, changed.text);
  return { ...base, secao: changed.secao, id: input.id };
}
