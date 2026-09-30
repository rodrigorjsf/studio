// Seam 1 — the deterministic CLI, for the metrics (ticket #17): `estado` reports, per Projeto,
// the averages of questions, Gates, automatic approvals, Rodadas and minutes to delivery over
// its delivered Vídeos, and each delivered Vídeo's own numbers in the order they were started,
// so the maintainer can compare her first and second Vídeos. Drives
// plugin/estudio/scripts/estudio.mjs as a process against fixture Estúdio folders and asserts
// only on its JSON output.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoRoot, 'plugin', 'estudio', 'scripts', 'estudio.mjs');
const fixtures = path.join(repoRoot, 'tests', 'fixtures', 'estudios');

const tempRoots = [];
after(() => tempRoots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function estado(dir) {
  const r = spawnSync(process.execPath, [cli, 'estado', dir], { encoding: 'utf8' });
  assert.equal(r.stderr, '', `stderr: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function estudio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'estúdio métricas '));
  tempRoots.push(root);
  const dir = path.join(root, 'Meu Estúdio');
  fs.cpSync(path.join(fixtures, 'valido'), dir, { recursive: true });
  return dir;
}

// A Vídeo document holding the record fields `record` (frontmatter written by hand, as YAML).
function video(dir, projeto, nome, record) {
  const folder = path.join(dir, 'projetos', projeto, 'videos', nome);
  fs.mkdirSync(folder, { recursive: true });
  const lines = Object.entries(record).map(([key, value]) => `${key}: ${value}`);
  fs.writeFileSync(path.join(folder, 'video.md'), `---\n${lines.join('\n')}\n---\n# ${nome}\n`);
}

const metricasDe = (out, projeto) => out.projetos.find((p) => p.id === projeto).metricas;

test('the averages of a Projeto count only its delivered Vídeos, and list each one in the order it was started', () => {
  const dir = estudio();
  // Started second, archived after its Kit learnings: a lighter Vídeo once the Kit exists.
  video(dir, 'Minha Empresa', 'Segundo', {
    status: 'Arquivado', rodada: 1, perguntas: 1, gates: 2, aprovacoesAutomaticas: 1,
    turnosInternos: 3, tokensInternos: 3000, segundosInternos: 90,
    iniciadoEm: '2026-09-08T10:00:00.000Z', entregueEm: '2026-09-08T10:21:00.000Z',
  });
  video(dir, 'Minha Empresa', 'Primeiro', {
    status: 'Entregue', rodada: 2, perguntas: 4, gates: 3, aprovacoesAutomaticas: 0,
    turnosInternos: 1, tokensInternos: 1000, segundosInternos: 30,
    iniciadoEm: '2026-09-01T10:00:00.000Z', entregueEm: '2026-09-01T10:50:00.000Z',
  });
  // Still in progress: its numbers are not final, so they stay out of the averages.
  video(dir, 'Minha Empresa', 'Em andamento', {
    status: 'Construção', perguntas: 9, gates: 9, aprovacoesAutomaticas: 0, iniciadoEm: '2026-09-10T10:00:00.000Z',
  });

  const out = estado(dir);
  assert.deepEqual(out.errors, []);
  assert.deepEqual(metricasDe(out, 'Minha Empresa'), {
    videos: 2,
    medias: {
      perguntas: 2.5, gates: 2.5, aprovacoesAutomaticas: 0.5, rodadas: 1.5, minutosAteEntrega: 35.5,
      turnosInternos: 2, tokensInternos: 2000, segundosInternos: 60,
    },
    porVideo: [
      {
        video: 'Primeiro', perguntas: 4, gates: 3, aprovacoesAutomaticas: 0, rodadas: 2, minutosAteEntrega: 50,
        turnosInternos: 1, tokensInternos: 1000, segundosInternos: 30,
      },
      {
        video: 'Segundo', perguntas: 1, gates: 2, aprovacoesAutomaticas: 1, rodadas: 1, minutosAteEntrega: 21,
        turnosInternos: 3, tokensInternos: 3000, segundosInternos: 90,
      },
    ],
  });
});

test('a Projeto with no measured delivery has no averages yet, rather than zeros', () => {
  const out = estado(estudio());
  // "Receita antiga" was archived before the studio kept its dates: it cannot be measured.
  assert.deepEqual(metricasDe(out, 'Pessoal'), { videos: 0, medias: null, porVideo: [] });
  assert.deepEqual(metricasDe(out, 'Minha Empresa'), { videos: 0, medias: null, porVideo: [] });
});

test('averages are rounded to one decimal', () => {
  const dir = estudio();
  const record = (perguntas) => ({
    status: 'Entregue', rodada: 1, perguntas, gates: 1, aprovacoesAutomaticas: 0,
    iniciadoEm: '2026-09-01T10:00:00.000Z', entregueEm: '2026-09-01T10:10:30.000Z',
  });
  video(dir, 'Pessoal', 'A', record(1));
  video(dir, 'Pessoal', 'B', record(1));
  video(dir, 'Pessoal', 'C', record(2));
  const { medias } = metricasDe(estado(dir), 'Pessoal');
  assert.equal(medias.perguntas, 1.3);
  assert.equal(medias.minutosAteEntrega, 10.5);
});
