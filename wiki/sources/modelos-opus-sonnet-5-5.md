---
title: Research notes — Opus 5.5 vs Sonnet 5.5 per persona
type: source
updated: 2026-09-29
sources: [../../raw/research/modelos-opus-sonnet-5-5/notes.md]
---

# Research notes — Opus 5.5 vs Sonnet 5.5 per persona

Raw: [notes.md](../../raw/research/modelos-opus-sonnet-5-5/notes.md).

- At the allowed settings, Opus `medium` ≈ Sonnet `xhigh` (CursorBench 52.5 vs 53.1; Artificial Analysis index 51 vs 52); Sonnet `high` 47.8 and `medium` 39.2 fall below. [sourced]
- Sonnet `max` < `xhigh` only on FrontierCode (52.1 → 46.2, scope creep); not a general degradation. [sourced]
- Sonnet `xhigh` cost unpublished. [gap]
- Vision ties with crop tool + OpenCV; without tools Opus leads. [sourced]
- Plugin agents honor `model` and `effort`; omitted `effort` inherits the session's; full model IDs avoid provider alias drift; plugin agents ignore `mcpServers`, so MCP tools come from the session. [sourced from docs, untested at runtime]
- Sonnet at `low` may skip verification; at `xhigh` may spawn its own reviewers — prompts must say "stop and report". [sourced]

Adopted mapping: see [studio-personas](../entities/studio-personas.md).
