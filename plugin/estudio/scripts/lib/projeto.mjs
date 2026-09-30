// `novo-projeto` and `aprovar-kit`: create a Projeto (briefing, Kit with the defaults,
// assets folder) — or complete one an interruption left without them — and close its Kit
// approval Gate. Neither ever overwrites the Criadora's answers.
import fs from 'node:fs';
import path from 'node:path';
import { briefingTemplate, unansweredSections } from './briefing.mjs';
import { estado } from './estado.mjs';
import { defaultKit } from './kit.mjs';
import { KIT, KIT_ASSETS, MARKER, PROJETO_DOC, PROJETOS } from './layout.mjs';

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

export function novoProjeto(folder, nome) {
  if (!fs.existsSync(path.join(folder, MARKER))) return { created: false, reason: 'not-estudio' };
  const problem = nameProblem(nome);
  if (problem) return { created: false, reason: 'invalid-name', message: problem };
  const existing = findProjeto(folder, nome);
  const projeto = nfc(existing ?? nome);
  const dir = path.join(folder, PROJETOS, existing ?? projeto);
  // Each file is written only when absent: an interrupted Projeto is completed, never reset.
  const files = [
    [path.join(dir, PROJETO_DOC), () => briefingTemplate(projeto, new Date().toISOString())],
    [path.join(dir, KIT), () => `${JSON.stringify(defaultKit(), null, 2)}\n`],
  ];
  const missing = files.filter(([file]) => !fs.existsSync(file));
  const assetsMissing = !fs.existsSync(path.join(dir, KIT_ASSETS));
  if (existing && missing.length === 0 && !assetsMissing) return { created: false, reason: 'already-exists', projeto };

  fs.mkdirSync(path.join(dir, KIT_ASSETS), { recursive: true });
  for (const [file, content] of missing) fs.writeFileSync(file, content());
  return { created: true, ...(existing && { resumed: true }), projeto, path: `${PROJETOS}/${projeto}` };
}

// Closes the Kit approval Gate: stamps `aprovadoEm` only on a Projeto whose documents
// `estado` finds valid and whose briefing has every section answered.
export function aprovarKit(folder, nome) {
  const state = estado(folder);
  const projeto = state.isEstudio && state.projetos?.find((p) => p.id === nfc(nome));
  if (!projeto) return { approved: false, reason: 'unknown-projeto' };
  const prefix = `${PROJETOS}/${projeto.id}/`;
  const errors = state.errors
    .filter((e) => e.file === `${prefix}${PROJETO_DOC}` || e.file === `${prefix}${KIT}`)
    .map((e) => `${e.file.slice(prefix.length)}: ${e.message}`);
  if (projeto.kit === 'pendente') errors.push(`${KIT}: missing`);
  const dir = path.join(folder, PROJETOS, findProjeto(folder, nome));
  const briefingFile = path.join(dir, PROJETO_DOC);
  const unanswered = fs.existsSync(briefingFile) ? unansweredSections(fs.readFileSync(briefingFile, 'utf8')) : 0;
  if (unanswered > 0) errors.push(`${PROJETO_DOC}: ${unanswered} sections still to fill in the interview`);
  if (errors.length > 0) return { approved: false, reason: 'invalid', projeto: projeto.id, errors };

  const kitFile = path.join(dir, KIT);
  const kit = JSON.parse(fs.readFileSync(kitFile, 'utf8'));
  kit.aprovadoEm = new Date().toISOString();
  fs.writeFileSync(kitFile, `${JSON.stringify(kit, null, 2)}\n`);
  return { approved: true, projeto: projeto.id, aprovadoEm: kit.aprovadoEm };
}
