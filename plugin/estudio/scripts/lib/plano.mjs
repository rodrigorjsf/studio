// `plano`: checks a Vídeo's Plano (`plano.json`) against what the ingest measured, so nothing
// reaches the Criadora that breaks a standing rule: every insert starts on a word she really
// says, and never before it is said; nothing is placed over the Zona do rosto; text sits inside
// the Área livre; every Print exists and has its highlighted phrase.
//
// The Plano, written by the Roteirista-estrategista (pt-BR keys, like the Kit):
//
//   {
//     "schemaVersion": 1,
//     "tempoEstimadoMin": 30,            studio minutes until the Entrega, as she is told
//     "creditosEstimados": null,         Nível 2 only: Higgsfield credits (a number), else null
//     "direcoes": [{"rotulo": "A", "resumo": "…", "recomendada": true}, …],   two or three
//     "pedidosDela": ["…"],              what she asked that the repertoire would not suggest
//     "resumosNotion": [{"nivel": "projeto", "geradoEm": ISO}, …],   the Resumos Notion the Plano
//                                        drew on (the Projeto's, the Vídeo's), each by its date;
//                                        required for every Resumo that exists
//     "cenas": [{
//       "tipo": "camera-motion",         a scene of the repertoire (SCENES)
//       "inicio": 2.6, "fim": 4,         seconds on the Master's clock
//       "visual": "…",                   what she sees then, in pt-BR
//       "gatilho": {"indice": 6, "palavra": "70%"},   the Palavra-gatilho: its index in
//                                        palavras.json and the word; only `camera` may omit it
//       "print": {"arquivo": "noticia.png", "frase": "…"},    a file of prints/ and the phrase
//                                        the highlighter covers, when the scene shows a Print
//       "elementos": [{"tipo": "texto", "area": {x, y, largura, altura}}]    what is drawn over
//                                        the camera, as fractions of the frame from its top-left
//     }, …],
//     "quadros": [{"rotulo": "A — a notícia", "tempo": 1.5, "arquivo": "quadros/A.png"}, …],
//     "aprovadoEm": null, "quadrosAprovadosEm": null     stamped by `aprovar-plano` only
//   }
import fs from 'node:fs';
import path from 'node:path';
import { nfc } from './estado.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { boxProblem } from './ingest.mjs';
import { kitOfVideo } from './kit.mjs';
import { PALAVRAS, PLANO, PRINTS, VIDEO_DOC, ZONA_DO_ROSTO } from './layout.mjs';
import { notionLevels } from './notion.mjs';
import { findVideo, kitGaps, registrarVideo } from './video.mjs';
import { readJson } from './valores.mjs';

// The scene repertoire of the editorial direction, by the names the Plano uses.
export const SCENES = ['camera', 'camera-enfase', 'camera-motion', 'camera-espaco', 'aula', 'demo', 'cena', 'broll', 'transformacao'];
// Scenes that move or scale the camera (a split, a card, a push-in, a shift): the Zona do rosto
// measured on the full frame no longer says where her face is, so what they draw is not checked
// against it here; the Quadros de estilo and the Críticos judge those on real frames.
const MOVING_CAMERA = new Set(['camera-enfase', 'camera-espaco', 'aula', 'demo', 'transformacao']);
// Scenes with no camera at all (full-screen content): nothing there can cover her face.
const NO_CAMERA = new Set(['cena', 'broll']);
// Seconds: word timings are rounded to the millisecond.
const SAME_TIME = 0.001;
// The Área livre of a vertical 9:16 frame (1920 px tall): the apps cover about 250 px at the top
// and 420 px at the bottom (buttons, caption, handle). Text sits between, as fractions of the frame.
const AREA_LIVRE_9_16 = { topo: 250 / 1920, base: 1 - 420 / 1920 };

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
// A spoken word as the Plano and the transcript both write it: composed accents, no case, no
// punctuation around it ("pesquisa," is "pesquisa").
const plain = (word) => nfc(String(word)).toLowerCase().replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '');

const round = (v) => Math.round(v * 10000) / 10000;
const overlaps = (a, b) => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;

