---
title: Approval gate
type: concept
updated: 2026-09-30
sources: [../sources/estudio-profissional-de-video-report.md]
---

# Approval gate

One reusable primitive for every gate: maker produces a versioned artifact (`_vNN`) → internal critic reviews before the user → notes consolidated into one list → user decides (approve / approve with changes / request changes) → round counter increments. Norm: 2–3 rounds; concept, footage or extra-version changes are scope changes, not revisions.

Plugin gates: `briefing.md` approved; the Plano (`plano.json`) + 2–3 labeled style stills, one Gate when the Kit defines the style and two otherwise (built in ticket #10: `plugin/estudio/skills/plano/SKILL.md`); stills review (round-counted); independent QC on the render; credit spend (stop at ~20% overrun). Human gates run on the main thread (subagents cannot call `AskUserQuestion`).

Proposed project status set: Briefing → Planning → Building → Internal QC → Review (round N) → Changes requested → Approved → Delivered → Archived.

Related: [picture-lock](picture-lock.md), [plugin-architecture](plugin-architecture.md).
