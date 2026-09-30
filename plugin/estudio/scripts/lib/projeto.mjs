// `novo-projeto` and `aprovar-kit`: create a Projeto (briefing, Kit with the defaults,
// assets folder) — or complete one an interruption left without them — and close its Kit
// approval Gate. Neither ever overwrites the Criadora's answers.
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';
import { defaultKit, validateKit } from './kit.mjs';
import { KIT, KIT_ASSETS, MARKER, PROJETO_DOC, PROJETOS } from './layout.mjs';

// The Projeto Grilling's catalogue, one briefing section per topic, in the order the
// Entrevistador asks them. The Criadora reads this file, so the headings are pt-BR.
export const BRIEFING_SECTIONS = [
  'Negócio',
  'Público',
  'Tom de voz',
  'Referências',
  'Comportamento de câmera',
  'Enquadramento',
  'Prints',
  'Interação com imagens',
  'Animações',
  'Ritmo',
  'Legendas',
  'Cores',
  'Som',
  'Música',
  'Entregáveis',
  'Orçamento de créditos',
];

// A Projeto is a folder named as she calls it ("Minha Empresa"), so the name must be a
// single, portable folder name on Mac and Windows.
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f]/;
function nameProblem(nome) {
  if (typeof nome !== 'string' || nome.trim() === '') return 'empty';
  if (nome !== nome.trim() || nome.startsWith('.') || nome.endsWith('.')) return 'leading or trailing dot or space';
  if (FORBIDDEN.test(nome)) return 'contains a character a folder name cannot hold';
  return null;
}

const nfc = (name) => name.normalize('NFC');

function findProjeto(folder, nome) {
  const dir = path.join(folder, PROJETOS);
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && nfc(entry.name) === nfc(nome))?.name ?? null;
}

function briefing(nome, createdAt) {
  const sections = BRIEFING_SECTIONS.map((title) => `## ${title}\n\n_A preencher na entrevista._\n`).join('\n');
  return `---\nnome: "${nome}"\ncriadoEm: ${createdAt}\n---\n# ${nome}\n\n${sections}`;
}

export function novoProjeto(folder, nome) {
  if (!fs.existsSync(path.join(folder, MARKER))) return { created: false, reason: 'not-estudio' };
  const problem = nameProblem(nome);
  if (problem) return { created: false, reason: 'invalid-name', message: problem };
  const existing = findProjeto(folder, nome);
  const projeto = nfc(existing ?? nome);
  const dir = path.join(folder, PROJETOS, existing ?? projeto);
  // Each file is written only when absent: an interrupted Projeto is completed, never reset.
  const files = [
    [path.join(dir, PROJETO_DOC), () => briefing(projeto, new Date().toISOString())],
    [path.join(dir, KIT), () => `${JSON.stringify(defaultKit(), null, 2)}\n`],
  ];
  const missing = files.filter(([file]) => !fs.existsSync(file));
  const assetsMissing = !fs.existsSync(path.join(dir, KIT_ASSETS));
  if (existing && missing.length === 0 && !assetsMissing) return { created: false, reason: 'already-exists', projeto };

  fs.mkdirSync(path.join(dir, KIT_ASSETS), { recursive: true });
  for (const [file, content] of missing) fs.writeFileSync(file, content());
  return { created: true, ...(existing && { resumed: true }), projeto, path: `${PROJETOS}/${projeto}` };
}

export function aprovarKit(folder, nome) {
  const found = findProjeto(folder, nome);
  if (!fs.existsSync(path.join(folder, MARKER)) || !found) return { approved: false, reason: 'unknown-projeto' };
  const dir = path.join(folder, PROJETOS, found);
  const errors = [];
  const briefingFile = path.join(dir, PROJETO_DOC);
  if (!fs.existsSync(briefingFile)) errors.push(`${PROJETO_DOC}: missing`);
  else {
    try {
      parseFrontmatter(fs.readFileSync(briefingFile, 'utf8'));
    } catch (err) {
      errors.push(`${PROJETO_DOC}: ${err.message}`);
    }
  }
  let kit = null;
  try {
    kit = JSON.parse(fs.readFileSync(path.join(dir, KIT), 'utf8'));
    errors.push(...validateKit(kit, dir).map((message) => `${KIT}: ${message}`));
  } catch (err) {
    errors.push(`${KIT}: ${err.code === 'ENOENT' ? 'missing' : `not valid JSON (${err.message})`}`);
  }
  if (errors.length > 0) return { approved: false, reason: 'invalid', projeto: nfc(found), errors };

  kit.aprovadoEm = new Date().toISOString();
  fs.writeFileSync(path.join(dir, KIT), `${JSON.stringify(kit, null, 2)}\n`);
  return { approved: true, projeto: nfc(found), aprovadoEm: kit.aprovadoEm };
}
