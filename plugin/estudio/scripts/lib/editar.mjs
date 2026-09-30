// `editar-kit` and `atualizar-kit-video`: change an approved Projeto's Kit de marca, and let
// an existing Vídeo follow the new Kit only when she asks. A Kit change applies to new
// Vídeos: before the Projeto's Kit changes, every existing Vídeo without a Kit of its own
// gets a copy of the Kit it started with (its Kit snapshot, `videos/<vídeo>/kit.json`).
import fs from 'node:fs';
import path from 'node:path';
import { estado, isFinished, nfc, subfolders } from './estado.mjs';
import { plataformasDoKit, validateKit } from './kit.mjs';
import { KIT, PROJETOS, VIDEO_KIT, VIDEOS } from './layout.mjs';
import { findProjeto, freezeVideoKits } from './projeto.mjs';
import { isObject, parseJson } from './valores.mjs';


// The edit is a JSON object holding only the fields that change. Objects merge field by
// field; any other value (text, number, list, null) replaces the old one whole.
export function merge(base, edit) {
  const result = { ...base };
  for (const [key, value] of Object.entries(edit)) {
    result[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  }
  return result;
}

// Fields the edit may not set: the approval stamp belongs to this command, and the schema
// version to the studio.
export const LOCKED = ['schemaVersion', 'aprovadoEm'];

function parseEdit(editText) {
  const { value: edit, problem: notJson } = parseJson(editText);
  if (notJson) return { problem: notJson };
  if (!isObject(edit)) return { problem: 'must be a JSON object holding only the Kit fields that change' };
  const locked = LOCKED.find((key) => key in edit);
  if (locked) return { problem: `${locked} cannot be edited` };
  return { edit };
}

// The approved Projeto named `nome`, with its folder on disk, or the refusal to return.
export function approvedProjeto(folder, nome) {
  const state = estado(folder);
  const projeto = state.isEstudio && state.projetos?.find((p) => p.id === nfc(nome));
  if (!projeto) return { refusal: { reason: 'unknown-projeto' } };
  if (projeto.kit !== 'ok') return { refusal: { reason: 'kit-not-approved', projeto: projeto.id, kit: projeto.kit } };
  return { projeto, dir: path.join(folder, PROJETOS, findProjeto(folder, nome)) };
}

// Applies her change to an approved Kit. The Entrevistador runs it only after she confirmed the
// change, so the new Kit is stamped approved. An edit that breaks the Kit changes nothing.
export function editarKit(folder, nome, editText) {
  const { edit, problem } = parseEdit(editText);
  if (problem) return { edited: false, reason: 'invalid-edit', message: problem };
  const { projeto, dir, refusal } = approvedProjeto(folder, nome);
  if (refusal) return { edited: false, ...refusal };
  const kitFile = path.join(dir, KIT);
  const kit = merge(JSON.parse(fs.readFileSync(kitFile, 'utf8')), edit);
  const errors = validateKit(kit, dir);
  if (errors.length > 0) return { edited: false, reason: 'invalid', projeto: projeto.id, errors };

  const videosKeepingTheirKit = freezeVideoKits(dir);
  kit.aprovadoEm = new Date().toISOString();
  fs.writeFileSync(kitFile, `${JSON.stringify(kit, null, 2)}\n`);
  return {
    edited: true,
    projeto: projeto.id,
    aprovadoEm: kit.aprovadoEm,
    plataformas: plataformasDoKit(kit),
    videosKeepingTheirKit,
  };
}

// She opted in: an existing Vídeo drops the Kit it started with and follows the Projeto's
// current, approved Kit. A delivered or archived Vídeo keeps the Kit it was delivered with.
export function atualizarKitVideo(folder, nome, videoNome) {
  const { projeto, dir, refusal } = approvedProjeto(folder, nome);
  if (refusal) return { updated: false, ...refusal };
  const video = projeto.videos.find((v) => v.id === nfc(videoNome));
  if (!video) return { updated: false, reason: 'unknown-video', projeto: projeto.id };
  if (isFinished(video.status)) {
    return { updated: false, reason: 'finished', projeto: projeto.id, video: video.id, status: video.status };
  }
  const videoDir = subfolders(path.join(dir, VIDEOS)).find((name) => nfc(name) === video.id);
  const kitFile = path.join(dir, KIT);
  fs.copyFileSync(kitFile, path.join(dir, VIDEOS, videoDir, VIDEO_KIT));
  const { aprovadoEm } = JSON.parse(fs.readFileSync(kitFile, 'utf8'));
  return { updated: true, projeto: projeto.id, video: video.id, aprovadoEm };
}