// The problems of one scene (1-based `n`), in reading order.
function sceneProblems(cena, n, { palavras, duracao, zona, formato, prints }) {
  const problems = [];
  const say = (message) => problems.push(`cena ${n}: ${message}`);
  if (!isNumber(cena?.inicio) || !isNumber(cena?.fim) || cena.inicio < 0 || cena.inicio >= cena.fim) {
    say('needs inicio and fim in seconds, inicio before fim');
    return problems;
  }
  if (!SCENES.includes(cena.tipo)) say(`tipo ${JSON.stringify(cena.tipo ?? null)} is not a scene of the repertoire (${SCENES.join(', ')})`);

  const { gatilho } = cena;
  if (gatilho == null) {
    if (cena.tipo !== 'camera') say('needs a gatilho {indice, palavra}: every insert starts on a spoken word');
  } else if (!Number.isInteger(gatilho.indice) || gatilho.indice < 0 || gatilho.indice >= palavras.length) {
    say(`gatilho indice ${JSON.stringify(gatilho.indice ?? null)} is not a word of the transcript (0–${palavras.length - 1})`);
  } else {
    const spoken = palavras[gatilho.indice];
    if (plain(spoken.w) !== plain(gatilho.palavra ?? '')) {
      say(`gatilho word ${gatilho.indice} is ${JSON.stringify(spoken.w)}, not ${JSON.stringify(gatilho.palavra ?? null)}`);
    } else if (cena.inicio < spoken.s - SAME_TIME) {
      say(`starts at ${cena.inicio} s, before ${JSON.stringify(plain(spoken.w))} is said (${spoken.s} s)`);
    }
  }
  if (cena.fim > duracao + SAME_TIME) say(`ends at ${cena.fim} s, after the Master (${duracao} s)`);

  (Array.isArray(cena.elementos) ? cena.elementos : []).forEach((elemento, i) => {
    const problem = boxProblem(elemento?.area);
    if (problem) {
      say(`elemento ${i + 1} area ${problem}`);
      return;
    }
    const { area } = elemento;
    const overCamera = !MOVING_CAMERA.has(cena.tipo) && !NO_CAMERA.has(cena.tipo);
    if (overCamera && zona && overlaps(area, zona)) say(`elemento ${i + 1} covers the Zona do rosto`);
    if (elemento.tipo === 'texto' && formato === '9:16'
      && (area.y < AREA_LIVRE_9_16.topo - 1e-9 || area.y + area.altura > AREA_LIVRE_9_16.base + 1e-9)) {
      say(`elemento ${i + 1} is text outside the Área livre (y from ${round(AREA_LIVRE_9_16.topo)} to ${round(AREA_LIVRE_9_16.base)} of the frame)`);
    }
  });

  if (cena.print != null) {
    const arquivo = typeof cena.print.arquivo === 'string' ? nfc(cena.print.arquivo) : null;
    if (!arquivo || !prints.includes(arquivo)) say(`print ${JSON.stringify(cena.print.arquivo ?? null)} is not in the Vídeo's prints folder`);
    if (typeof cena.print.frase !== 'string' || cena.print.frase.trim() === '') say('print needs the frase the highlighter covers');
  }
  return problems;
}

