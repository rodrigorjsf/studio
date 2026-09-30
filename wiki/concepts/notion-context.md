---
title: Notion context
type: concept
updated: 2026-09-29
sources: [../sources/grilling-notion-context-2026-09-29.md, ../sources/spec-estudio-plugin-v1.md]
---

# Notion context

Read-only extra context from the Criadora's own Notion. She links Páginas Notion to a Projeto (several, via Projeto Grilling or `editar-projeto`) or a Vídeo (via briefing). Access goes only through her account's Notion connector; the plugin declares no Notion server. Only the Diretor/Entrevistador on the main thread read Notion, only linked pages (sub-pages with consent, default no), and write a dated Resumo Notion — the only form subagents see. Before the Plano the Diretor checks for page changes and asks to refresh. The Kit wins conflicts, surfaced with "this Vídeo only" / "update the Kit". Nothing is written to Notion; write-back is follow-up [#21](https://github.com/rodrigorjsf/studio/issues/21). Delivered by ticket [#20](https://github.com/rodrigorjsf/studio/issues/20).

Related: [brand-kit-per-front](brand-kit-per-front.md), [plugin-architecture](plugin-architecture.md).
