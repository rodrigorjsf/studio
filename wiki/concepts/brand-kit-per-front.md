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
