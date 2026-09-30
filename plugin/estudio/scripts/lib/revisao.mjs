// The Criadora's review, in Rodadas: each version of the edit (v01, v02…) gets its own folder
// with the key stills she reviews; she decides once per version — approve, approve with small
// changes, or ask for changes — and her notes are consolidated into one list. A new idea (a new
// concept, new footage, another version) is named as a scope change, never slipped in as a fix.
//
//   nova-versao     the Motion designer's next version folder, `revisao/vNN/`
//   abrir-revisao   her review of that version opens: Status Revisão, Rodada N, Gate open
//   decidir-revisao her decision: Aprovado (with or without small changes) or Ajustes
//
// `rodada` in the Vídeo document is the number of the version on show, so it also counts the
// Rodadas. Approving with small changes does not open another Rodada: the fixes are applied
// before the render and listed in the decision.
import fs from 'node:fs';
import path from 'node:path';
import { DECISIONS, decisionFile, nfc, versionName, versionNumber, versions } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { NOTAS_MD, REVISAO, VIDEO_DOC } from './layout.mjs';
import { findVideo, updateVideoRecord } from './video.mjs';

// The Statuses a version is built in: after the Plano (Construção), after the internal review
// (QC interno) and after she asked for changes (Ajustes).
export const BUILDING = new Set(['Construção', 'QC interno', 'Ajustes']);

// The Vídeo's folder, Status, Gate and latest version, or the refusal to return.
export function locate(folder, projetoNome, videoNome) {
  const found = findVideo(folder, projetoNome, videoNome);
  if (found.refusal) return found;
  let record;
  try {
    record = parseFrontmatter(fs.readFileSync(path.join(found.dir, VIDEO_DOC), 'utf8'));
  } catch (err) {
    return { refusal: { reason: 'invalid-document', projeto: found.projeto, video: found.video, message: err.message } };
  }
  const latest = versions(found.dir).at(-1) ?? null;
  const pending = latest !== null && !fs.existsSync(decisionFile(found.dir, latest));
  return { ...found, status: typeof record.status === 'string' ? nfc(record.status) : null, gate: record.gate ?? null, latest, pending };
}

export function novaVersao(folder, projetoNome, videoNome) {
  const { projeto, video, dir, status, latest, pending, refusal } = locate(folder, projetoNome, videoNome);
  if (refusal) return { ready: false, ...refusal };
  if (!BUILDING.has(status)) return { ready: false, reason: 'not-building', projeto, video, status };
  // A version not yet shown to her is still the one being built: asking again returns it.
  const versao = pending ? latest : versionName(latest ? versionNumber(latest) + 1 : 1);
  const pasta = path.join(dir, REVISAO, versao);
  fs.mkdirSync(pasta, { recursive: true });
  return { ready: true, criada: !pending, projeto, video, versao, pasta };
}

export function abrirRevisao(folder, projetoNome, videoNome) {
  const { projeto, video, dir, status, latest, pending, refusal } = locate(folder, projetoNome, videoNome);
  if (refusal) return { opened: false, ...refusal };
  if (!BUILDING.has(status)) return { opened: false, reason: 'not-building', projeto, video, status };
  if (!pending) return { opened: false, reason: 'no-version', projeto, video };
  const stills = fs.readdirSync(path.join(dir, REVISAO, latest))
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map(nfc)
    .sort()
    .map((name) => `${REVISAO}/${latest}/${name}`);
  if (stills.length === 0) return { opened: false, reason: 'no-stills', projeto, video, versao: latest };
  const rodada = versionNumber(latest);
  const { data, message } = updateVideoRecord(dir, (current) => {
    current.status = 'Revisão';
    current.rodada = rodada;
    current.gate = 'aberto';
  });
  if (!data) return { opened: false, reason: 'invalid-document', projeto, video, message };
  return { opened: true, projeto, video, status: data.status, rodada, versao: latest, stills };
}

// Her notes as one list: trimmed, blanks dropped, and a note she repeated (same words, any
// case or spacing) kept once, in the order she first said it.
const noteKey = (note) => nfc(note).toLowerCase().replace(/\s+/g, ' ').trim();
function consolidate(notes, without = new Set()) {
  const seen = new Set(without);
  return notes.map((note) => note.trim()).filter((note) => {
    if (note === '' || seen.has(noteKey(note))) return false;
    seen.add(noteKey(note));
    return true;
  });
}

