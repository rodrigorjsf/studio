---
title: Approval gate
type: concept
updated: 2026-09-30
sources: [../sources/estudio-profissional-de-video-report.md]
---

# Approval gate

One reusable primitive for every gate: maker produces a versioned artifact (`_vNN`) → internal critic reviews before the user → notes consolidated into one list → user decides (approve / approve with changes / request changes) → round counter increments. Norm: 2–3 rounds; concept, footage or extra-version changes are scope changes, not revisions.

Plugin gates: `briefing.md` approved; the Plano (`plano.json`) + 2–3 labeled style stills, one Gate when the Kit defines the style and two otherwise (built in ticket #10: `plugin/estudio/skills/plano/SKILL.md`); stills review in counted Rodadas, one versioned folder per version (`revisao/v01`, `v02`…), three decisions, notes consolidated into `notas.md`, scope changes named (built in ticket #11: `plugin/estudio/skills/edicao/SKILL.md`, `plugin/estudio/scripts/lib/revisao.mjs`); independent QC on the render; credit spend (stop at ~20% overrun), built in ticket #15: `aprovar-creditos` records her approval of the Plano's credits against her balance and the Kit's budget, never by Autonomia, and `gastar-creditos` refuses the generation that would pass the estimate by 20% and reopens the Gate (`plugin/estudio/scripts/lib/creditos.mjs`). Human gates run on the main thread (subagents cannot call `AskUserQuestion`).

Proposed project status set: Briefing → Planning → Building → Internal QC → Review (round N) → Changes requested → Approved → Delivered → Archived.

Related: [picture-lock](picture-lock.md), [plugin-architecture](plugin-architecture.md).
