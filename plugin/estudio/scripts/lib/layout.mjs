// The Estúdio folder layout (ADR 0005), shared by `criar` and `estado`.
//
//   estudio.json                     marker: {"schemaVersion": 1, "createdAt": ISO}
//   perfil.md                        the Perfil (pt-BR, YAML-style frontmatter)
//   projetos/<projeto>/projeto.md    the Projeto briefing (pt-BR, frontmatter)
//   projetos/<projeto>/kit.json      the machine-readable Kit de marca
//   projetos/<projeto>/videos/<vídeo>/video.md   the Vídeo document (frontmatter: status, rodada, nivel…)
//   package.json, src/, …            the Remotion template; projetos/ is its public folder
//
// Anything else inside a Projeto or Vídeo folder (the Kit assets, the Original, versions,
// the Entrega, and the reserved `notion/` folder for Página Notion links and Resumo Notion
// documents) is left to later stages and never rejected here.
export const SCHEMA_VERSION = 1;
export const MARKER = 'estudio.json';
export const PERFIL = 'perfil.md';
export const PROJETOS = 'projetos';
export const PROJETO_DOC = 'projeto.md';
export const KIT = 'kit.json';
export const VIDEOS = 'videos';
export const VIDEO_DOC = 'video.md';
