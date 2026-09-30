// Nível 2's Higgsfield credits, held behind her credit Gate. Nothing is generated before she
// approves the cost, and spending about 20% over what she approved stops the work.
//
//   aprovar-creditos  her credit Gate: the Plano's estimate (or a new one she approved after a
//                     stop), her balance as the connector's `balance` reads it, the Kit's budget
//   gastar-creditos   before each generation: the balance covers it, its prompt forbids text,
//                     and the credits spent stay within the approved estimate plus ~20%
//
// "Spent" is the sum of the costs the connector quotes for each generation, as the Artista
// generativo passes them before submitting; the balance is read again before each one.
import fs from 'node:fs';
import path from 'node:path';
import { isFinished, nfc } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { GERADOS, GERADOS_REGISTRO, KIT, PLANO, VIDEO_DOC, VIDEO_KIT } from './layout.mjs';
import { findVideo, updateVideoRecord } from './video.mjs';

// Spending more than this share over the approved estimate stops the work (~20%).
export const MARGEM = 0.2;
const isCredits = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const limiteDe = (estimados) => Math.round(estimados * (1 + MARGEM) * 100) / 100;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

// The JSON input of a command, checked against the keys it accepts (nothing else is written).
export function readInput(text, accepted, required) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (err) {
    return { problem: `not valid JSON (${err.message})` };
  }
  if (!isObject(input)) return { problem: `must be a JSON object with ${accepted.join(', ')}` };
  const other = Object.keys(input).find((key) => !accepted.includes(key));
  if (other) return { problem: `${other} is not accepted here (${accepted.join(', ')})` };
  const missing = required.find((key) => !(key in input));
  if (missing) return { problem: `${missing} is missing` };
  return { input };
}

// The Vídeo, its record and its Kit (its own Kit snapshot when it has one), or the refusal.
export function creditVideo(folder, projetoNome, videoNome) {
  const found = findVideo(folder, projetoNome, videoNome);
  if (found.refusal) return found;
  const { projeto, video, dir } = found;
  let record;
  try {
    record = parseFrontmatter(fs.readFileSync(path.join(dir, VIDEO_DOC), 'utf8'));
  } catch (err) {
    return { refusal: { reason: 'invalid-document', projeto, video, message: err.message } };
  }
  const ownKit = path.join(dir, VIDEO_KIT);
  const kit = readJson(fs.existsSync(ownKit) ? ownKit : path.join(dir, '..', '..', KIT));
  const status = typeof record.status === 'string' ? nfc(record.status) : null;
  return { projeto, video, dir, record, kit, status };
}

// The credits her other Vídeos of the Projeto (in `videosDir`, all but `self`) were approved for
// in the current month: for each, the larger of its estimate and what it spent.
function approvedThisMonth(videosDir, self) {
  const month = new Date().toISOString().slice(0, 7);
  return fs.readdirSync(videosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== self)
    .reduce((sum, entry) => {
      let data;
      try {
        data = parseFrontmatter(fs.readFileSync(path.join(videosDir, entry.name, VIDEO_DOC), 'utf8'));
      } catch {
        return sum;
      }
      if (typeof data.creditosAprovadosEm !== 'string' || !data.creditosAprovadosEm.startsWith(month)) return sum;
      const used = Math.max(isCredits(data.creditosEstimados) ? data.creditosEstimados : 0, isCredits(data.creditosGastos) ? data.creditosGastos : 0);
      return sum + used;
    }, 0);
}

export function aprovarCreditos(folder, projetoNome, videoNome, inputText) {
  const { input, problem } = readInput(inputText, ['saldo', 'creditosEstimados'], ['saldo']);
  if (problem) return { approved: false, reason: 'invalid-input', message: problem };
  if (!isCredits(input.saldo)) return { approved: false, reason: 'invalid-input', message: 'saldo must be her balance in credits, 0 or more' };
  if ('creditosEstimados' in input && !isCredits(input.creditosEstimados)) {
    return { approved: false, reason: 'invalid-input', message: 'creditosEstimados must be a number of credits, 0 or more' };
  }
  const found = creditVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { approved: false, ...found.refusal };
  const { projeto, video, dir, record, kit, status } = found;
  const refuse = (reason, extra = {}) => ({ approved: false, reason, projeto, video, ...extra });
  if (record.nivel !== 2) return refuse('not-nivel-2');
  if (isFinished(status)) return refuse('finished', { status });
  const plano = readJson(path.join(dir, PLANO));
  if (!plano?.aprovadoEm) return refuse('plano-not-approved');

  const creditosEstimados = input.creditosEstimados ?? plano.creditosEstimados;
  if (!isCredits(creditosEstimados)) return refuse('no-estimate');
  // After a stop, she approves a new total estimate, never below what was already spent; her
  // balance must cover what is still to be spent.
  const gastos = isCredits(record.creditosGastos) ? record.creditosGastos : 0;
  if (creditosEstimados < gastos) return refuse('abaixo-do-gasto', { creditosEstimados, creditosGastos: gastos });
  const { saldo } = input;
  if (saldo < creditosEstimados - gastos) return refuse('saldo-insuficiente', { saldo, creditosEstimados, creditosGastos: gastos });
  const orcamento = { porVideo: kit?.creditos?.porVideo ?? null, porMes: kit?.creditos?.porMes ?? null };
  const doMes = orcamento.porMes === null ? 0 : approvedThisMonth(path.join(dir, '..'), path.basename(dir));
  if ((orcamento.porVideo !== null && creditosEstimados > orcamento.porVideo)
    || (orcamento.porMes !== null && doMes + creditosEstimados > orcamento.porMes)) {
    return refuse('acima-do-orcamento', { creditosEstimados, orcamento, aprovadosNoMes: doMes });
  }

  const { data, message } = updateVideoRecord(dir, (current) => {
    current.creditosEstimados = creditosEstimados;
    current.creditosGastos = gastos;
    current.creditosAprovadosEm = new Date().toISOString();
    current.gate = null;
    current.gates = (current.gates ?? 0) + 1;
  });
  if (!data) return refuse('invalid-document', { message });
  return {
    approved: true,
    projeto,
    video,
    creditosEstimados,
    limite: limiteDe(creditosEstimados),
    creditosGastos: data.creditosGastos,
    saldo,
    gates: data.gates,
  };
}

