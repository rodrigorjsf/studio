# Grilling record — Notion context (2026-09-29)

Amendment to the estudio plugin design. Glossary: [CONTEXT.md](../../CONTEXT.md). Spec: [estudio-plugin-v1.1.md](../specs/estudio-plugin-v1.1.md).

| # | Decision | Answer |
|---|---|---|
| Q1 | How Notion connects | Through the Criadora's own Notion connector in her Claude account; plugin declares no Notion server, only detects the tools and teaches the lay connection path |
| Q2 | Link level | Projeto (several pages, asked in Projeto Grilling) and Vídeo (asked in briefing); zero is valid |
| Q3 | Read or write | Read-only in v1; write-back filed as follow-up #21 |
| Q4 | Live or snapshot | Read at fixed moments, store a dated Resumo Notion; before the Plano, check for changes and ask to refresh |
| Q5 | Who touches Notion | Only Diretor/Entrevistador on the main thread; subagents read only the Resumo |
| Q6 | Privacy | Only linked pages; sub-pages only with consent (default no); never search the workspace |
| Q7 | Conflict with Kit | Kit wins; conflict shown with "this Vídeo only" / "update the Kit" |
| Q8 | Terms | Página Notion, Resumo Notion |
| Q9 | Tickets | New vertical slice #20 blocked by #10; notes on #3, #6, #7, #9, #10; #19 now also blocked by #20 |
