#!/usr/bin/env node
// WHAT  Structure check for the marketplace at a repo root and every local plugin it lists.
// WHY   Seam 3 of the Estúdio spec: a valid manifest, pinned personas, Críticos without
//       editing tools, and a package free of development material and within platform limits.
// WHEN  Run by `npm test` (tests/plugin-structure.test.mjs); run by hand after touching plugin/.
// HOW   node scripts/check-plugin.mjs [marketplace-root]   (default: this repo)
//       Prints {"ok":bool,"plugins":[names],"errors":[messages]} and exits 1 when not ok.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The three Críticos of CONTEXT.md, by agent name (= agents/<name>.md). They judge and
// never edit. Bash stays allowed: QC técnico must run the `qc` command.
const CRITICOS = new Set(['qc-tecnico', 'guardiao-da-marca', 'revisor-de-plataforma']);
const EDITING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function readJson(file, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    errors.push(`${label}: cannot read ${file} (${err.message})`);
    return null;
  }
}

export function checkMarketplace(root) {
  const errors = [];
  const plugins = [];
  const marketplace = readJson(path.join(root, '.claude-plugin', 'marketplace.json'), errors, 'marketplace');
  if (marketplace) {
    if (!marketplace.name) errors.push('marketplace: missing "name"');
    if (!marketplace.owner?.name) errors.push('marketplace: missing "owner.name"');
    if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
      errors.push('marketplace: "plugins" must list at least one plugin');
    }
    for (const entry of marketplace.plugins ?? []) {
      if (typeof entry.source !== 'string' || !entry.source.startsWith('./')) {
        errors.push(`marketplace: plugin "${entry.name}" must use a relative "./" source`);
        continue;
      }
      plugins.push(entry.name);
      checkPlugin(path.join(root, entry.source), entry.name, errors);
    }
  }
  return { ok: errors.length === 0, plugins, errors };
}

function checkPlugin(dir, expectedName, errors) {
  const manifest = readJson(path.join(dir, '.claude-plugin', 'plugin.json'), errors, expectedName);
  if (!manifest) return;
  if (manifest.name !== expectedName) {
    errors.push(`${expectedName}: plugin.json name "${manifest.name}" does not match the marketplace entry`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) {
    errors.push(`${expectedName}: plugin.json "version" must be semver`);
  }
  checkPersonas(dir, expectedName, errors);
  checkPackageContents(dir, expectedName, errors);
}

// Development material stays outside the package (ADR 0005). Matched by path relative
// to the plugin root.
const DEV_TOP_LEVEL = new Set(['wiki', 'raw', 'estado', 'tests', 'test', 'bin', 'PROJETO.md', 'GLOSSARIO.md', 'ROADMAP.md']);
const DEV_ANYWHERE = new Set(['node_modules', '.git']);
const TEST_FILE = /\.(test|spec|seam)\.[^.]+$/;

// Platform cap for an installed plugin (ADR 0005).
const MAX_FILES = 5000;
const MAX_BYTES = 200 * 1024 * 1024;

function checkPackageContents(dir, pluginName, errors) {
  let files = 0;
  let bytes = 0;
  const walk = (current, rel) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const isDev = (!rel && DEV_TOP_LEVEL.has(entry.name))
        || DEV_ANYWHERE.has(entry.name)
        || (entry.isFile() && TEST_FILE.test(entry.name));
      if (isDev) {
        errors.push(`${pluginName}: package contains development material "${relPath}"`);
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, relPath);
      else {
        files += 1;
        bytes += fs.statSync(full).size;
        if (entry.name.endsWith('.md')) markdown.push(full);
      }
    }
  };
  const markdown = [];
  walk(dir, '');
  for (const file of markdown) checkLinks(dir, file, pluginName, errors);
  if (files > MAX_FILES) errors.push(`${pluginName}: package has ${files} files (limit ${MAX_FILES})`);
  if (bytes > MAX_BYTES) errors.push(`${pluginName}: package is ${bytes} bytes (limit ${MAX_BYTES})`);
}

// Markdown text with fenced code blocks and inline code removed, so example links in
// code are not treated as real links.
function prose(text) {
  return text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
}

// GitHub heading anchors, including the -1, -2 suffixes of repeated headings.
function anchors(file) {
  const seen = new Map();
  const result = new Set();
  for (const [, heading] of prose(fs.readFileSync(file, 'utf8')).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    result.add(count ? `${slug}-${count}` : slug);
  }
  return result;
}

// Every relative link must resolve inside the package: an installed plugin carries
// nothing from the repo around it.
function checkLinks(pluginDir, file, pluginName, errors) {
  const where = `${pluginName}: ${path.relative(pluginDir, file).split(path.sep).join('/')}`;
  for (const [, target] of prose(fs.readFileSync(file, 'utf8')).matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // https:, mailto:, …
    const [rawPath, anchor] = target.split('#');
    const resolved = rawPath ? path.resolve(path.dirname(file), decodeURIComponent(rawPath)) : file;
    if (path.relative(pluginDir, resolved).startsWith('..')) {
      errors.push(`${where}: link leaves the package "${target}"`);
    } else if (!fs.existsSync(resolved)) {
      errors.push(`${where}: broken link "${target}"`);
    } else if (anchor && resolved.endsWith('.md') && !anchors(resolved).has(anchor)) {
      errors.push(`${where}: broken link "${target}" (no such heading)`);
    }
  }
}

// Reads the YAML frontmatter of an agent file as flat `key: value` pairs.
// A block list (`tools:` followed by `  - Read` lines) becomes a comma-joined string.
function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const fields = {};
  if (!match) return fields;
  let lastKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = /^\s+-\s*(.+)$/.exec(line);
    if (item && lastKey) {
      fields[lastKey] = [fields[lastKey], item[1].trim()].filter(Boolean).join(', ');
      continue;
    }
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (pair) {
      lastKey = pair[1];
      fields[lastKey] = pair[2].trim();
    }
  }
  return fields;
}

function checkPersonas(dir, pluginName, errors) {
  const agentsDir = path.join(dir, 'agents');
  if (!fs.existsSync(agentsDir)) return;
  for (const file of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
    const fields = frontmatter(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
    const where = `${pluginName}: agents/${file}`;
    for (const key of ['model', 'effort']) {
      if (!fields[key]) errors.push(`${where}: missing "${key}"`);
    }
    // Aliases (opus, sonnet, inherit…) drift with releases; the spec pins full IDs.
    if (fields.model && !fields.model.startsWith('claude-')) {
      errors.push(`${where}: "model" must be a full model ID (claude-…), got "${fields.model}"`);
    }
    if (CRITICOS.has(fields.name || path.basename(file, '.md'))) {
      const tools = (fields.tools ?? '').split(',').map((t) => t.trim()).filter(Boolean);
      // An agent without `tools` inherits every tool, editing ones included.
      if (tools.length === 0) errors.push(`${where}: Crítico must declare a "tools" allowlist`);
      for (const tool of tools.filter((t) => EDITING_TOOLS.has(t))) {
        errors.push(`${where}: Crítico must not have editing tool "${tool}"`);
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verdict = checkMarketplace(path.resolve(process.argv[2] ?? defaultRoot));
  process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  process.exit(verdict.ok ? 0 : 1);
}
