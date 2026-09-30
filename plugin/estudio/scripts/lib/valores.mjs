// Small value helpers every command shares.
import fs from 'node:fs';

// A plain JSON object: not null, not a list.
export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A finite number, 0 or more: a count of credits or a second of her Master.
export const isNonNegativeNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// A date string Date.parse reads (ISO).
export const isIsoDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// Text parsed as JSON: { value }, or { problem } saying why it is not valid JSON.
export function parseJson(text) {
  try {
    return { value: JSON.parse(text) };
  } catch (err) {
    return { problem: `not valid JSON (${err.message})` };
  }
}

// Text parsed as a JSON object: { value }, or { problem } saying why not; `shape` says what the
// object must hold, for the message when the JSON is not an object.
export function parseJsonObject(text, shape) {
  const { value, problem } = parseJson(text);
  if (problem) return { problem };
  if (!isObject(value)) return { problem: `must be a JSON object with ${shape}` };
  return { value };
}

// Text on one line: every run of whitespace, line breaks included, becomes one space.
export const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

// A JSON file's content; undefined when it is missing or not valid JSON.
export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}
