# Wiki index

Catalog of every wiki page. Read this first. Format and rules: [SCHEMA.md](SCHEMA.md).

- [Overview](overview.md) — current synthesis of the studio plugin project (updated 2026-09-30)

## Sources

- [Research report — professional video studio and plugin packaging](sources/estudio-profissional-de-video-report.md) — roles, gates, grilling, brand kit, QC, 9:16 rules, plugin architecture (updated 2026-09-29)

- [Grilling record — estudio plugin (2026-09-29)](sources/grilling-estudio-plugin-2026-09-29.md) — 32 settled design decisions (updated 2026-09-29)
- [Research notes — Opus 5.5 vs Sonnet 5.5 per persona](sources/modelos-opus-sonnet-5-5.md) — benchmarks by effort and per-persona model choice (updated 2026-09-29)
- [Spec — Estúdio plugin v1](sources/spec-estudio-plugin-v1.md) — 86 user stories, test seams, out of scope; issue #1 (rev 1.1), tickets #2–#20, follow-up #21 (updated 2026-09-29)
- [Grilling record — Notion context (2026-09-29)](sources/grilling-notion-context-2026-09-29.md) — nine decisions for read-only Notion context (updated 2026-09-29)

## Entities

- [Studio personas](entities/studio-personas.md) — ~15 studio roles in four families and the compressed solo-creator chain; the README section "Quem trabalha em cada etapa" holds the actors and Gates tables (updated 2026-09-30)

## Concepts

- [Approval gate](concepts/approval-gate.md) — one gate primitive: maker, internal critic, consolidated notes, decision, round counter; review Rodadas in versioned folders; credit Gate and ~20% stop (updated 2026-09-30)
- [Brand kit per front](concepts/brand-kit-per-front.md) — persisted, enforced identity per Projeto, built as projetos/<projeto>/kit.json (updated 2026-09-30)
- [Grilling catalogue](concepts/grilling-catalogue.md) — brand vs per-video interview topics translated under locked-final-cut (updated 2026-09-29)
- [Notion context](concepts/notion-context.md) — read-only Páginas Notion per Projeto/Vídeo, Resumo Notion, Kit wins (updated 2026-09-30)
- [Picture lock](concepts/picture-lock.md) — the seam between creative loop and finishing; the Pré-corte cuts once, then the Master locks (updated 2026-09-30)
- [Plugin architecture](concepts/plugin-architecture.md) — director entry skill, subagents between gates, data locations, surfaces, Pré-corte, build/review/Entrega, technical QC, Nível 2 credits and generated assets, agent colors, the upstream-leftover check, the speech model mirrored on our GitHub Release and fetched by the Preparação's `modelo` step, offline transcription (exit 3 when the model is missing), and the host list with allowlist guidance (updated 2026-09-30)
- [Short-form 9:16 rules](concepts/short-form-9x16.md) — 1080×1920 primary, 3 s hook, ~900×1400 safe box, evidence tiers (updated 2026-09-29)
- [Technical vs editorial QC](concepts/qc-technical-vs-editorial.md) — automatable checks vs independent critic checks (updated 2026-09-29)

## Analyses

- [Estudio plugin — settled design](analyses/estudio-plugin-decisions.md) — package, data layout, commands, gates, Níveis, installer, metric (updated 2026-09-29)
