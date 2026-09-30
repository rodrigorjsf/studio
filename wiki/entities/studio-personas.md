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
| Revisor de plataforma (Crítico) | subagent (`plugin/estudio/agents/revisor-de-plataforma.md`, built in ticket #13: Área livre, hook, caption readability; tools Bash/Read) | Sonnet 5.5 · high |
| Guardião da marca (Crítico) | subagent (`plugin/estudio/agents/guardiao-da-marca.md`, built in ticket #13: frames against the Kit; tools Bash/Read) | Sonnet 5.5 · xhigh |

Who calls whom, what each persona hands back, what it does on approval and on rejection, the top-down call-chain diagram and the table of every Gate are documented once, in pt-BR, in the [README section "Quem trabalha em cada etapa"](../../README.md#quem-trabalha-em-cada-etapa) (ticket #36). This page keeps only the cast and its models; it does not repeat those tables.

Added after the grilling: **Montador Higgsedit** (subagent, Sonnet 5.5 · high, `plugin/estudio/agents/montador-higgsedit.md`, ticket #16). It montages a stretch or the whole Vídeo in Higgsedit only on her explicit request, behind its own cost Gate; the cast is now 13 personas.

**Social media** (subagent, Sonnet 5.5 · medium, `plugin/estudio/agents/social-media.md`, ticket #44; cast now 14). The Diretor spawns it from the edicao skill beside the Finalizador once the Vídeo is Aprovado. It writes the [Texto do post](../concepts/post-copy.md) into `entrega/texto-do-post.md`, reruns the `texto-do-post` check until it passes (three rounds at most) and has no Gate; the Revisor de plataforma judging it is still to come (ticket #45). Every persona may also originate [Caderno](../concepts/caderno.md) entries in its report ([source](../sources/grilling-caderno-and-social-media-2026-09-30.md)).
