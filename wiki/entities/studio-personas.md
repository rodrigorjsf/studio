---
title: Studio personas
type: entity
updated: 2026-09-30
sources: [../sources/estudio-profissional-de-video-report.md, ../sources/modelos-opus-sonnet-5-5.md, ../sources/grilling-estudio-plugin-2026-09-29.md]
---

# Studio personas

Roles of a professional post-production studio and their compressed solo-creator chain, as the plugin's persona set.

| Family | Roles |
|---|---|
| Creative | creative director, art director, strategist, scriptwriter/copywriter |
| Execution | assistant editor, editor, motion designer, colorist, sound designer/mixer, captioner, thumbnail designer |
| Evaluative | creative review (CD/AD), QC |
| Review / coordination | producer/account lead (consolidates feedback, owns revision budget), post supervisor, client (final sign-off) |

Compressed chain for a solo creator: **Director** (producer + CD + client liaison) → Strategist → Writer → Assistant Editor → Editor/Motion → Finishing (color, sound, captions) → **QC critic** → Delivery. Specialists join only when the format needs them. The critic must never be the maker.

Current repo: one "diretor de vídeo" persona in `CLAUDE.md` wears all hats; producer/intake persists nothing and no evaluator is independent.

Related: [approval-gate](../concepts/approval-gate.md), [qc-technical-vs-editorial](../concepts/qc-technical-vs-editorial.md), [plugin-architecture](../concepts/plugin-architecture.md).

## Adopted cast (grilling 2026-09-29)

| Persona | Runs as | Model · effort |
|---|---|---|
| Diretor | main-thread skill | Opus 5.5 · medium |
| Entrevistador | main-thread skill | Opus 5.5 · medium |
| Roteirista-estrategista | subagent | Opus 5.5 · medium |
| Diretor de arte | subagent | Opus 5.5 · medium |
| Motion designer | subagent | Opus 5.5 · medium |
| Assistente de edição | subagent | Sonnet 5.5 · high |
| Editor de pré-corte | subagent | Sonnet 5.5 · high |
| Artista generativo | subagent | Sonnet 5.5 · high |
| Finalizador | subagent | Sonnet 5.5 · high |
| QC técnico (Crítico) | subagent (`plugin/estudio/agents/qc-tecnico.md`, built in ticket #12: runs `qc`, tools Bash/Read) | Sonnet 5.5 · high |
| Revisor de plataforma (Crítico) | subagent | Sonnet 5.5 · high |
| Guardião da marca (Crítico) | subagent | Sonnet 5.5 · xhigh |
