---
name: llm-wiki
description: Generate or update this repo's LLM wiki (Karpathy pattern: immutable raw/ sources, LLM-owned wiki/, schema). Use when a new source lands in raw/ (research notes, reports, transcripts, clipped articles), when a change alters the studio's behavior, architecture, pipeline, personas or conventions, when the user asks a question the wiki should answer, when a valuable answer should be filed back, or when the user asks to lint, health-check or bootstrap the wiki.
---

# LLM Wiki

The wiki is a **persistent, compounding artifact**: knowledge is compiled once into interlinked markdown and *kept current*, never re-derived per question. You own every page in `wiki/`; the human curates `raw/` and asks questions.

Before any operation, read [`wiki/SCHEMA.md`](../../../wiki/SCHEMA.md) — the repo-local conventions (page format, categories, triggers). The pattern this skill implements is bundled in [`PATTERN.md`](PATTERN.md); open it only when a convention is missing from the schema.

## Layers

| Layer | Path | Who writes |
|---|---|---|
| Raw sources | `raw/` (images in `raw/assets/`) | human or research agents; **immutable** — read, never edit |
| Wiki | `wiki/` | you, entirely |
| Schema | `wiki/SCHEMA.md` | you and the human, co-evolved |

## Pick the branch

- `wiki/index.md` missing → **Bootstrap**.
- A new file under `raw/`, or a repo change to behavior/architecture/conventions → **Ingest**.
- A question to answer from accumulated knowledge → **Query**.
- "lint", "health-check", or 10+ log entries since the last lint → **Lint**.

## Bootstrap

1. Create `wiki/index.md`, `wiki/log.md`, `wiki/overview.md`, `wiki/SCHEMA.md` and the category folders `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`, `wiki/analyses/`, using the templates in `wiki/SCHEMA.md` (or `PATTERN.md` if the schema is absent).
2. Create `raw/` and `raw/assets/` if missing.
3. Append `## [YYYY-MM-DD] bootstrap | Wiki created` to `log.md`.

Done when every file above exists and `grep "^## \[" wiki/log.md | tail -1` prints the bootstrap line.

## Ingest

One source (or one repo change) at a time.

1. Read the source in full. For a repo change, the source is the diff plus the commit/PR description.
2. Write `wiki/sources/<slug>.md`: summary, key claims with their labels (`[verified]` / `[sourced]` / `[unverified]` as the source marks them), and a link to the raw file. Repo changes get no source page — go to step 3.
3. Update every entity and concept page the source touches; create pages for concepts it names that lack one. Where the source contradicts a page, keep both claims and add a `> **Contradiction:**` note citing each side.
4. Revise `wiki/overview.md` if the synthesis moved.
5. Add or update each touched page's line in `wiki/index.md` (link + one-line summary), under its category.
6. Append `## [YYYY-MM-DD] ingest | <Title>` to `wiki/log.md`, with one line listing the pages touched.

Done when: the source page exists (raw sources only); every touched page links back to the source page or raw file; every touched page has its line in `index.md`; the new log line prints from `grep "^## \[" wiki/log.md | tail -1`.

## Query

1. Read `wiki/index.md` first, then the pages it points to. Go to `raw/` only for what the wiki lacks.
2. Answer with citations to wiki pages.
3. If the answer is a reusable synthesis (comparison, analysis, decision input), file it as `wiki/analyses/<slug>.md`, link it from the pages it draws on, index it, and log `## [YYYY-MM-DD] query | <Question>`.

Done when the answer cites pages, and a filed answer has its index line and log line.

## Lint

Check every page for: contradictions between pages; claims superseded by newer sources; orphans (no inbound link); concepts mentioned on 2+ pages without their own page; missing cross-references; files in `wiki/` absent from `index.md`; index lines pointing at missing files. Fix what is mechanical; list the rest, with suggested new sources or questions, in the log entry `## [YYYY-MM-DD] lint | <summary>`.

Done when every check above was run over every page and the lint log line exists.
