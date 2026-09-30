# Wiki schema

How this repo's LLM wiki is structured and maintained. The `llm-wiki` skill (`.claude/skills/llm-wiki/`) runs the operations; this file holds the conventions. Change a convention here, in one place.

## What this wiki covers

Everything an agent needs to build and run the studio plugin: the product idea, the personas of a professional editing studio, the pipeline, client briefing and grilling topics, visual identity, review and QC, platform specs (9:16 first, 16:9 accepted), the Claude plugin format, and the decisions taken along the way.

## Layout

```text
raw/                 immutable sources (research notes, reports, transcripts, clipped articles)
raw/assets/          images referenced by raw sources
wiki/SCHEMA.md       this file
wiki/index.md        catalog of every page, by category, one line each
wiki/log.md          append-only timeline
wiki/overview.md     the current synthesis, one page
wiki/sources/        one summary page per raw source
wiki/entities/       concrete things: personas, tools, platforms, files, skills
wiki/concepts/       ideas and rules: picture lock, safe zone, grilling, brand kit
wiki/analyses/       filed-back answers: comparisons, decision inputs
```

## Page format

- File name: kebab-case slug, English, `.md`.
- Frontmatter on every page except `index.md` and `log.md`:

  ```yaml
  ---
  title: <Title>
  type: source | entity | concept | analysis | overview
  updated: YYYY-MM-DD
  sources: [<relative links to wiki/sources/ pages or raw/ files>]
  ---
  ```

- Body: a one-paragraph summary first, then detail. Link other pages with relative markdown links. Keep the claim labels the sources use (`[verified]`, `[sourced]`, `[unverified]`).
- Contradictions stay visible: `> **Contradiction:** <claim A> (<source>) vs <claim B> (<source>)`.
- Language: English. Quote Portuguese sources verbatim when wording matters.

## index.md line format

`- [<Title>](<category>/<slug>.md) — <one-line summary> (updated YYYY-MM-DD)`, grouped under `## Sources`, `## Entities`, `## Concepts`, `## Analyses`.

## log.md entry format

`## [YYYY-MM-DD] <bootstrap|ingest|query|lint|update> | <Title>` followed by one line naming the pages touched. Append only.

## When the wiki must be updated

1. A new file lands in `raw/` → ingest it.
2. A change alters the studio's behavior, architecture, pipeline, personas, conventions or platform targets → run an `update`: edit the affected entity/concept pages and `overview.md`, then log `## [YYYY-MM-DD] update | <what changed>`. Code is not a raw source; the diff is the evidence, cited by commit or path.
3. A question produces a reusable synthesis → file it under `analyses/`.
4. Every 10 log entries, or on request → lint.

## Raw source rules

- Files in `raw/` are never edited after they land. A correction is a new file.
- Research output goes to `raw/research/<topic-slug>/` (notes, report, transcripts, a `README.md` listing them).
