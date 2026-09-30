// `rascunho-issue`: the Rascunhos de issue, reports about the studio itself (a defect in the plugin,
// or trouble that keeps coming back) that the Diretor writes for the maintainer. A draft lives in
// the Estúdio's `issues/` folder and leaves her computer only when she says yes (ADR 0007); this
// command never publishes anything: it saves, refuses, records her decision and builds the link.
//
// Input, a JSON object:
//   {"acao": "salvar", "tipo": "bug" | "evolucao", "titulo": "<title>", "corpo": "<markdown: description,
//    scenarios, examples, evidence>"}     → saves a new draft; the answer has its `id`, `arquivo` and `link`
//   {"acao": "link", "id": <n>}           → `link`, `titulo` and `corpo` of a saved draft
//   {"acao": "decidir", "id": <n>, "decisao": "publicado" | "link-entregue" | "recusado", "url": "<issue URL>"}
//                                         → records her decision, once; `url` only with "publicado"
// A draft with no decision is pending: `estado` lists it (`rascunhosPendentes`). Anything the command
// does not accept is refused with a stable `reason` and no file changes.
import fs from 'node:fs';
import path from 'node:path';
import { nfc, subfolders } from './estado.mjs';
import { documentBody, parseFrontmatter, replaceFrontmatter, writeDocument } from './frontmatter.mjs';
import { ISSUES, MARKER, PROJETOS, VIDEOS } from './layout.mjs';
import { isObject, parseJson } from './valores.mjs';

// The repository every Rascunho de issue is for; nothing else is ever offered.
export const REPOSITORY = 'rodrigorjsf/studio';
export const TIPOS = ['bug', 'evolucao'];
// Her decision on a draft. Only a published one has the URL of the issue it became.
export const DECISOES = ['publicado', 'link-entregue', 'recusado'];
const ISSUE_URL = new RegExp(`^https://github\\.com/${REPOSITORY}/issues/\\d+$`);

const oneLine = (text) => text.replace(/\s+/g, ' ').trim();
const FILE = /^(\d+)-.+\.md$/;

// The draft files of the issues folder, by identifier: [{id, file}].
function draftFiles(issues) {
  if (!fs.existsSync(issues)) return [];
  return fs.readdirSync(issues)
    .map((name) => ({ id: Number(FILE.exec(name)?.[1]), file: path.join(issues, name) }))
    .filter((draft) => Number.isInteger(draft.id))
    .sort((a, b) => a.id - b.id);
}

// The drafts saved so far and the damaged files: {rascunhos: [{id, tipo, titulo, decisao, arquivo, corpo}], problems: [{file, message}]}.
export function readRascunhos(folder) {
  const rascunhos = [];
  const problems = [];
  for (const { id, file } of draftFiles(path.join(folder, ISSUES))) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      const data = parseFrontmatter(text);
      if (data.id !== id) throw new Error(`id ${JSON.stringify(data.id ?? null)} does not match the number ${id} in the file name`);
      if (!TIPOS.includes(data.tipo) || typeof data.titulo !== 'string' || data.titulo === '') throw new Error('needs a tipo (bug or evolucao) and a titulo');
      if (data.decisao != null && !DECISOES.includes(data.decisao)) throw new Error(`decisao must be one of: ${DECISOES.join(', ')}`);
      const corpo = documentBody(text).trim();
      rascunhos.push({ id, tipo: data.tipo, titulo: data.titulo, decisao: data.decisao ?? null, arquivo: file, corpo });
    } catch (err) {
      problems.push({ file, message: err.message });
    }
  }
  return { rascunhos, problems };
}

// A file name for the draft: its number and the title without accents, spaces or symbols.
function fileName(id, titulo) {
  const slug = titulo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return `${String(id).padStart(3, '0')}-${slug || 'rascunho'}.md`;
}

// The pre-filled GitHub new-issue link for a draft.
// `linkCabe` is false when the link is too long for a browser to open reliably (GitHub refuses about 8 KB of URL).
const LINK_MAX = 7000;
function linkOf(titulo, corpo) {
  const link = `https://github.com/${REPOSITORY}/issues/new?title=${encodeURIComponent(titulo)}&body=${encodeURIComponent(corpo)}`;
  return { link, linkCabe: link.length <= LINK_MAX };
}

