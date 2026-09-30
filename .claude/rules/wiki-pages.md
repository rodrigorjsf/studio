---
paths:
  - "wiki/**"
---
# Wiki page upkeep

- Give every page the frontmatter from `wiki/SCHEMA.md` (title, type, updated, sources), a kebab-case English slug, and its category folder.
- For every page you create or edit, add or refresh its line in `wiki/index.md` as `- [Title](category/slug.md) — summary (updated YYYY-MM-DD)`, with the same date in the frontmatter `updated`.
- Append to `wiki/log.md` only; leave past entries unchanged.
- Keep conflicting sourced claims both visible with `> **Contradiction:**`; replace a sourced claim only when citing the newer source.
- Change conventions only in `wiki/SCHEMA.md`.