// The problems of the Plano as a whole: what she is told before approving it.
function planoProblems(data, nivel) {
  const problems = [];
  if (data.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (!(isNumber(data.tempoEstimadoMin) && data.tempoEstimadoMin > 0)) {
    problems.push('tempoEstimadoMin must be the expected minutes until the Entrega (a number above 0)');
  }
  if (nivel === 2 && !(isNumber(data.creditosEstimados) && data.creditosEstimados >= 0)) {
    problems.push('creditosEstimados must be the Higgsfield credits this Nível 2 Vídeo expects to spend (0 or more)');
  }
  const { direcoes } = data;
  const labelled = (list) => Array.isArray(list) && list.every((item) => typeof item?.rotulo === 'string' && item.rotulo.trim() !== '')
    && new Set(list.map((item) => item.rotulo)).size === list.length;
  if (!labelled(direcoes) || direcoes.length < 2 || direcoes.length > 3
    || !direcoes.every((d) => typeof d.resumo === 'string' && d.resumo.trim() !== '')
    || direcoes.filter((d) => d.recomendada === true).length !== 1) {
    problems.push('direcoes must be 2 or 3 directions {rotulo, resumo}, exactly one with recomendada: true');
  }
  if (!Array.isArray(data.pedidosDela)) problems.push('pedidosDela must be a list of what she asked (empty when nothing)');
  if (!Array.isArray(data.cenas) || data.cenas.length === 0) problems.push('cenas must list the scenes, at least one');
  return { problems, labelled };
}

// The Plano must cite each Resumo Notion the Vídeo relies on (its Projeto's and its own) by the
// date it was written, so she knows what informed it and a Plano drafted from an older Resumo is
// caught. Links without a Resumo cite nothing: Notion is never a blocker. A Plano she already
// approved stays as she approved it, even when a Resumo is refreshed afterwards.
function notionProblems(citados, dir, aprovado) {
  if (aprovado) return [];
  const list = Array.isArray(citados) ? citados : [];
  return Object.entries(notionLevels(dir)).flatMap(([nivel, { resumo }]) => {
    const citado = list.find((item) => item?.nivel === nivel);
    if (!resumo) return citado ? [`resumosNotion cites a Resumo Notion of the ${nivel} that does not exist`] : [];
    if (!citado) return [`resumosNotion must cite the Resumo Notion of the ${nivel} (geradoEm ${resumo.geradoEm})`];
    if (citado.geradoEm !== resumo.geradoEm) {
      return [`resumosNotion cites an older Resumo Notion of the ${nivel} (${citado.geradoEm}); the current one is ${resumo.geradoEm}`];
    }
    return [];
  });
}

// The problems of the Quadros de estilo: two or three, labelled, each a moment of her video
// already rendered into the Vídeo folder.
function quadrosProblems(quadros, dir, duracao, labelled) {
  if (!labelled(quadros) || quadros.length < 2 || quadros.length > 3) {
    return ['quadros must be 2 or 3 Quadros de estilo {rotulo, tempo, arquivo} with distinct labels'];
  }
  return quadros.flatMap((quadro, i) => {
    const problems = [];
    const say = (message) => problems.push(`quadro ${i + 1}: ${message}`);
    if (!isNumber(quadro.tempo) || quadro.tempo < 0 || quadro.tempo > duracao) say(`tempo must be a moment of the Master (0 to ${duracao} s)`);
    const arquivo = typeof quadro.arquivo === 'string' ? quadro.arquivo : '';
    if (!arquivo.endsWith('.png') || !fs.existsSync(path.join(dir, ...arquivo.split('/')))) say(`${arquivo || 'arquivo'} has not been rendered`);
    return problems;
  });
}

export function plano(folder, projetoNome, videoNome) {
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { checked: false, ...refusal };
  const planoFile = path.join(dir, PLANO);
  if (!fs.existsSync(planoFile)) return { checked: false, reason: 'no-plano', projeto, video };
  const data = readJson(planoFile);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return { checked: false, reason: 'invalid-plano', projeto, video };
  const palavras = readJson(path.join(dir, ...PALAVRAS.split('/')));
  const zona = readJson(path.join(dir, ZONA_DO_ROSTO));
  if (!Array.isArray(palavras) || !isNumber(zona?.duracao)) return { checked: false, reason: 'ingest-incomplete', projeto, video };

  // The Vídeo follows its own Kit (its Kit snapshot) when it has one, else the Projeto's.
  const kit = kitOfVideo(dir);
  // Without its Kit, the Formato (Área livre) and the Gate shape are unknown: fail closed.
  if (kit === null || typeof kit !== 'object' || Array.isArray(kit)) return { checked: false, reason: 'invalid-kit', projeto, video };
  const printsDir = path.join(dir, PRINTS);
  const context = {
    palavras,
    duracao: zona.duracao,
    zona: zona.zona ?? null,
    formato: kit?.formato,
    prints: fs.existsSync(printsDir) ? fs.readdirSync(printsDir).map(nfc) : [],
  };
  let record = {};
  try {
    record = parseFrontmatter(fs.readFileSync(path.join(dir, VIDEO_DOC), 'utf8'));
  } catch {
    // A malformed Vídeo document is `estado`'s to report; its Nível and Status are then unknown.
  }
  const nivel = record.nivel ?? null;
  const cenas = Array.isArray(data.cenas) ? data.cenas : [];
  const whole = planoProblems(data, nivel);
  const planoProblemList = [
    ...whole.problems,
    ...notionProblems(data.resumosNotion, dir, Boolean(data.aprovadoEm)),
    ...cenas.flatMap((cena, i) => sceneProblems(cena, i + 1, context)),
  ];
  const quadrosProblemList = quadrosProblems(data.quadros, dir, zona.duracao, whole.labelled);
  // One Gate approves the Plano and the Quadros together when the Kit already defines the whole
  // style (no look text field of it left empty); otherwise the look is still open, and the Quadros
  // get a Gate of their own after the Plano's.
  // Only the look counts: an empty sound preference (`som.*`) leaves nothing to see on a Quadro.
  const lacunasDoKit = kitGaps(kit).filter((field) => !field.startsWith('som.'));
  // Scenes that draw over a moved camera: the Zona do rosto could not be checked on them.
  const rostoNaoVerificado = cenas
    .map((cena, i) => (MOVING_CAMERA.has(cena?.tipo) && cena.elementos?.length > 0 ? i + 1 : null))
    .filter(Boolean);
  return {
    checked: true,
    projeto,
    video,
    status: typeof record.status === 'string' ? nfc(record.status) : null,
    gate: lacunasDoKit.length === 0 ? 'unico' : 'separado',
    lacunasDoKit,
    pronto: { plano: planoProblemList.length === 0, quadros: quadrosProblemList.length === 0 },
    problemas: { plano: planoProblemList, quadros: quadrosProblemList },
    rostoNaoVerificado,
  };
}

// `aprovar-plano`: records her approval at the Plano's Gate. `etapa` is what she approved:
// `plano-e-quadros` at the single Gate (the Kit defines the style), or `plano` then `quadros`
// at two Gates. Each approval closes the Gate and counts it; once both are stamped the Vídeo
// moves to Construção. A Plano that breaks a rule, or the wrong Gate, is refused unchanged.
export const ETAPAS = ['plano', 'quadros', 'plano-e-quadros'];

export function aprovarPlano(folder, projetoNome, videoNome, etapa) {
  if (!ETAPAS.includes(etapa)) return { approved: false, reason: 'invalid-etapa', message: `etapa must be one of: ${ETAPAS.join(', ')}` };
  const found = findVideo(folder, projetoNome, videoNome);
  if (found.refusal) return { approved: false, ...found.refusal };
  const { projeto, video, dir } = found;
  const refuse = (reason, extra = {}) => ({ approved: false, reason, projeto, video, ...extra });
  const check = plano(folder, projetoNome, videoNome);
  if (!check.checked) return refuse(check.reason);
  if (check.status !== 'Planejamento') return refuse('not-planejamento', { status: check.status });
  if ((check.gate === 'unico') !== (etapa === 'plano-e-quadros')) return refuse('wrong-gate', { gate: check.gate });
  const planoFile = path.join(dir, PLANO);
  const data = readJson(planoFile);
  if (etapa === 'quadros' && !data.aprovadoEm) return refuse('plano-not-approved');
  if (etapa === 'plano' && data.aprovadoEm) return refuse('already-approved');
  const problemas = [
    ...(etapa === 'quadros' ? [] : check.problemas.plano),
    ...(etapa === 'plano' ? [] : check.problemas.quadros),
  ];
  if (problemas.length > 0) return refuse('not-ready', { problemas });

  const agora = new Date().toISOString();
  if (etapa !== 'quadros') data.aprovadoEm = agora;
  if (etapa !== 'plano') data.quadrosAprovadosEm = agora;
  fs.writeFileSync(planoFile, `${JSON.stringify(data, null, 2)}\n`);
  const record = { gate: null, somar: { gates: 1 }, ...(data.aprovadoEm && data.quadrosAprovadosEm ? { status: 'Construção' } : {}) };
  const { status: novoStatus, gates } = registrarVideo(folder, projetoNome, videoNome, JSON.stringify(record));
  return { approved: true, projeto, video, etapa, gate: check.gate, status: novoStatus, gates };
}
