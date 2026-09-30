// The read-only Notion context of a Projeto or a Vídeo. The Criadora links Páginas Notion (her
// own pages: brand notes, content calendar, a script); the Diretor reads only those pages
// through her own Notion connector and writes what it took from them into a dated Resumo
// Notion, the only form in which Notion reaches the personas. Nothing here talks to Notion:
// these commands keep the links and the Resumo, and tell when the Resumo no longer matches.
//
// Both files live in the `notion/` folder of the Projeto or the Vídeo:
//
//   notion/paginas.json   {"schemaVersion": 1, "paginas": [{"url": "https://www.notion.so/…",
//                          "titulo": "Notas de marca", "subpaginas": false, "vinculadaEm": ISO}]}
//                          `subpaginas`: her consent to read the page's sub-pages (default no)
//   notion/resumo.md      the Resumo Notion, pt-BR, for her to read. Frontmatter:
//                            geradoEm: ISO            when it was written
//                            paginasLidas:            the linked pages it was taken from
//                              - https://www.notion.so/…
//                            subpaginasLidas:         those whose sub-pages were read (with her consent)
//                              - https://www.notion.so/…
//
// A Resumo is `atualizado` while its `paginasLidas` are exactly the linked pages, read with the
// consent each link holds now (sub-pages read exactly where she allows it); otherwise `desatualizado` (a page was linked, unlinked or its
// consent withdrawn since). `ausente` when pages are linked but no Resumo exists, and
// `sem-paginas` when nothing is linked, which is a valid choice.
import fs from 'node:fs';
import path from 'node:path';
import { estado, nfc } from './estado.mjs';
import { parseFrontmatter, writeDocument } from './frontmatter.mjs';
import { NOTION_PAGINAS, NOTION_RESUMO, PROJETOS, VIDEOS } from './layout.mjs';
import { findProjeto } from './projeto.mjs';
import { findVideo } from './video.mjs';
import { isIsoDate, isObject, parseJson } from './valores.mjs';

// A file of the Estúdio layout (`notion/paginas.json`) inside a Projeto or Vídeo folder.
const at = (dir, rel) => path.join(dir, ...rel.split('/'));

// A Página Notion is an https address on Notion's own hosts: notion.so (the app) or a
// workspace's public notion.site. The host is checked, not the text, so no other site passes.
export function notionUrlProblem(url) {
  if (typeof url !== 'string') return 'url must be the address of a Notion page';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return `url ${JSON.stringify(url)} is not a web address`;
  }
  const host = parsed.hostname.toLowerCase();
  const notionHost = host === 'notion.so' || host.endsWith('.notion.so') || host.endsWith('.notion.site');
  if (parsed.protocol !== 'https:' || !notionHost || parsed.pathname.length <= 1) {
    return `url ${JSON.stringify(url)} is not a Notion page (https://www.notion.so/… or https://….notion.site/…)`;
  }
  return null;
}

function linkProblem(pagina) {
  if (!isObject(pagina)) return 'each page must be {url, titulo, subpaginas}';
  const urlProblem = notionUrlProblem(pagina.url);
  if (urlProblem) return urlProblem;
  if (typeof pagina.titulo !== 'string' || pagina.titulo.trim() === '') return `${pagina.url}: titulo must name the page for her`;
  if ('subpaginas' in pagina && typeof pagina.subpaginas !== 'boolean') return `${pagina.url}: subpaginas must be true or false`;
  return null;
}

