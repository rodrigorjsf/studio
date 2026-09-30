---
title: Picture lock
type: concept
updated: 2026-09-30
sources: [../sources/estudio-profissional-de-video-report.md]
---

# Picture lock

The gate after which "no cuts can be altered"; before it, an ambiguous creative loop with the client (assembly → rough → fine → client cut); after it, parallel low-ambiguity finishing (graphics, color, sound, captions, QC).

In this repo the master is already locked by rule 1 (`locked-final-cut`, [CLAUDE.md](../../CLAUDE.md)): editing is composition on top. The creative loop reduces to brief → plan → style stills. Gap: the demo fed a rough cut with silences and nothing warned — the input contract needs a check-and-warn step or an optional pre-lock trim stage. "Locked" should persist as a state flag because re-renders invalidate captions, timing and QC.

The Estúdio plugin closes that gap with the optional Pré-corte (ticket #14, [plugin-architecture](plugin-architecture.md)). `pausas` warns when the long pauses of a Master add up to 3 s or more, and `precorte` writes the approved cut as a new Master. The lock persists as state: once `master` in `video.md` differs from `original`, or the Status is past `Planejamento`, the Master is never cut again (`plugin/estudio/scripts/lib/precorte.mjs`).

Related: [approval-gate](approval-gate.md).
