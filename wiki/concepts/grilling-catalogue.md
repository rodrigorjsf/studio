---
title: Grilling catalogue
type: concept
updated: 2026-09-29
sources: [../sources/estudio-profissional-de-video-report.md]
---

# Grilling catalogue

Topics the pre-work interview settles, split by scope. Brand/stable topics are asked once and stored in the [brand kit](brand-kit-per-front.md); per-video topics each time. Once a kit exists, per-video grilling reduces to "use the kit as is, or override X?". Show at most 2–3 labeled options; order tone → look → timeline.

| Topic | Scope | Under locked-final-cut |
|---|---|---|
| Business, channel promise, audience | brand | unchanged |
| Objective, CTA, message, clippable moments | per-video | hooks/CTAs become overlays |
| Tone, 3–5 references + anti-references | both | style stills before build |
| Camera behavior (punch-ins strength/frequency) | brand | scale on master; push-in 1.00→1.04, punch ≤1.12 |
| Framing / face-safe | brand + per-setup | face zone from real frames across the whole clip |
| Frame sampling | per-video | dense when presenter moves |
| Screenshots (claims needing proof) | per-video | prints intact, highlighter on quoted phrase |
| Image interaction (zoom/pan, Ken Burns) | brand | pan limit formula (guide 5) |
| Animations (easing, entrances, intro/outro ≤2–3 s) | brand | motion tokens |
| Pacing | brand | overlay density from past uploads |
| Captions (burned-in vs SRT, font, highlight, position) | brand | stored spec, burned-in for social |
| Color (hex palette, LUT) | brand | overlays only |
| Sound (music genre/BPM, ducking, SFX, sonic logo) | brand | added layers; loudness measured, not normalized |
| Deliverables (format, codec, naming) | per-video | 9:16 MP4 primary; ProRes 4444 alpha overlays |
| Rights, budget, deadline, approver | per-video | credit cap per video |

Behavioral constraint: real creators write one paragraph and approve with one word — keep grilling short by default.

## Built: the Projeto Grilling (ticket #6)

The `novo-projeto` skill (`plugin/estudio/skills/novo-projeto/SKILL.md`) asks the 16 brand-scope topics of the spec, in this order: business, audience, tone, references, camera behavior, framing, Prints, image interaction, animations, pacing, captions, color, sound, music policy, deliverables, credit budget. It groups them 3–4 per turn, with "decide você" on each, and harvests one-paragraph answers. Each topic is a pt-BR section of `projeto.md`, created by `novo-projeto` (`BRIEFING_SECTIONS` in `plugin/estudio/scripts/lib/projeto.mjs`). Reference images are copied into `kit/referencias/` and recorded in the Kit's `referencias`.