const DECISION_WORDS = { aprovar: 'aprovar', 'aprovar-com-ajustes': 'aprovar com pequenos ajustes', 'pedir-mudancas': 'pedir mudanças' };

// notas.md: the consolidated list as she reads it, in pt-BR.
function notesDocument({ versao, rodada, decisao, notas, mudancasDeEscopo }) {
  const lines = [
    ...notas,
    ...mudancasDeEscopo.map((m) => `${m} (mudança de escopo: é uma ideia nova, não um ajuste, e leva mais tempo)`),
  ].map((line, i) => `${i + 1}. ${line}`);
  return `# Notas da rodada ${rodada} (${versao})\n\nDecisão: ${DECISION_WORDS[decisao]}\n\n${lines.length > 0 ? lines.join('\n') : 'Sem notas.'}\n`;
}

const isTextList = (v) => v === undefined || (Array.isArray(v) && v.every((item) => typeof item === 'string'));

// The decision she gave, `{"decisao", "notas": [...], "mudancasDeEscopo": [...]}`, checked on
// its own: the refusal to return, or the decision with her notes consolidated.
function readDecision(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (err) {
    return { refusal: { reason: 'invalid-decision', message: `not valid JSON (${err.message})` } };
  }
  if (!DECISIONS.includes(input?.decisao)) {
    return { refusal: { reason: 'invalid-decision', message: `decisao must be one of: ${DECISIONS.join(', ')}` } };
  }
  if (!isTextList(input.notas) || !isTextList(input.mudancasDeEscopo)) {
    return { refusal: { reason: 'invalid-decision', message: 'notas and mudancasDeEscopo must be lists of her notes, as text' } };
  }
  const mudancasDeEscopo = consolidate(input.mudancasDeEscopo ?? []);
  const notas = consolidate(input.notas ?? [], new Set(mudancasDeEscopo.map(noteKey)));
  const { decisao } = input;
  const all = notas.length + mudancasDeEscopo.length;
  if (decisao === 'aprovar' && all > 0) {
    return { refusal: { reason: 'notes-on-plain-approval', message: 'approving with notes is aprovar-com-ajustes' } };
  }
  // The notes each decision needs: small fixes for an approval with changes; anything for changes.
  const needed = { aprovar: 0, 'aprovar-com-ajustes': notas.length, 'pedir-mudancas': all };
  if (decisao !== 'aprovar' && needed[decisao] === 0) {
    return { refusal: { reason: 'no-notes', message: `${decisao} needs her notes` } };
  }
  if (decisao === 'aprovar-com-ajustes' && mudancasDeEscopo.length > 0) {
    return { refusal: { reason: 'scope-change', message: 'a new idea is not a small fix: it takes pedir-mudancas and a new Rodada', mudancasDeEscopo } };
  }
  return { decisao, notas, mudancasDeEscopo };
}

export function decidirRevisao(folder, projetoNome, videoNome, decisionText) {
  const decision = readDecision(decisionText);
  if (decision.refusal) return { decided: false, ...decision.refusal };
  const { projeto, video, dir, status, latest, pending, refusal } = locate(folder, projetoNome, videoNome);
  if (refusal) return { decided: false, ...refusal };
  if (status !== 'Revisão' || !pending) return { decided: false, reason: 'not-in-review', projeto, video, status };

  const rodada = versionNumber(latest);
  const { decisao, notas, mudancasDeEscopo } = decision;
  const record = { versao: latest, rodada, decisao, notas, mudancasDeEscopo, decididoEm: new Date().toISOString() };
  const { data, message } = updateVideoRecord(dir, (current) => {
    current.status = decisao === 'pedir-mudancas' ? 'Ajustes' : 'Aprovado';
    current.gate = null;
    current.gates = (current.gates ?? 0) + 1;
  });
  if (!data) return { decided: false, reason: 'invalid-document', projeto, video, message };
  const pasta = path.join(dir, REVISAO, latest);
  fs.writeFileSync(path.join(pasta, NOTAS_MD), notesDocument(record));
  fs.writeFileSync(decisionFile(dir, latest), `${JSON.stringify(record, null, 2)}\n`);
  return {
    decided: true,
    projeto,
    video,
    versao: latest,
    rodada,
    decisao,
    status: data.status,
    gates: data.gates,
    notas,
    mudancasDeEscopo,
    ajustesAntesDaEntrega: decisao === 'aprovar-com-ajustes' ? notas : [],
  };
}
