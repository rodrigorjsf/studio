---
title: Notion context
type: concept
updated: 2026-09-30
sources: [../sources/grilling-notion-context-2026-09-29.md, ../sources/spec-estudio-plugin-v1.md]
---

# Notion context

Read-only extra context from the Criadora's own Notion. She links Páginas Notion to a Projeto (several, via Projeto Grilling or `editar-projeto`) or a Vídeo (via briefing). Access goes only through her account's Notion connector; the plugin declares no Notion server. Only the Diretor/Entrevistador on the main thread read Notion, only linked pages (sub-pages with consent, default no), and write a dated Resumo Notion — the only form subagents see. Before the Plano the Diretor checks for page changes and asks to refresh. The Kit wins conflicts, surfaced with "this Vídeo only" / "update the Kit". Nothing is written to Notion; write-back is follow-up [#21](https://github.com/rodrigorjsf/studio/issues/21). Delivered by ticket [#20](https://github.com/rodrigorjsf/studio/issues/20).

## Built (ticket #20)

- Storage: each Projeto and Vídeo folder may hold `notion/paginas.json` (the links: `url`, `titulo`, `subpaginas` consent, default `false`, `vinculadaEm`) and `notion/resumo.md` (the pt-BR Resumo Notion; frontmatter `geradoEm`, `paginasLidas`, `subpaginasLidas`). Layout: `plugin/estudio/scripts/lib/layout.mjs`; schema and commands: `plugin/estudio/scripts/lib/notion.mjs`.
- `vincular-notion` links, changes or unlinks pages of a Projeto, or of a Vídeo with `"video"`. It accepts only https `notion.so` / `*.notion.site` addresses. Zero pages is valid.
- `resumo-notion` writes the dated Resumo. It refuses a source that is not linked (`not-linked`), sub-pages read without consent (`no-consent`), a linked page left out (`missing-pages`) and sub-pages she allowed but that were not read (`missing-subpages`).
- `estado` validates both files and reports `notion: {paginas, resumo}` for each Projeto and Vídeo. The `resumo` state is one of `sem-paginas`, `ausente`, `atualizado` or `desatualizado`; `desatualizado` means the links or the consent changed after the Resumo was written.
- `conferir-notion` compares each page's last-edited time, as her connector reports it, with the Resumo's `geradoEm`. A page read without a date counts as possibly changed, and a page not looked up asks nothing. It returns `mudaram` and `perguntarAtualizar`, so the Diretor asks whether to refresh before the Plano.
- `plano` requires a Plano not yet approved to cite every existing Resumo by its current date (`resumosNotion`). The Roteirista-estrategista receives only the Resumo paths.
- Seam 3 (`scripts/check-plugin.mjs`) enforces read-only Notion:
  - no Notion tool other than `notion-fetch` is named in the package;
  - no Notion server is declared;
  - no persona holds a Notion tool;
  - every persona declares a `tools` allowlist, so none inherits her connector.
- The Diretor's rules are in `plugin/estudio/skills/estudio/references/notion.md`: the lay connection path or skip, only linked pages, sub-pages with consent, the Kit-conflict choices, and the change check. Tests: `tests/notion.test.mjs` and `tests/plugin-structure.test.mjs`.

Related: [brand-kit-per-front](brand-kit-per-front.md), [plugin-architecture](plugin-architecture.md).