// The problems of a `notion/paginas.json` as read from disk.
export function linksProblems(data) {
  if (!isObject(data) || !Array.isArray(data.paginas)) return ['must be {"schemaVersion": 1, "paginas": [...]}'];
  const problems = [];
  if (data.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  data.paginas.forEach((pagina, i) => {
    // On disk `subpaginas` is always written; only a new link may leave it out (default no).
    const problem = linkProblem({ subpaginas: null, ...pagina });
    if (problem) problems.push(`pagina ${i + 1}: ${problem}`);
    else if (!isIsoDate(pagina.vinculadaEm)) problems.push(`pagina ${i + 1}: vinculadaEm must be a date (ISO)`);
  });
  const urls = data.paginas.map((p) => p?.url);
  if (new Set(urls).size !== urls.length) problems.push('a page is linked twice');
  return problems;
}

// The problems of a Resumo Notion's frontmatter.
export function resumoProblems(data) {
  const problems = [];
  if (!isIsoDate(data.geradoEm)) problems.push('geradoEm must be the date the Resumo was written (ISO)');
  const paginasLidas = data.paginasLidas ?? null;
  if (!Array.isArray(paginasLidas) || paginasLidas.length === 0) problems.push('paginasLidas must list the Páginas Notion it was taken from');
  else paginasLidas.forEach((url) => { const p = notionUrlProblem(url); if (p) problems.push(`paginasLidas: ${p}`); });
  const lidas = data.subpaginasLidas ?? [];
  if (!Array.isArray(lidas)) problems.push('subpaginasLidas must list the pages whose sub-pages were read (empty when none)');
  else if (Array.isArray(paginasLidas)) {
    lidas.filter((url) => !paginasLidas.includes(url)).forEach((url) => problems.push(`subpaginasLidas: ${url} is not one of its paginasLidas`));
  }
  return problems;
}

// Whether a valid Resumo still matches the links: the same pages, each read with the consent
// its link holds now.
export function resumoState(paginas, resumo) {
  if (paginas.length === 0 && !resumo) return 'sem-paginas';
  if (!resumo) return 'ausente';
  const lidas = resumo.subpaginasLidas ?? [];
  const consented = paginas.filter((p) => p.subpaginas).map((p) => p.url);
  const same = paginas.length === resumo.paginasLidas.length
    && paginas.every((p) => resumo.paginasLidas.includes(p.url))
    && lidas.length === consented.length && consented.every((url) => lidas.includes(url));
  return same ? 'atualizado' : 'desatualizado';
}

// The Notion context of one Projeto or Vídeo folder, as `estado` reports it, with the problems
// found in each file (`{file, message}`). A malformed file counts as no links / no Resumo.
export function readNotion(dir) {
  const linksFile = at(dir, NOTION_PAGINAS);
  const resumoFile = at(dir, NOTION_RESUMO);
  const problems = [];
  const fail = (file, message) => problems.push({ file, message });
  let paginas = [];
  if (fs.existsSync(linksFile)) {
    let data = null;
    try {
      data = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
    } catch (err) {
      fail(linksFile, `not valid JSON (${err.message})`);
    }
    if (data !== null) {
      const found = linksProblems(data);
      found.forEach((message) => fail(linksFile, message));
      if (found.length === 0) paginas = data.paginas;
    }
  }
  let resumo = null;
  if (fs.existsSync(resumoFile)) {
    try {
      const data = parseFrontmatter(fs.readFileSync(resumoFile, 'utf8'));
      const found = resumoProblems(data);
      found.forEach((message) => fail(resumoFile, message));
      if (found.length === 0) resumo = data;
    } catch (err) {
      fail(resumoFile, err.message);
    }
  }
  return { paginas, resumo, problems, state: { paginas: paginas.length, resumo: resumoState(paginas, resumo) } };
}

// The two levels of Notion context a Vídeo relies on: its Projeto's (two folders up,
// `projetos/<projeto>/videos/<vídeo>`) and its own.
export const notionLevels = (videoDir) => ({ projeto: readNotion(path.join(videoDir, '..', '..')), video: readNotion(videoDir) });

// The Projeto's or the Vídeo's folder the edit is about (`video` names a Vídeo), or a refusal.
function target(folder, projetoNome, videoNome) {
  if (videoNome != null) {
    const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, String(videoNome));
    return refusal ? { refusal } : { projeto, video, dir };
  }
  const state = estado(folder);
  const projeto = state.isEstudio && state.projetos?.find((p) => p.id === nfc(projetoNome));
  if (!projeto) return { refusal: { reason: 'unknown-projeto' } };
  return { projeto: projeto.id, dir: path.join(folder, PROJETOS, findProjeto(folder, projetoNome)) };
}

