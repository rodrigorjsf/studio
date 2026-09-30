---
paths:
  - "src/**"
  - "scripts/**"
  - "tools/**"
  - "guias/**"
  - "estilos/**"
  - ".claude/skills/**"
  - ".claude/settings.json"
  - "CLAUDE.md"
  - "package.json"
  - "remotion.config.ts"
---
# Wiki sync on behavior changes

- When a change here alters studio behavior, architecture, pipeline, personas, conventions or platform targets (9:16 first, 16:9 accepted), run the `llm-wiki` skill's update in the same task: edit the affected pages in `wiki/entities/` and `wiki/concepts/`, revise `wiki/overview.md`, append `## [YYYY-MM-DD] update | <what changed>` to `wiki/log.md`.
- Cite the evidence on each updated page by file path or commit; code is not a raw source.
- Refactors, formatting and typo fixes that change no behavior need no wiki update.
- Before reporting the task done, run `grep "^## \[" wiki/log.md | tail -1` and confirm it shows the update line.
