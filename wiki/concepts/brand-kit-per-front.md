---
title: Brand kit per front
type: concept
updated: 2026-09-29
sources: [../sources/estudio-profissional-de-video-report.md, ../sources/grilling-estudio-plugin-2026-09-29.md]
---

# Brand kit per front

A persisted, machine-readable identity per creator "front" (e.g. company account vs personal Instagram), loaded by the director before every plan — enforced, not merely available (Descript users complain its AI ignores stored layouts).

Proposed layout: `marcas/<front>/` with files (logos, fonts, LUT, end card, sonic logo) and a spec: color tokens, type scale, motion tokens, caption style, pacing target, default format (9:16), face-zone defaults per recording setup, credit budget, do/don't list, transcription glossary for `transcrever.py`. Projects reference their front.

Why: the repo's guide 5 names "identidade permanente" vs per-video "dialeto" but stores neither; the demo re-supplied references per project and captions drifted between runs.

Related: [grilling-catalogue](grilling-catalogue.md).

> **Settled (grilling 2026-09-29):** the research's "front" is called **Projeto**; the kit lives at `projetos/<slug>/marca/` (`tokens.json` + `assets/`), not `marcas/<front>/`.

## Built: Kit de marca schema and approval Gate (ticket #6)

- As built, the Kit lives at `projetos/<projeto>/kit.json` with its assets in `projetos/<projeto>/kit/`. This supersedes the `marca/tokens.json` layout above, which ticket #3's layout contract (`plugin/estudio/scripts/lib/layout.mjs`) had already changed.
- The schema is enforced in code by `plugin/estudio/scripts/lib/kit.mjs`. `estado` reports each bad field, for example `cores.destaque must be a color like "#1A2B3C"`. Asset paths must exist inside `kit/`. The field-by-field description the Entrevistador follows is `plugin/estudio/skills/novo-projeto/references/kit-schema.md`.
- Defaults are written by `novo-projeto`: Formato `9:16` and `musica.politica: "no-app"` (she adds the music in the app).
- Approval Gate: a valid Kit reads `aguardando-aprovacao` in `estado` until `aprovar-kit` stamps `aprovadoEm`, which refuses an invalid Kit. Only then is the Kit `ok` and the Projeto usable. Tests: `tests/projeto.test.mjs`.

## Built: editing an approved Kit, and each Vídeo's own Kit (ticket #7)

- `/estudio:editar-projeto` changes a Projeto's briefing (edited in place) or its Kit. A Kit change goes only through `editar-kit "<folder>" "<projeto>" '<json>'`: the JSON holds only the changed fields (objects merge, anything else replaces). The command re-validates the merged Kit with `validateKit`, refuses a broken one without writing anything, and stamps `aprovadoEm` afresh, because the Criadora confirmed the change first.
- Kit snapshot: before the Projeto's `kit.json` changes, every existing Vídeo without one gets `videos/<vídeo>/kit.json`, a copy of the Kit it started with. A Vídeo reads its own Kit when present, else the Projeto's. `atualizar-kit-video` moves one Vídeo to the current Kit on her opt-in; delivered or archived Vídeos are refused. Assets in `kit/` are never overwritten, so an older Kit's paths stay valid.
- `/estudio:projetos` lists Projetos and Vídeos only from `estado`. Tests: `tests/editar-projeto.test.mjs`.

## Built: the Kit reaches the frame (ticket #8)

- Every Vídeo composition of the Estúdio's Remotion template reads the Projeto's `kit.json` through `plugin/estudio/template/src/_shared/kit.ts`: `calcularMetadadosDoKit` loads the Kit from the public folder (`projetos/`), sets the frame size from the Formato and hands the Kit to the component as its `kit` prop.
- Formato: `formato: null` renders the Kit's Formato (9:16 by default, 1080×1920); `"16:9"` (1920×1080) or `"1:1"` is a variant on request, same composition.
- Brand pieces in `plugin/estudio/template/src/_shared/marca.tsx`: fonts (family, weight, optional font file under `kit/`), the entrance motion (`movimento.entradaMs`) and the caption style (`legendas`: grouping, highlight, position, case). `PreviaDoKit` ("Prévia do Kit") draws a Kit on one frame and is the worked example.
- The default Kit has one source, `plugin/estudio/template/src/_shared/kit-padrao.json`, read by both `novo-projeto` (`lib/kit.mjs`) and the template (Prévia without a Projeto).
- The gallery examples in `src/estilos/` keep their own palettes: they show a style, not a Projeto's brand.
- Proof (Seam 2): `tests/template.test.mjs` scaffolds an Estúdio, renders stills from two fixture Kits and checks frame size and background color.
