// `arquivar`: the end of a Vídeo's Esteira. After the Entrega the Diretor proposes what the
// studio learned from this Vídeo (her notes, what she changed, what she asked for) as changes
// to the Projeto's Kit de marca, and asks her about each one. This command records every
// proposal with her answer in the Vídeo's `aprendizados.json`, applies to the Kit only the ones
// she approved — through `editar-kit`, so the new Kit is re-validated and existing Vídeos keep
// the Kit they started with — and moves the Vídeo to Arquivado. Nothing is applied on her
// Autonomia: a learning she did not approve never reaches the Kit. A learning that would break
// the Kit is refused with its problems, and nothing changes.
//
// Input: {"aprendizados": [{"descricao": "<pt-BR, for her>", "kit": {<Kit fields that change>}, "aprovado": true|false}]}
// `kit` follows editar-kit: objects merge field by field; any other value (a list too) replaces
// the old one whole. Approved learnings are merged in order into one Kit change.
import fs from 'node:fs';
import path from 'node:path';
import { editarKit, LOCKED, merge } from './editar.mjs';
import { APRENDIZADOS } from './layout.mjs';
import { locate } from './revisao.mjs';
import { updateVideoRecord } from './video.mjs';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function learningProblem(item, i) {
  const where = `aprendizados[${i}]`;
  if (!isObject(item)) return `${where} must be an object with descricao, kit and aprovado`;
  if (typeof item.descricao !== 'string' || item.descricao.trim() === '') return `${where}.descricao must be the learning, in words`;
  if (!isObject(item.kit)) return `${where}.kit must be a JSON object holding only the Kit fields that change`;
  const locked = LOCKED.find((key) => key in item.kit);
  if (locked) return `${where}.kit.${locked} cannot be a learning`;
  if (typeof item.aprovado !== 'boolean') return `${where}.aprovado must be her answer: true or false`;
  return null;
}

function readLearnings(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (err) {
    return { problem: `not valid JSON (${err.message})` };
  }
  if (!Array.isArray(input?.aprendizados)) return { problem: 'aprendizados must be a list (empty when there is nothing to learn)' };
  const problem = input.aprendizados.map(learningProblem).find(Boolean);
  return problem ? { problem } : { aprendizados: input.aprendizados };
}

export function arquivar(folder, projetoNome, videoNome, inputText) {
  const { aprendizados, problem } = readLearnings(inputText);
  if (problem) return { archived: false, reason: 'invalid-input', message: problem };
  const { projeto, video, dir, status, refusal } = locate(folder, projetoNome, videoNome);
  if (refusal) return { archived: false, ...refusal };
  if (status !== 'Entregue') return { archived: false, reason: 'not-delivered', projeto, video, status };

  const aprovados = aprendizados.filter((item) => item.aprovado);
  let kitAprovadoEm = null;
  if (aprovados.length > 0) {
    const edit = aprovados.reduce((all, item) => merge(all, item.kit), {});
    const result = editarKit(folder, projetoNome, JSON.stringify(edit));
    if (!result.edited) {
      const { edited, reason, ...details } = result;
      return { archived: false, ...details, reason: reason === 'invalid' ? 'invalid-learning' : reason, projeto, video };
    }
    kitAprovadoEm = result.aprovadoEm;
  }

  const arquivadoEm = new Date().toISOString();
  fs.writeFileSync(path.join(dir, APRENDIZADOS), `${JSON.stringify({ aprendizados, kitAprovadoEm, registradoEm: arquivadoEm }, null, 2)}\n`);
  const { data, message } = updateVideoRecord(dir, (current) => {
    current.status = 'Arquivado';
    current.gate = null;
    current.arquivadoEm = arquivadoEm;
  });
  if (!data) return { archived: false, reason: 'invalid-document', projeto, video, message };
  return {
    archived: true, projeto, video, status: data.status, arquivadoEm, aplicados: aprovados.length, kitEditado: kitAprovadoEm !== null, kitAprovadoEm,
  };
}
