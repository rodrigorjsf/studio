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
