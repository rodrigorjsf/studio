---
title: Overview
type: overview
updated: 2026-09-29
sources: [sources/estudio-profissional-de-video-report.md, sources/grilling-estudio-plugin-2026-09-29.md, sources/modelos-opus-sonnet-5-5.md]
---

# Overview

The studio repo (fork of mackswendhell/studio) is being turned into a Claude Code / Claude Desktop plugin that simulates a professional video-editing studio for small, part-time creators ([PROJETO.md](../PROJETO.md); dominant risk: solution). Vertical 9:16 is primary; 16:9 is accepted.

Current synthesis ([research report](sources/estudio-profissional-de-video-report.md)): the master is already picture-locked, so the studio's work is composition on top and the creative loop is brief → plan → style stills ([picture-lock](concepts/picture-lock.md)). What the repo lacks is a persisted brief ([grilling-catalogue](concepts/grilling-catalogue.md)), a persisted and enforced [brand kit per front](concepts/brand-kit-per-front.md), and a critic that is not the maker ([qc-technical-vs-editorial](concepts/qc-technical-vs-editorial.md), [studio-personas](entities/studio-personas.md)). Gates share one [approval-gate](concepts/approval-gate.md) shape and run on the main thread of a director entry skill ([plugin-architecture](concepts/plugin-architecture.md)). Success metric to test first: fewest questions per video once a front's kit exists.

Design settled in the 2026-09-29 grilling ([record](sources/grilling-estudio-plugin-2026-09-29.md), [settled design](analyses/estudio-plugin-decisions.md)): plugin `estudio`, Perfil → Projetos → Vídeos, 12 personas with pinned model/effort, both Níveis with Remotion montage, optional Pré-corte, no-admin installer. Glossary in [CONTEXT.md](../CONTEXT.md); decisions in ADRs 0001–0005.

Built so far: the plugin skeleton and marketplace (ticket #2), the Estúdio folder with the `estado`/`criar` CLI (ticket #3), and the session-start check plus the no-admin installer (ticket #4); see [plugin-architecture](concepts/plugin-architecture.md).
