---
title: Spec — Estúdio plugin v1
type: source
updated: 2026-09-29
sources: [../../raw/specs/estudio-plugin-v1.md]
---

# Spec — Estúdio plugin v1

Raw: [estudio-plugin-v1.md](../../raw/specs/estudio-plugin-v1.md); published as [issue #1](https://github.com/rodrigorjsf/studio/issues/1). 86 user stories across install, Perfil, Projetos/Kit, Vídeo start, Pré-corte, Plano, build/review, Rodadas, delivery, continuity and maintainer needs.

Test seams fixed: (1) one deterministic CLI with `estado`, `qc`, `precorte` subcommands tested with Node's built-in runner and ffmpeg-generated fixtures; (2) Remotion template typecheck + still render reading a fixture Kit; (3) plugin structure validation (manifest, model/effort on every persona, Críticos without editing tools, package limits). Model behavior is validated end-to-end on the maintainer's own video, then with the Criadora.

Implements [estudio-plugin-decisions](../analyses/estudio-plugin-decisions.md).

## Tickets (published 2026-09-29)

Vertical slices #2–#19, each with native `blocked_by` edges: #2 skeleton+marketplace → #3 Estúdio folder+`estado` → {#4 installer, #5 Perfil, #6 Projeto+Kit} → {#7 list/edit, #8 Kit→frame, #9 Vídeo briefing+ingest} → #10 Plano+Quadros → #11 build/Rodadas/Entrega (first full Vídeo) → #12 `qc` → #13 brand/platform Críticos+loop; #14 Pré-corte (after #9); #15 Nível 2 → #16 Higgsedit; #17 Autonomia/metrics/learnings; #18 cleanup+install guide; #19 end-to-end run (`ready-for-human`).
