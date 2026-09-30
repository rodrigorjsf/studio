// `aprovar-automatico`: her Autonomia turns an eligible Gate into an automatic approval the
// Diretor records on her behalf. It is never silent: the Gate is counted like any other and
// in `aprovacoesAutomaticas`, listed with her Autonomia and the time in the Vídeo's
// `aprovacoes-automaticas.json` (which `estado` reports), and the Diretor tells her in one line.
//
// What each Autonomia lets the Diretor approve (the Perfil's words for her):
//   baixa  nothing: every approval stops for her;
//   média  no Gate: what the Kit de marca already answers is not asked in the briefing, and a Kit
//          that defines the style merges the Plano and Quadros into one Gate, but the Plano, the
//          cost and the review before the final video still stop for her;
//   alta   the Plano and Quadros de estilo Gates; it stops only for her review of the edit.
// Some Gates are hers whatever the Autonomia: credits and Higgsedit (money), the Pré-corte (it
// changes her video), the Kit de marca and its learnings (her identity), and her review.
import fs from 'node:fs';
import path from 'node:path';
import { estado } from './estado.mjs';
import { APROVACOES_AUTOMATICAS } from './layout.mjs';
import { aprovarPlano } from './plano.mjs';
import { findVideo, registrarVideo } from './video.mjs';

const AUTOMATIC = { baixa: [], média: [], alta: ['plano', 'quadros', 'plano-e-quadros'] };
const NEVER_AUTOMATIC = ['creditos', 'higgsedit', 'precorte', 'kit', 'revisao', 'aprendizados'];
const GATES = new Set([...Object.values(AUTOMATIC).flat(), ...NEVER_AUTOMATIC]);

// The automatic approvals already recorded in the Vídeo folder `dir`: {aprovacoes} (none yet: [])
// or {problem} when the record is damaged, so a new entry never erases the old ones.
export function readAutomaticApprovals(dir) {
  const file = path.join(dir, APROVACOES_AUTOMATICAS);
  if (!fs.existsSync(file)) return { aprovacoes: [] };
  try {
    const { aprovacoes } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(aprovacoes)) return { aprovacoes };
  } catch {
    // reported below
  }
  return { problem: `${APROVACOES_AUTOMATICAS} is not a list of automatic approvals` };
}

export function aprovarAutomatico(folder, projetoNome, videoNome, gate) {
  if (!GATES.has(gate)) return { approved: false, reason: 'invalid-gate', message: `gate must be one of: ${[...GATES].join(', ')}` };
  if (NEVER_AUTOMATIC.includes(gate)) return { approved: false, reason: 'never-automatic', gate };
  const { autonomia } = estado(folder).perfil ?? {};
  if (!Object.hasOwn(AUTOMATIC, autonomia ?? '')) return { approved: false, reason: 'no-autonomia' };
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { approved: false, ...refusal };
  if (!AUTOMATIC[autonomia].includes(gate)) return { approved: false, reason: 'not-eligible', projeto, video, autonomia, gate };

  const { aprovacoes, problem } = readAutomaticApprovals(dir);
  if (problem) return { approved: false, reason: 'invalid-record', projeto, video, message: problem };

  const approval = aprovarPlano(folder, projetoNome, videoNome, gate);
  if (!approval.approved) return approval;
  aprovacoes.push({ gate, autonomia, em: new Date().toISOString() });
  fs.writeFileSync(path.join(dir, APROVACOES_AUTOMATICAS), `${JSON.stringify({ aprovacoes }, null, 2)}\n`);
  const { aprovacoesAutomaticas } = registrarVideo(folder, projetoNome, videoNome, '{"somar": {"aprovacoesAutomaticas": 1}}');
  return { ...approval, automatica: true, autonomia, gate, aprovacoesAutomaticas, registro: APROVACOES_AUTOMATICAS };
}