function parseJsonArg(text, allowed) {
  const { value, problem: notJson } = parseJson(text);
  if (notJson) return { problem: notJson };
  if (!isObject(value)) return { problem: `must be a JSON object with ${allowed.join(', ')}` };
  const other = Object.keys(value).find((key) => !allowed.includes(key));
  if (other) return { problem: `${other} is not understood here (${allowed.join(', ')})` };
  return { value };
}

const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

// `vincular-notion`: links, changes or unlinks the Páginas Notion of a Projeto, or of one of its
// Vídeos when the edit names `video`. `vincular` adds a page, or changes the title and sub-page
// consent of one already linked; `desvincular` removes pages by address. Nothing is read from
// Notion and nothing is written there.
export function vincularNotion(folder, projetoNome, editText) {
  const { value: edit, problem } = parseJsonArg(editText, ['video', 'vincular', 'desvincular']);
  if (problem) return { linked: false, reason: 'invalid-edit', message: problem };
  const vincular = edit.vincular ?? [];
  const desvincular = edit.desvincular ?? [];
  if (!Array.isArray(vincular) || !Array.isArray(desvincular)) {
    return { linked: false, reason: 'invalid-edit', message: 'vincular and desvincular must be lists' };
  }
  for (const pagina of vincular) {
    const linkIssue = linkProblem(pagina);
    if (linkIssue) return { linked: false, reason: 'invalid-link', message: linkIssue };
  }
  const { projeto, video, dir, refusal } = target(folder, projetoNome, edit.video);
  if (refusal) return { linked: false, ...refusal };
  const where = { projeto, ...(video && { video }) };

  const linksFile = at(dir, NOTION_PAGINAS);
  const { paginas: current, problems: broken } = readNotion(dir);
  // A links file she or someone broke by hand is fixed first (`estado` names the problem),
  // never silently replaced.
  if (broken.some((p) => p.file === linksFile)) return { linked: false, reason: 'invalid-links', ...where };
  const missing = desvincular.find((url) => !current.some((p) => p.url === url));
  if (missing) return { linked: false, reason: 'not-linked', ...where, url: missing };

  const agora = new Date().toISOString();
  let paginas = current.filter((p) => !desvincular.includes(p.url));
  for (const { url, titulo, subpaginas = false } of vincular) {
    const existing = paginas.find((p) => p.url === url);
    if (existing) Object.assign(existing, { titulo, subpaginas });
    else paginas = [...paginas, { url, titulo, subpaginas, vinculadaEm: agora }];
  }
  if (paginas.length > 0 || fs.existsSync(linksFile)) writeJson(linksFile, { schemaVersion: 1, paginas });
  const { state } = readNotion(dir);
  return { linked: true, ...where, paginas, resumo: state.resumo };
}

