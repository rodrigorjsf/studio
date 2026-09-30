// `qc-interno`: one turn of the internal Crítico loop on the version being built. Before the
// Criadora sees a version, three Críticos judge it — the QC técnico, the Guardião da marca and the
// Revisor de plataforma — and the Motion designer (its Autor) fixes what they reject, without
// bothering her. Each turn is recorded here with its verdicts and what it cost (the tokens and the
// time the Diretor's persona runs reported), and the answer says what comes next:
//
//   abrir-revisao   every Crítico approved: her review of the version opens
//   corrigir        a Crítico rejected it: the reasons go back to the Motion designer
//   escalar         the third turn in a row was rejected: the loop stops, the Vídeo waits for her
//                   (Gate open) and the Diretor asks her one sentence with two options
//
// The cap counts the turns since the last escalation: when she answers with a direction and the
// Diretor closes the Gate, the Motion designer gets three new turns. The turns live in the
// version's folder (`revisao/vNN/qc-interno.json`); their count and cost add up in the Vídeo
// document (`turnosInternos`, `tokensInternos`, `segundosInternos`).
import fs from 'node:fs';
import path from 'node:path';
import { wholeCount } from './estado.mjs';
import { QC_INTERNO, REVISAO } from './layout.mjs';
import { BUILDING, locate } from './revisao.mjs';
import { updateVideoRecord } from './video.mjs';

// The three Críticos of every version, by agent name.
export const CRITICOS = ['qc-tecnico', 'guardiao-da-marca', 'revisor-de-plataforma'];
const VEREDITOS = ['aprovado', 'reprovado'];
// Rejected turns in a row before the loop stops and the Diretor asks her.
export const MAX_TURNOS = 3;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// The turn as the Diretor passes it: `{"vereditos": {<crítico>: {"veredito", "motivos"}}, "custo":
// {"tokens", "segundos"}}`, checked on its own. A rejection carries its reasons.
function readTurn(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (err) {
    return { problem: `not valid JSON (${err.message})` };
  }
  if (!isObject(input) || !isObject(input.vereditos) || !isObject(input.custo)) {
    return { problem: 'must be a JSON object with vereditos (one per Crítico) and custo ({tokens, segundos})' };
  }
  const names = Object.keys(input.vereditos);
  const other = names.find((name) => !CRITICOS.includes(name));
  if (other) return { problem: `${other} is not a Crítico (${CRITICOS.join(', ')})` };
  const missing = CRITICOS.find((name) => !names.includes(name));
  if (missing) return { problem: `the verdict of ${missing} is missing: every turn holds the three Críticos` };
  const vereditos = {};
  for (const name of CRITICOS) {
    const { veredito, motivos = [] } = input.vereditos[name] ?? {};
    if (!VEREDITOS.includes(veredito)) return { problem: `${name}: veredito must be aprovado or reprovado` };
    if (!Array.isArray(motivos) || !motivos.every((m) => typeof m === 'string')) return { problem: `${name}: motivos must be a list of text` };
    const kept = motivos.map((m) => m.trim()).filter(Boolean);
    if (veredito === 'reprovado' && kept.length === 0) return { problem: `${name}: a rejection needs its reasons (motivos)` };
    vereditos[name] = { veredito, motivos: kept };
  }
  const { tokens, segundos } = input.custo;
  if (!wholeCount(tokens) || !wholeCount(segundos)) return { problem: 'custo.tokens and custo.segundos must be whole numbers, 0 or more' };
  return { vereditos, custo: { tokens, segundos } };
}

function readTurns(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).turnos ?? [];
  } catch {
    return [];
  }
}

export function qcInterno(folder, projetoNome, videoNome, turnText) {
  const turn = readTurn(turnText);
  if (turn.problem) return { recorded: false, reason: 'invalid-turn', message: turn.problem };
  const { projeto, video, dir, status, gate, latest, pending, refusal } = locate(folder, projetoNome, videoNome);
  if (refusal) return { recorded: false, ...refusal };
  if (!BUILDING.has(status)) return { recorded: false, reason: 'not-building', projeto, video, status };
  if (!pending) return { recorded: false, reason: 'no-version', projeto, video };
  if (gate === 'aberto') return { recorded: false, reason: 'awaiting-criadora', projeto, video, versao: latest };

  const file = path.join(dir, REVISAO, latest, QC_INTERNO);
  const turnos = readTurns(file);
  const last = turnos.at(-1);
  if (last?.aprovado) return { recorded: false, reason: 'already-approved', projeto, video, versao: latest };
  // A new cycle of turns starts after an escalation she answered (the Gate is closed again).
  const ciclo = last ? last.ciclo + (last.escalado ? 1 : 0) : 1;
  const numero = last && !last.escalado ? last.turno + 1 : 1;
  const reprovacoes = CRITICOS.filter((name) => turn.vereditos[name].veredito === 'reprovado')
    .map((name) => ({ critico: name, motivos: turn.vereditos[name].motivos }));
  const aprovado = reprovacoes.length === 0;
  const escalado = !aprovado && numero >= MAX_TURNOS;
  const record = { ciclo, turno: numero, aprovado, escalado, vereditos: turn.vereditos, custo: turn.custo, registradoEm: new Date().toISOString() };

  const { data, message } = updateVideoRecord(dir, (current) => {
    current.status = 'QC interno';
    if (escalado) current.gate = 'aberto';
    current.turnosInternos = (current.turnosInternos ?? 0) + 1;
    current.tokensInternos = (current.tokensInternos ?? 0) + turn.custo.tokens;
    current.segundosInternos = (current.segundosInternos ?? 0) + turn.custo.segundos;
  });
  if (!data) return { recorded: false, reason: 'invalid-document', projeto, video, message };
  fs.writeFileSync(file, `${JSON.stringify({ turnos: [...turnos, record] }, null, 2)}\n`);
  return {
    recorded: true,
    projeto,
    video,
    versao: latest,
    ciclo,
    turno: numero,
    aprovado,
    reprovacoes,
    proximo: aprovado ? 'abrir-revisao' : (escalado ? 'escalar' : 'corrigir'),
    status: data.status,
    gate: data.gate ?? null,
    turnosInternos: data.turnosInternos,
    tokensInternos: data.tokensInternos,
    segundosInternos: data.segundosInternos,
  };
}
