// `criar`: turns a folder into an Estúdio — marker, layout and the Remotion template.
// Never overwrites or deletes a file that is already there, and never re-scaffolds an Estúdio.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKER, PROJETOS, SCHEMA_VERSION } from './layout.mjs';

const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'template');

export function criar(folder) {
  if (fs.existsSync(path.join(folder, MARKER))) {
    return { folder, created: false, reason: 'already-estudio' };
  }
  fs.mkdirSync(path.join(folder, PROJETOS), { recursive: true });
  fs.cpSync(TEMPLATE, folder, { recursive: true, force: false, errorOnExist: false });
  // The marker goes last: a scaffold interrupted midway is retried, not taken for an Estúdio.
  const marker = { schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(folder, MARKER), `${JSON.stringify(marker, null, 2)}\n`);
  return { folder, created: true };
}