// `resumo-notion`: writes the dated Resumo Notion of a Projeto, or of one of its Vídeos when
// `video` is named, from what the Diretor read in the linked pages. `paginasLidas` must be exactly the
// linked pages (each one read, none other), and `subpaginasLidas` only pages whose link holds her
// consent to read sub-pages. `texto` is the pt-BR body she reads. A new Resumo replaces the
// previous one, which the studio wrote.
export function resumoNotion(folder, projetoNome, resumoText) {
  const { value: resumo, problem } = parseJsonArg(resumoText, ['video', 'paginasLidas', 'subpaginasLidas', 'texto']);
  if (problem) return { written: false, reason: 'invalid-resumo', message: problem };
  const paginasLidas = resumo.paginasLidas ?? [];
  const lidas = resumo.subpaginasLidas ?? [];
  if (!Array.isArray(paginasLidas) || !Array.isArray(lidas)) {
    return { written: false, reason: 'invalid-resumo', message: 'paginasLidas and subpaginasLidas must be lists of page addresses' };
  }
  if (typeof resumo.texto !== 'string' || resumo.texto.trim() === '') {
    return { written: false, reason: 'invalid-resumo', message: 'texto must be the summary she reads (pt-BR)' };
  }
  const { projeto, video, dir, refusal } = target(folder, projetoNome, resumo.video);
  if (refusal) return { written: false, ...refusal };
  const where = { projeto, ...(video && { video }) };
  const { paginas, problems: broken } = readNotion(dir);
  const linksFile = at(dir, NOTION_PAGINAS);
  if (broken.some((p) => p.file === linksFile)) return { written: false, reason: 'invalid-links', ...where };

  const notLinked = paginasLidas.find((url) => !paginas.some((p) => p.url === url));
  if (notLinked) return { written: false, reason: 'not-linked', ...where, url: notLinked };
  const noConsent = lidas.find((url) => paginas.find((p) => p.url === url)?.subpaginas !== true);
  if (noConsent) return { written: false, reason: 'no-consent', ...where, url: noConsent };
  const missing = paginas.filter((p) => !paginasLidas.includes(p.url)).map((p) => p.url);
  if (missing.length > 0 || paginasLidas.length === 0) return { written: false, reason: 'missing-pages', ...where, paginas: missing };
  // Her consent asks for the sub-pages: a page she allowed is read with them.
  const subpaginasMissing = paginas.filter((p) => p.subpaginas && !lidas.includes(p.url)).map((p) => p.url);
  if (subpaginasMissing.length > 0) return { written: false, reason: 'missing-subpages', ...where, paginas: subpaginasMissing };

  const geradoEm = new Date().toISOString();
  const file = at(dir, NOTION_RESUMO);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const titulo = `# Resumo Notion — ${video ?? projeto}`;
  fs.writeFileSync(file, writeDocument({ geradoEm, paginasLidas, subpaginasLidas: lidas }, `${titulo}\n\n${resumo.texto.trim()}\n`));
  const arquivo = [PROJETOS, projeto, ...(video ? [VIDEOS, video] : []), NOTION_RESUMO].join('/');
  return { written: true, ...where, arquivo, geradoEm };
}

// `conferir-notion`: before the Plano of a Vídeo, tells whether the Resumos Notion it relies on
// (its Projeto's and its own) still match the linked pages. `editadas` maps each linked page the
// Diretor looked up to when her connector says it was last edited (null: not reported). A page
// edited after its Resumo was written is in `mudaram`; a linked page with no date is in
// `naoConferidas`. `perguntarAtualizar` is true when a page changed, a page was read without a date
// (null: it may have changed), or a Resumo is missing or out of date, so the Diretor asks her
// whether to refresh it. A page left out of `editadas` (her connector did not answer) asks nothing.
export function conferirNotion(folder, projetoNome, videoNome, editadasText) {
  const { value: editadas, problem: notJson } = parseJson(editadasText);
  if (notJson) return { checked: false, reason: 'invalid-edit', message: notJson };
  if (!isObject(editadas) || !Object.values(editadas).every((v) => v === null || isIsoDate(v))) {
    return { checked: false, reason: 'invalid-edit', message: 'must map each linked page to its last-edited date (ISO) or null' };
  }
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { checked: false, ...refusal };
  const where = { projeto, video };
  const levels = notionLevels(dir);
  const linked = Object.values(levels).flatMap((level) => level.paginas.map((p) => p.url));
  const notLinked = Object.keys(editadas).find((url) => !linked.includes(url));
  if (notLinked) return { checked: false, reason: 'not-linked', ...where, url: notLinked };

  const niveis = Object.fromEntries(Object.entries(levels).map(([nivel, { paginas, resumo, state }]) => {
    const geradoEm = resumo?.geradoEm ?? null;
    const mudaram = geradoEm === null ? [] : paginas
      .filter((p) => editadas[p.url] && Date.parse(editadas[p.url]) > Date.parse(geradoEm))
      .map((p) => p.url);
    const naoConferidas = paginas.filter((p) => !editadas[p.url]).map((p) => p.url);
    return [nivel, { resumo: state.resumo, geradoEm, mudaram, naoConferidas }];
  }));
  const semData = Object.values(editadas).some((editadaEm) => editadaEm === null);
  const perguntarAtualizar = semData || Object.values(niveis)
    .some((n) => n.mudaram.length > 0 || n.resumo === 'ausente' || n.resumo === 'desatualizado');
  return { checked: true, ...where, niveis, perguntarAtualizar };
}