// A prompt must forbid text in the image, in English or pt-BR ("no text", "sem texto"): every
// word she sees is drawn at the montage, sharp and correct.
const FORBIDS_TEXT = /\b(no text|sem texto)\b/i;
// What a generation may be saved as: one image or clip, directly inside the Vídeo's `gerados/`.
const GENERATED_FILE = /^[^/\\]+\.(png|jpe?g|webp|mp4|mov)$/i;
const SPEND_FIELDS = ['arquivo', 'creditos', 'saldo', 'modelo', 'prompt'];

function spendProblem(input) {
  if (!isCredits(input.creditos)) return 'creditos must be the cost the connector quotes, 0 or more';
  if (!isCredits(input.saldo)) return 'saldo must be her balance in credits, 0 or more';
  if (typeof input.modelo !== 'string' || input.modelo.trim() === '') return 'modelo must name the Higgsfield model';
  if (typeof input.prompt !== 'string' || input.prompt.trim() === '') return 'prompt must be the text sent to the model';
  const parts = typeof input.arquivo === 'string' ? input.arquivo.split('/') : [];
  if (parts.length !== 2 || parts[0] !== GERADOS || !GENERATED_FILE.test(parts[1]) || parts[1].startsWith('.')) {
    return `arquivo must be an image or clip directly inside "${GERADOS}/", like "${GERADOS}/03_broll_ampulheta.mp4"`;
  }
  return null;
}

export function gastarCreditos(folder, projetoNome, videoNome, inputText) {
  const { input, problem } = readInput(inputText, SPEND_FIELDS, SPEND_FIELDS);
  const invalid = problem ?? spendProblem(input);
  if (invalid) return { authorized: false, reason: 'invalid-input', message: invalid };
  const found = creditVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { authorized: false, ...found.refusal };
  const { projeto, video, dir, record } = found;
  const refuse = (reason, extra = {}) => ({ authorized: false, reason, projeto, video, ...extra });
  if (!record.creditosAprovadosEm || !isCredits(record.creditosEstimados)) return refuse('sem-aprovacao');
  // Stopped after an overrun (or any Gate she has not answered): nothing more until she decides.
  if (record.gate === 'aberto') return refuse('aguardando-aprovacao');
  if (!FORBIDS_TEXT.test(input.prompt)) return refuse('prompt-permite-texto');
  const { creditos, saldo } = input;
  if (saldo < creditos) return refuse('saldo-insuficiente', { saldo, creditos });

  const ledgerFile = path.join(dir, ...GERADOS_REGISTRO.split('/'));
  const ledger = readJson(ledgerFile) ?? [];
  const arquivo = nfc(input.arquivo);
  if (ledger.some((entry) => entry.arquivo === arquivo)) return refuse('arquivo-repetido', { arquivo });
  const gastos = record.creditosGastos ?? 0;
  const limite = limiteDe(record.creditosEstimados);
  if (gastos + creditos > limite + 1e-9) {
    const { data, message } = updateVideoRecord(dir, (current) => { current.gate = 'aberto'; });
    if (!data) return refuse('invalid-document', { message });
    return refuse('acima-do-limite', { creditos, creditosGastos: gastos, creditosEstimados: record.creditosEstimados, limite });
  }

  const { data, message } = updateVideoRecord(dir, (current) => {
    current.creditosGastos = Math.round((gastos + creditos) * 100) / 100;
  });
  if (!data) return refuse('invalid-document', { message });
  fs.mkdirSync(path.join(dir, GERADOS), { recursive: true });
  ledger.push({ arquivo, modelo: input.modelo, creditos, prompt: input.prompt, registradoEm: new Date().toISOString() });
  fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  return {
    authorized: true,
    projeto,
    video,
    arquivo,
    destino: path.join(dir, ...arquivo.split('/')),
    creditosGastos: data.creditosGastos,
    creditosEstimados: record.creditosEstimados,
    limite,
    restante: Math.round((limite - data.creditosGastos) * 100) / 100,
  };
}
