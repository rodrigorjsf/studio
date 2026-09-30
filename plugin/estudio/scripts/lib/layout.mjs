// The Estúdio folder layout, shared by `criar` and `estado`. The Criadora's data lives in
// this folder, never inside the plugin, whose root is replaced on every update.
//
//   estudio.json                     marker: {"schemaVersion": 1, "createdAt": ISO}
//   perfil.md                        the Perfil (pt-BR, frontmatter schema in perfil.mjs)
//   projetos/<projeto>/projeto.md    the Projeto briefing (pt-BR, frontmatter)
//   projetos/<projeto>/kit.json      the machine-readable Kit de marca (schema: kit.mjs)
//   projetos/<projeto>/kit/          the Kit's assets: logos, fonts, end card, reference images
//   projetos/<projeto>/videos/<vídeo>/video.md   the Vídeo document (frontmatter: status, rodada, nivel…)
//   projetos/<projeto>/videos/<vídeo>/kit.json   the Vídeo's own copy of the Kit (Kit snapshot): when
//                                    present, the Vídeo follows it instead of the Projeto's Kit, so a
//                                    later Kit edit never changes a Vídeo behind her back
//   projetos/<projeto>/videos/<vídeo>/original/<her file>   the Original: her recording, copied byte
//                                    for byte by `novo-video` and never touched again
//   projetos/<projeto>/videos/<vídeo>/prints/               the Prints she adds for this Vídeo
//   projetos/<projeto>/videos/<vídeo>/transcricao/          palavras.json ([{w, s, e}], seconds) and transcript.md
//   projetos/<projeto>/videos/<vídeo>/frames/visao-geral/   the overview frames the studio watches, and
//                                    the sampler's amostras.json
//   projetos/<projeto>/videos/<vídeo>/frames/zona-do-rosto/ face-zone frames, the sampler's amostras.json
//                                    and medicoes.json, the face measured on each frame (see ingest.mjs)
//   projetos/<projeto>/videos/<vídeo>/zona-do-rosto.json    the Zona do rosto `zona-do-rosto` measured
//   projetos/<projeto>/videos/<vídeo>/plano.json            the Plano: scenes on Palavras-gatilho, the
//                                    directions proposed, her requests, the Quadros de estilo and the
//                                    approval stamps (schema and checks: plano.mjs)
//   projetos/<projeto>/videos/<vídeo>/quadros/              the Quadros de estilo, one PNG per label
//   projetos/<projeto>/videos/<vídeo>/master/<file>.mp4     the Master a Pré-corte wrote (`precorte`);
//                                    without a Pré-corte the Master is the Original itself
//   projetos/<projeto>/videos/<vídeo>/precorte/             proposta.json (the cuts the Editor de
//                                    pré-corte proposes) and mapa.json (the segment map `precorte` applied)
//   projetos/<projeto>/videos/<vídeo>/transcricao/original/ the Original's transcript, kept aside when a
//                                    Pré-corte moves palavras.json onto the new Master's clock
//   projetos/<projeto>/videos/<vídeo>/revisao/vNN/          one folder per version of the edit (v01, v02…):
//                                    the key stills she reviews, then decisao.json (her decision and her
//                                    notes consolidated) and notas.md (the same list, in pt-BR, for her)
//   projetos/<projeto>/videos/<vídeo>/entrega/              the Entrega: the final MP4 (9:16 by default; 16:9
//                                    or transparent MOV overlays on request), checked by `entregar`
//   package.json, src/, …            the Remotion template; projetos/ is its public folder
//
// Anything else inside a Projeto or Vídeo folder (the reserved `notion/` folder for Página Notion links and Resumo Notion
// documents) is left to later stages and never rejected here.
export const SCHEMA_VERSION = 1;
export const MARKER = 'estudio.json';
export const PERFIL = 'perfil.md';
export const PROJETOS = 'projetos';
export const PROJETO_DOC = 'projeto.md';
export const KIT = 'kit.json';
export const KIT_ASSETS = 'kit';
export const VIDEOS = 'videos';
export const VIDEO_DOC = 'video.md';
export const VIDEO_KIT = 'kit.json';
export const ORIGINAL = 'original';
export const PRINTS = 'prints';
export const PALAVRAS = 'transcricao/palavras.json';
export const FRAMES_VISAO_GERAL = 'frames/visao-geral';
export const FRAMES_ROSTO = 'frames/zona-do-rosto';
export const AMOSTRAS_ROSTO = 'frames/zona-do-rosto/amostras.json';
export const MEDICOES_ROSTO = 'frames/zona-do-rosto/medicoes.json';
export const ZONA_DO_ROSTO = 'zona-do-rosto.json';
export const PLANO = 'plano.json';
export const QUADROS = 'quadros';
export const MASTER = 'master';
export const TRANSCRIPT_MD = 'transcricao/transcript.md';
export const TRANSCRICAO_ORIGINAL = 'transcricao/original';
export const PRECORTE_MAPA = 'precorte/mapa.json';
export const REVISAO = 'revisao';
export const DECISAO = 'decisao.json';
export const NOTAS_MD = 'notas.md';
export const ENTREGA = 'entrega';
