---
title: Approval gate
type: concept
updated: 2026-09-30
sources: [../sources/estudio-profissional-de-video-report.md]
---

# Approval gate

One reusable primitive for every gate: maker produces a versioned artifact (`_vNN`) → internal critic reviews before the user → notes consolidated into one list → user decides (approve / approve with changes / request changes) → round counter increments. Norm: 2–3 rounds; concept, footage or extra-version changes are scope changes, not revisions.

Plugin gates: `briefing.md` approved; the Plano (`plano.json`) + 2–3 labeled style stills, one Gate when the Kit defines the style and two otherwise (built in ticket #10: `plugin/estudio/skills/plano/SKILL.md`); stills review in counted Rodadas, one versioned folder per version (`revisao/v01`, `v02`…), three decisions, notes consolidated into `notas.md`, scope changes named (built in ticket #11: `plugin/estudio/skills/edicao/SKILL.md`, `plugin/estudio/scripts/lib/revisao.mjs`); independent QC on the render; credit spend (stop at ~20% overrun), built in ticket #15: `aprovar-creditos` records her approval of the Plano's credits against her balance and the Kit's budget, never by Autonomia, and `gastar-creditos` refuses the generation that would pass the estimate by 20% and reopens the Gate (`plugin/estudio/scripts/lib/creditos.mjs`); Higgsedit's own cost Gate, only on her explicit request, built in ticket #16: `aprovar-higgsedit` records her words, the stretch and its estimate, and `gastar-higgsedit` stops at its own 20% overrun. The internal critic step is built in ticket #13: before her review of a version, the QC técnico, the Guardião da marca and the Revisor de plataforma judge it, the Motion designer fixes what they reject, and after three rejected turns the Diretor escalates in one sentence with two options; every turn and its cost is recorded (`qc-interno`, `plugin/estudio/scripts/lib/qc-interno.mjs`). Autonomia (ticket #17): with `alta`, the Diretor approves the Plano and Quadros Gates on her behalf through `aprovar-automatico`, counted and listed in `aprovacoes-automaticas.json`, and tells her; `média` and `baixa` approve no Gate automatically, and credits, Higgsedit, the Pré-corte, the Kit, her review and the Kit learnings are never automatic (`plugin/estudio/scripts/lib/autonomia.mjs`). The pt-BR table of every Gate (what she sees, what approval unlocks, what rejection triggers, whether Autonomia can approve it) lives once in the [README section "Quem trabalha em cada etapa"](../../README.md#quem-trabalha-em-cada-etapa) (ticket #36); this page keeps the design rationale. Human gates run on the main thread (subagents cannot call `AskUserQuestion`).

Proposed project status set: Briefing → Planning → Building → Internal QC → Review (round N) → Changes requested → Approved → Delivered → Archived.

Related: [picture-lock](picture-lock.md), [plugin-architecture](plugin-architecture.md).
