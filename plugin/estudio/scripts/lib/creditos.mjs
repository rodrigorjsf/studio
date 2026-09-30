// Nível 2's Higgsfield credits, held behind her Gates. Nothing is paid before she approves the
// cost, and spending about 20% over what she approved stops the work.
//
//   aprovar-creditos   her credit Gate: the Plano's estimate (or a new one she approved after a
//                      stop), her balance as the connector's `balance` reads it, the Kit's budget
//   gastar-creditos    before each generation: the balance covers it, its prompt forbids text,
//                      and the credits spent stay within the approved estimate plus ~20%
//   aprovar-higgsedit  her Higgsedit Gate: only on her explicit request (her words), for a part of
//                      the Vídeo or all of it, with its own estimate, balance and budget check
//   gastar-higgsedit   before each paid Higgsedit run: the same balance and ~20% stop, on its own
//                      estimate
//
// The two are separate budgets of the same Vídeo, each with its own Gate and its own stop; the
// Kit's budget (per Vídeo, per month) holds both together.
// "Spent" is the sum of the costs the connector quotes for each generation or run, as the persona
// passes them before submitting; the balance is read again before each one.
import fs from 'node:fs';
import path from 'node:path';
import { isFinished, nfc } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import {
  GERADOS, GERADOS_REGISTRO, HIGGSEDIT, HIGGSEDIT_PEDIDOS, HIGGSEDIT_REGISTRO, KIT, PLANO, VIDEO_DOC, VIDEO_KIT,
} from './layout.mjs';
import { findVideo, updateVideoRecord } from './video.mjs';
import { isObject, readJson } from './valores.mjs';

// Spending more than this share over the approved estimate stops the work (~20%).
const MARGEM = 0.2;
const isCredits = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
// Credits are kept to the cent: quoted costs such as 1.75 per second add up without float noise.
const toCents = (v) => Math.round(v * 100) / 100;
const limiteDe = (estimados) => toCents(estimados * (1 + MARGEM));

// A budget's fields in video.md, and the refusal a spend gets before its Gate.
const GERACAO = {
  estimados: 'creditosEstimados', gastos: 'creditosGastos', aprovadoEm: 'creditosAprovadosEm', paradoEm: 'creditosParadosEm',
  semAprovacao: 'no-credit-approval',
};
const HIGGSEDIT_CREDITOS = {
  estimados: 'higgseditCreditosEstimados', gastos: 'higgseditCreditosGastos', aprovadoEm: 'higgseditAprovadoEm', paradoEm: 'higgseditParadoEm',
  semAprovacao: 'no-higgsedit-approval',
};
const outro = (budget) => (budget === GERACAO ? HIGGSEDIT_CREDITOS : GERACAO);
const creditsOr0 = (v) => (isCredits(v) ? v : 0);
// What a budget holds of the Kit's: the larger of its estimate and what it spent.
const usedBy = (record, budget) => Math.max(creditsOr0(record[budget.estimados]), creditsOr0(record[budget.gastos]));
const approvedIn = (record, budget, month) => typeof record[budget.aprovadoEm] === 'string' && record[budget.aprovadoEm].startsWith(month);

