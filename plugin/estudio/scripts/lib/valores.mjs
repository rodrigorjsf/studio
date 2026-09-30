// Small value helpers every command shares.
import fs from 'node:fs';

// A plain JSON object: not null, not a list.
export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A JSON file's content; undefined when it is missing or not valid JSON.
export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}
