// `revisar-texto`: one turn of the internal loop in which the Revisor de plataforma judges the Texto
// do post (`entrega/texto-do-post.md`), recorded the way `qc-interno` records a version's turns. The
// text has one Crítico, the Revisor, and one Autor, the Social media. Each turn is kept with its
// verdict, its reasons and what it cost, and the answer says what comes next:
//
//   mostrar    the Revisor approved: the Diretor shows the text in the closing message
//   corrigir   the Revisor rejected it: the reasons go back to the Social media
//   escalar    the third turn in a row was rejected: the loop stops and the Diretor asks her one
//              question with two options; `codigoRepetido` names the rejection code (the word before
//              the colon of a reason) found in all three turns, the trigger of a self-evolution draft
//
// A turn after an approval or an escalation starts a new cycle of three turns. The turns live in
// the Vídeo folder (`texto-do-post-revisao.json`, outside the `entrega` folder she opens); their
// count and cost add up in the Vídeo document (`turnosInternos`, `tokensInternos`,
// `segundosInternos`). The text is written after the edit is approved, or on her request for a
// delivered or archived Vídeo, so this command never moves the Status and never opens a Gate.
import fs from 'node:fs';
import path from 'node:path';
import { wholeCount } from './estado.mjs';
import { ENTREGA, TEXTO_DO_POST, TEXTO_DO_POST_REVISAO } from './layout.mjs';
import { MAX_TURNOS } from './qc-interno.mjs';
import { findVideo, updateVideoRecord } from './video.mjs';
import { isObject, parseJson, readJson } from './valores.mjs';

const VEREDITOS = ['aprovado', 'reprovado'];

// The turn as the Diretor passes it: `{"veredito", "motivos": [...], "custo": {"tokens", "segundos"}}`.
function readTurn(text) {
  const { value: input, problem: notJson } = parseJson(text);
  if (notJson) return { problem: notJson };
  if (!isObject(input) || !isObject(input.custo)) return { problem: 'must be a JSON object with veredito, motivos and custo ({tokens, segundos})' };
  const { veredito, motivos = [] } = input;
  if (!VEREDITOS.includes(veredito)) return { problem: 'veredito must be aprovado or reprovado' };
  if (!Array.isArray(motivos) || !motivos.every((m) => typeof m === 'string')) return { problem: 'motivos must be a list of text' };
  const kept = motivos.map((m) => m.trim()).filter(Boolean);
  if (veredito === 'reprovado' && kept.length === 0) return { problem: 'a rejection needs its reasons (motivos)' };
  const { tokens, segundos } = input.custo;
  if (!wholeCount(tokens) || !wholeCount(segundos)) return { problem: 'custo.tokens and custo.segundos must be whole numbers, 0 or more' };
  return { veredito, motivos: kept, custo: { tokens, segundos } };
}

// The rejection codes of a turn: the word before the colon of each reason.
const codesOf = (turno) => new Set(turno.motivos.filter((m) => m.includes(':')).map((m) => m.split(':')[0].trim()).filter(Boolean));

export function revisarTexto(folder, projetoNome, videoNome, turnText) {
  const input = readTurn(turnText);
  if (input.problem) return { recorded: false, reason: 'invalid-turn', message: input.problem };
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { recorded: false, ...refusal };
  if (!fs.existsSync(path.join(dir, ENTREGA, TEXTO_DO_POST))) return { recorded: false, reason: 'no-texto', projeto, video };

  const file = path.join(dir, TEXTO_DO_POST_REVISAO);
  const saved = fs.existsSync(file) ? readJson(file) : { turnos: [] };
  if (!isObject(saved) || !Array.isArray(saved.turnos)) {
    return { recorded: false, reason: 'invalid-turns', projeto, video, message: `${TEXTO_DO_POST_REVISAO} is damaged` };
  }
  const last = saved.turnos.at(-1);
  const novoCiclo = !last || last.aprovado || last.escalado;
  const ciclo = last ? last.ciclo + (novoCiclo ? 1 : 0) : 1;
  const turno = novoCiclo ? 1 : last.turno + 1;
  const aprovado = input.veredito === 'aprovado';
  const escalado = !aprovado && turno >= MAX_TURNOS;
  const record = { ciclo, turno, aprovado, escalado, veredito: input.veredito, motivos: input.motivos, custo: input.custo, registradoEm: new Date().toISOString() };

  let codigoRepetido = null;
  if (escalado) {
    const cycle = [...saved.turnos.filter((t) => t.ciclo === ciclo), record].map(codesOf);
    codigoRepetido = [...cycle.at(-1)].find((code) => cycle.every((codes) => codes.has(code))) ?? null;
  }

  const { data, message } = updateVideoRecord(dir, (current) => {
    current.turnosInternos = (current.turnosInternos ?? 0) + 1;
    current.tokensInternos = (current.tokensInternos ?? 0) + input.custo.tokens;
    current.segundosInternos = (current.segundosInternos ?? 0) + input.custo.segundos;
  });
  if (!data) return { recorded: false, reason: 'invalid-document', projeto, video, message };
  fs.writeFileSync(file, `${JSON.stringify({ turnos: [...saved.turnos, record] }, null, 2)}\n`);
  return {
    recorded: true,
    projeto,
    video,
    ciclo,
    turno,
    aprovado,
    motivos: input.motivos,
    proximo: aprovado ? 'mostrar' : (escalado ? 'escalar' : 'corrigir'),
    codigoRepetido,
    status: data.status,
    gate: data.gate ?? null,
    turnosInternos: data.turnosInternos,
    tokensInternos: data.tokensInternos,
    segundosInternos: data.segundosInternos,
  };
}