// The JSON input of a command, checked against the keys it accepts (nothing else is written).
function readInput(text, accepted, required) {
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
function creditVideo(folder, projetoNome, videoNome) {
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
// in `month`: for each budget approved that month, the larger of its estimate and what it spent.
function approvedThisMonth(videosDir, self, month) {
  return fs.readdirSync(videosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== self)
    .reduce((sum, entry) => {
      let data;
      try {
        data = parseFrontmatter(fs.readFileSync(path.join(videosDir, entry.name, VIDEO_DOC), 'utf8'));
      } catch {
        return sum;
      }
      return sum + [GERACAO, HIGGSEDIT_CREDITOS].filter((b) => approvedIn(data, b, month)).reduce((s, b) => s + usedBy(data, b), 0);
    }, 0);
}

// Her Gate on one budget of a Nível 2 Vídeo whose Plano she approved: a new total estimate,
// never below what that budget already spent, her balance covering what is still to be spent, and
// the Kit's budget covering it with the Vídeo's other budget. Returns its JSON answer.
function approve(found, budget, creditosEstimados, saldo) {
  const { projeto, video, dir, record, kit, status } = found;
  const refuse = (reason, extra = {}) => ({ approved: false, reason, projeto, video, ...extra });
  if (record.nivel !== 2) return refuse('not-nivel-2');
  if (isFinished(status)) return refuse('finished', { status });
  const plano = readJson(path.join(dir, PLANO));
  if (!plano?.aprovadoEm) return refuse('plano-not-approved');
  if (!isCredits(creditosEstimados)) return refuse('no-estimate');

  const gastos = creditsOr0(record[budget.gastos]);
  if (creditosEstimados < gastos) return refuse('below-spent', { creditosEstimados, creditosGastos: gastos });
  if (saldo < creditosEstimados - gastos) return refuse('insufficient-balance', { saldo, creditosEstimados, creditosGastos: gastos });
  const orcamento = { porVideo: kit?.creditos?.porVideo ?? null, porMes: kit?.creditos?.porMes ?? null };
  const month = new Date().toISOString().slice(0, 7);
  const doVideo = usedBy(record, outro(budget));
  const doMes = orcamento.porMes === null
    ? 0
    : approvedThisMonth(path.join(dir, '..'), path.basename(dir), month) + (approvedIn(record, outro(budget), month) ? doVideo : 0);
  if ((orcamento.porVideo !== null && doVideo + creditosEstimados > orcamento.porVideo)
    || (orcamento.porMes !== null && doMes + creditosEstimados > orcamento.porMes)) {
    return refuse('over-budget', { creditosEstimados, orcamento, aprovadosNoVideo: doVideo, aprovadosNoMes: doMes });
  }

  const { data, message } = updateVideoRecord(dir, (current) => {
    current[budget.estimados] = creditosEstimados;
    current[budget.gastos] = gastos;
    current[budget.aprovadoEm] = new Date().toISOString();
    // It closes only the Gate its own stop opened: never another Gate of hers still open, nor
    // the one the other budget's stop holds open.
    if (current[budget.paradoEm]) {
      delete current[budget.paradoEm];
      if (!current[outro(budget).paradoEm]) current.gate = null;
    }
    current.gates = (current.gates ?? 0) + 1;
  });
  if (!data) return refuse('invalid-document', { message });
  return {
    approved: true,
    projeto,
    video,
    creditosEstimados,
    limite: limiteDe(creditosEstimados),
    creditosGastos: data[budget.gastos],
    saldo,
    gates: data.gates,
    aprovadoEm: data[budget.aprovadoEm],
  };
}

function balanceProblem(input) {
  if (!isCredits(input.saldo)) return 'saldo must be her balance in credits, 0 or more';
  if ('creditosEstimados' in input && !isCredits(input.creditosEstimados)) return 'creditosEstimados must be a number of credits, 0 or more';
  return null;
}

export function aprovarCreditos(folder, projetoNome, videoNome, inputText) {
  const { input, problem } = readInput(inputText, ['saldo', 'creditosEstimados'], ['saldo']);
  const invalid = problem ?? balanceProblem(input);
  if (invalid) return { approved: false, reason: 'invalid-input', message: invalid };
  const found = creditVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { approved: false, ...found.refusal };
  const plano = readJson(path.join(found.dir, PLANO));
  return approve(found, GERACAO, input.creditosEstimados ?? plano?.creditosEstimados, input.saldo);
}

// The part of the Vídeo Higgsedit montages: all of it, or one stretch of her Master in seconds.
const VIDEO_INTEIRO = 'video-inteiro';
function trechoProblem(trecho) {
  if (trecho === VIDEO_INTEIRO) return null;
  const isSecond = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (!isObject(trecho) || Object.keys(trecho).sort().join() !== 'fim,inicio' || !isSecond(trecho.inicio) || !isSecond(trecho.fim) || trecho.fim <= trecho.inicio) {
    return `trecho must be "${VIDEO_INTEIRO}" or {"inicio": <s>, "fim": <s>}, the stretch of her Master in seconds, fim after inicio`;
  }
  return null;
}

export function aprovarHiggsedit(folder, projetoNome, videoNome, inputText) {
  const fields = ['pedido', 'trecho', 'creditosEstimados', 'saldo'];
  const { input, problem } = readInput(inputText, fields, ['trecho', 'creditosEstimados', 'saldo']);
  if (problem) return { approved: false, reason: 'invalid-input', message: problem };
  // Higgsedit never runs on the studio's own initiative, nor on her Autonomia: only when she asked.
  if (typeof input.pedido !== 'string' || input.pedido.trim() === '') {
    return { approved: false, reason: 'no-request', message: 'pedido must be her explicit request for a Higgsedit feature, in her words' };
  }
  const invalid = balanceProblem(input) ?? trechoProblem(input.trecho);
  if (invalid) return { approved: false, reason: 'invalid-input', message: invalid };
  const found = creditVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { approved: false, ...found.refusal };
  const pedido = input.pedido.trim();
  const out = approve(found, HIGGSEDIT_CREDITOS, input.creditosEstimados, input.saldo);
  if (!out.approved) return out;
  const file = path.join(found.dir, ...HIGGSEDIT_PEDIDOS.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const registrados = readJson(file) ?? [];
  registrados.push({ pedido, trecho: input.trecho, creditosEstimados: input.creditosEstimados, aprovadoEm: out.aprovadoEm });
  fs.writeFileSync(file, `${JSON.stringify(registrados, null, 2)}\n`);
  return { ...out, pedido, trecho: input.trecho };
}

// One paid item (a generation or a Higgsedit run) against a budget: her Gate on it, no stop and no
// open Gate, the item's own `refusal` (a reason, or null), the balance, a new file, and the ~20%
// limit. `entry` is what the ledger keeps of it.
function spend(found, budget, { arquivo, creditos, saldo }, { pasta, registro, entry, refusal = null }) {
  const { projeto, video, dir, record } = found;
  const refuse = (reason, extra = {}) => ({ authorized: false, reason, projeto, video, ...extra });
  if (!record[budget.aprovadoEm] || !isCredits(record[budget.estimados])) return refuse(budget.semAprovacao);
  // Stopped after an overrun, or any Gate she has not answered: nothing more until she decides.
  // Only her new approval of this budget lifts its stop; closing the Gate by hand does not.
  if (record[budget.paradoEm] || record.gate === 'aberto') return refuse('awaiting-approval');
  if (refusal) return refuse(refusal);
  if (saldo < creditos) return refuse('insufficient-balance', { saldo, creditos });

  const ledgerFile = path.join(dir, ...registro.split('/'));
  const ledger = readJson(ledgerFile) ?? [];
  const file = nfc(arquivo);
  if (ledger.some((item) => item.arquivo === file)) return refuse('duplicate-file', { arquivo: file });
  const gastos = creditsOr0(record[budget.gastos]);
  const estimados = record[budget.estimados];
  const limite = limiteDe(estimados);
  if (gastos + creditos > limite + 1e-9) {
    const { data, message } = updateVideoRecord(dir, (current) => {
      current.gate = 'aberto';
      current[budget.paradoEm] = new Date().toISOString();
    });
    if (!data) return refuse('invalid-document', { message });
    return refuse('over-limit', { creditos, creditosGastos: gastos, creditosEstimados: estimados, limite });
  }

  const { data, message } = updateVideoRecord(dir, (current) => {
    current[budget.gastos] = toCents(gastos + creditos);
  });
  if (!data) return refuse('invalid-document', { message });
  fs.mkdirSync(path.join(dir, pasta), { recursive: true });
  ledger.push({ arquivo: file, ...entry, creditos, registradoEm: new Date().toISOString() });
  fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  return {
    authorized: true,
    projeto,
    video,
    arquivo: file,
    destino: path.join(dir, ...file.split('/')),
    creditosGastos: data[budget.gastos],
    creditosEstimados: estimados,
    limite,
    restante: toCents(limite - data[budget.gastos]),
  };
}

// A prompt must forbid text in the image, in English or pt-BR ("no text", "sem texto"): every
// word she sees is drawn at the montage, sharp and correct.
const FORBIDS_TEXT = /\b(no text|sem texto)\b/i;
// What a generation may be saved as: one image or clip, directly inside the Vídeo's `gerados/`.
const GENERATED_FILE = /^[^/\\]+\.(png|jpe?g|webp|mp4|mov)$/i;
const SPEND_FIELDS = ['arquivo', 'creditos', 'saldo', 'modelo', 'prompt'];

// A file directly inside `pasta` that `extensions` accepts ("<pasta>/<name>.<ext>"); `what` names it.
function fileProblem(arquivo, { pasta, extensions, what, example }) {
  const parts = typeof arquivo === 'string' ? arquivo.split('/') : [];
  if (parts.length !== 2 || parts[0] !== pasta || !extensions.test(parts[1]) || parts[1].startsWith('.')) {
    return `arquivo must be ${what} directly inside "${pasta}/", like "${example}"`;
  }
  return null;
}

function spendProblem(input) {
  if (!isCredits(input.creditos)) return 'creditos must be the cost the connector quotes, 0 or more';
  return balanceProblem(input);
}

function generationProblem(input) {
  if (typeof input.modelo !== 'string' || input.modelo.trim() === '') return 'modelo must name the Higgsfield model';
  if (typeof input.prompt !== 'string' || input.prompt.trim() === '') return 'prompt must be the text sent to the model';
  return fileProblem(input.arquivo, { pasta: GERADOS, extensions: GENERATED_FILE, what: 'an image or clip', example: `${GERADOS}/03_broll_ampulheta.mp4` });
}

export function gastarCreditos(folder, projetoNome, videoNome, inputText) {
  const { input, problem } = readInput(inputText, SPEND_FIELDS, SPEND_FIELDS);
  const invalid = problem ?? spendProblem(input) ?? generationProblem(input);
  if (invalid) return { authorized: false, reason: 'invalid-input', message: invalid };
  const found = creditVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { authorized: false, ...found.refusal };
  return spend(found, GERACAO, input, {
    pasta: GERADOS,
    registro: GERADOS_REGISTRO,
    entry: { modelo: input.modelo, prompt: input.prompt },
    refusal: FORBIDS_TEXT.test(input.prompt) ? null : 'prompt-allows-text',
  });
}

// What a Higgsedit run may be saved as: one video, directly inside the Vídeo's `higgsedit/`.
const MONTAGE_FILE = /^[^/\\]+\.(mp4|mov)$/i;
const HIGGSEDIT_FIELDS = ['arquivo', 'creditos', 'saldo'];

export function gastarHiggsedit(folder, projetoNome, videoNome, inputText) {
  const { input, problem } = readInput(inputText, HIGGSEDIT_FIELDS, HIGGSEDIT_FIELDS);
  const invalid = problem ?? spendProblem(input)
    ?? fileProblem(input.arquivo, { pasta: HIGGSEDIT, extensions: MONTAGE_FILE, what: 'a video', example: `${HIGGSEDIT}/01_transicao_3d.mp4` });
  if (invalid) return { authorized: false, reason: 'invalid-input', message: invalid };
  const found = creditVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { authorized: false, ...found.refusal };
  // Each run keeps the stretch of the request it was paid for, so every file keeps its place.
  const trecho = readJson(path.join(found.dir, ...HIGGSEDIT_PEDIDOS.split('/')))?.at(-1)?.trecho ?? null;
  return spend(found, HIGGSEDIT_CREDITOS, input, { pasta: HIGGSEDIT, registro: HIGGSEDIT_REGISTRO, entry: { trecho } });
}