// What is hers and must never reach a public issue: the Estúdio's absolute path and the name of
// every Projeto and Vídeo in it, as {tipo, valor}. Compared composed (NFC), in lower case and with
// `\` read as `/`, so Mac, Windows and Linux spellings of the same name or path match.
function ownedNames(folder) {
  const projetos = subfolders(path.join(folder, PROJETOS));
  return [
    { tipo: 'caminho', valor: folder },
    // The same Estúdio reached through a symlink (or a Mac's `/private/…`) has another spelling of its path.
    ...(fs.realpathSync(folder) === folder ? [] : [{ tipo: 'caminho', valor: fs.realpathSync(folder) }]),
    ...projetos.map((projeto) => ({ tipo: 'projeto', valor: projeto })),
    ...projetos.flatMap((projeto) => subfolders(path.join(folder, PROJETOS, projeto, VIDEOS)).map((video) => ({ tipo: 'video', valor: video }))),
  ];
}
const canon = (text) => nfc(text).replaceAll('\\', '/').toLowerCase();

// Her private content found in the draft's title and body (empty when there is none).
function privateContent(folder, titulo, corpo) {
  const text = canon(`${titulo}\n${corpo}`);
  return ownedNames(folder).filter(({ valor }) => canon(valor) !== '' && text.includes(canon(valor)));
}

function readInput(text) {
  const { value: input, problem } = parseJson(text);
  if (problem) return { problem };
  if (!isObject(input)) return { problem: 'must be a JSON object with acao' };
  return { input };
}

const ACOES = ['salvar', 'link', 'decidir'];
const refused = (reason, extra = {}) => ({ written: false, reason, ...extra });

function salvar(folder, input) {
  if (!TIPOS.includes(input.tipo)) return refused('unknown-kind', { tipo: input.tipo ?? null });
  const titulo = oneLine(String(input.titulo ?? ''));
  const corpo = String(input.corpo ?? '').replace(/\r\n/g, '\n').trim();
  if (titulo === '' || corpo === '') return refused('invalid-input', { message: 'titulo and corpo must not be empty' });
  const found = privateContent(folder, titulo, corpo);
  if (found.length > 0) return refused('private-content', { encontrados: found });
  const issues = path.join(folder, ISSUES);
  const id = 1 + Math.max(0, ...draftFiles(issues).map((draft) => draft.id));
  const arquivo = path.join(issues, fileName(id, titulo));
  const data = { id, tipo: input.tipo, titulo, criadoEm: new Date().toISOString(), decisao: null, decididoEm: null, url: null };
  fs.mkdirSync(issues, { recursive: true });
  fs.writeFileSync(arquivo, writeDocument(data, `${corpo}\n`));
  return { written: true, acao: 'salvar', id, tipo: input.tipo, arquivo, ...linkOf(titulo, corpo) };
}

// Her decision on `draft`, recorded once in its frontmatter.
function decidir(draft, input) {
  if (!DECISOES.includes(input.decisao)) return refused('invalid-input', { message: `decisao must be one of: ${DECISOES.join(', ')}` });
  const published = input.decisao === 'publicado';
  if (published && !(typeof input.url === 'string' && ISSUE_URL.test(input.url))) {
    return refused('invalid-input', { message: `a published draft needs the url of its issue on ${REPOSITORY}` });
  }
  if (!published && input.url != null) return refused('invalid-input', { message: 'only a published draft has a url' });
  if (draft.decisao !== null) return refused('already-decided', { id: draft.id, decisao: draft.decisao });
  const text = fs.readFileSync(draft.arquivo, 'utf8');
  const data = { ...parseFrontmatter(text), decisao: input.decisao, decididoEm: new Date().toISOString(), url: published ? input.url : null };
  fs.writeFileSync(draft.arquivo, replaceFrontmatter(text, data));
  return { written: true, acao: 'decidir', id: draft.id, decisao: input.decisao, url: data.url };
}

export function rascunhoIssue(folder, inputText) {
  const { input, problem } = readInput(inputText);
  if (problem) return refused('invalid-input', { message: problem });
  if (!fs.existsSync(path.join(folder, MARKER))) return refused('not-estudio');
  if (!ACOES.includes(input.acao)) return refused('invalid-input', { message: `acao must be one of: ${ACOES.join(', ')}` });
  if (input.acao === 'salvar') return salvar(folder, input);
  const draft = readRascunhos(folder).rascunhos.find((d) => d.id === input.id);
  if (!draft) return refused('unknown-draft', { id: input.id ?? null });
  if (input.acao === 'link') {
    // The link is what leaves her computer: the draft is held to the same check it passed when saved.
    const found = privateContent(folder, draft.titulo, draft.corpo);
    if (found.length > 0) return refused('private-content', { id: draft.id, encontrados: found });
    return { written: false, acao: 'link', id: draft.id, titulo: draft.titulo, corpo: draft.corpo, ...linkOf(draft.titulo, draft.corpo) };
  }
  return decidir(draft, input);
}
