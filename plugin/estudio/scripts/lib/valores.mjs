// Small value helpers every command shares.
import fs from 'node:fs';

// A plain JSON object: not null, not a list.
export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A finite number, 0 or more: a count of credits or a second of her Master.
export const isNonNegativeNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// A date string Date.parse reads (ISO).
export const isIsoDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// A JSON file's content; undefined when it is missing or not valid JSON.
export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}
