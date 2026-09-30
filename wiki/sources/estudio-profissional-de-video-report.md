---
title: Research report — professional video studio and plugin packaging
type: source
updated: 2026-09-29
sources: [../../raw/research/estudio-profissional-de-video/report.md]
---

# Research report — professional video studio and plugin packaging

Synthesis of six research notes (roles, briefing, review/QC, short-form, Claude plugins, current repo + demo video). Raw: [report.md](../../raw/research/estudio-profissional-de-video/report.md), index of notes: [README.md](../../raw/research/estudio-profissional-de-video/README.md).

## Key claims

- A studio is ~15 roles in four families (creative, execution, evaluative, review/coordination); the split never to compress is critic vs maker. See [studio-personas](../entities/studio-personas.md). [sourced]
- Picture lock separates the client creative loop from parallel finishing; this repo's master arrives already locked, so the loop reduces to brief → plan → style stills. See [picture-lock](../concepts/picture-lock.md). [sourced]
- Every gate has one shape: maker → internal critic → consolidated notes → user decision → round counter; 2–3 rounds is the norm. See [approval-gate](../concepts/approval-gate.md). [sourced]
- Grilling splits brand/stable topics (asked once, stored in the kit) from per-video topics; technical topics must be translated under locked-final-cut. See [grilling-catalogue](../concepts/grilling-catalogue.md). [sourced]
- A brand kit per creator front must be persisted and enforced, not merely available. See [brand-kit-per-front](../concepts/brand-kit-per-front.md). [sourced]
- QC splits into automatable technical QC and editorial QC by an independent critic. See [qc-technical-vs-editorial](../concepts/qc-technical-vs-editorial.md). [sourced]
- Short-form: 9:16 1080×1920 primary, hook in 3 s, safe box ~900×1400; safe-zone pixels and IG/TikTok loudness have no official source. See [short-form-9x16](../concepts/short-form-9x16.md). [sourced]
- Packaging: director entry skill owns every human gate on the main thread; subagents between gates; user data in the workspace; deps in `${CLAUDE_PLUGIN_DATA}`; plugins unavailable in WSL Desktop sessions. See [plugin-architecture](../concepts/plugin-architecture.md). [sourced]
- Success metric: fewest questions per video once a front's kit exists. [inference in report]

## Demo video data point

One Higgsfield-sponsored run on a ~1:50 clip: Level 1 ~20 min / ~230k tokens; Level 2 ~50 min / ~420k tokens / 97 credits. Failures shipped: cropped face (one frame sampled), caption style drift between runs.
