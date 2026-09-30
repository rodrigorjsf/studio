# The LLM Wiki pattern

Distilled from Andrej Karpathy, "LLM Wiki" (gist 442a6bf555914893e9891c11519de94f, fetched 2026-09-29). Bundled here so the skill works without network access.

## Idea

RAG rediscovers knowledge on every question. Instead, the LLM incrementally builds and maintains a wiki between the human and the raw sources: each new source is read, summarized and integrated — entity pages updated, summaries revised, contradictions flagged. Knowledge compounds; bookkeeping costs the LLM nearly nothing, which is why the wiki stays maintained.

## Three layers

- **Raw sources** — curated source documents (articles, papers, images, data). Immutable; the source of truth. The LLM reads, never modifies.
- **The wiki** — LLM-generated markdown: summaries, entity pages, concept pages, comparisons, an overview, a synthesis. The LLM owns it entirely; the human reads it.
- **The schema** — a document telling the LLM how the wiki is structured, its conventions, and the ingest/query/maintenance workflows. Co-evolved by human and LLM.

## Three operations

- **Ingest** — read a new source, discuss takeaways, write a summary page, update the index, update relevant entity/concept pages, append to the log. One source may touch 10–15 pages. One-at-a-time with human involvement is the default; batch is allowed.
- **Query** — search the wiki (index first), read pages, answer with citations. Answer forms vary (page, table, slides, chart). Good answers are filed back as new pages so explorations compound.
- **Lint** — periodic health check: contradictions, stale claims superseded by newer sources, orphan pages, important concepts lacking a page, missing cross-references, data gaps a search could fill; suggest new questions and sources.

## Two special files

- **index.md** — content-oriented catalog: every page with a link, a one-line summary, optional metadata (date, source count), grouped by category. Updated on every ingest; read first on every query. Sufficient up to ~100 sources / hundreds of pages without embeddings.
- **log.md** — chronological, append-only record of ingests, queries and lint passes. Each entry starts with a fixed prefix, e.g. `## [2026-04-02] ingest | Article Title`, so `grep "^## \[" log.md | tail -5` lists the last five.

## Optional

- A local search tool (e.g. qmd, BM25/vector hybrid with CLI and MCP) once the index stops being enough.
- Images downloaded locally to `raw/assets/`; read text first, then view images separately.
- YAML frontmatter (tags, dates, source counts) for query tooling such as Obsidian Dataview.
- The wiki is a git repo: history, branching and collaboration come free.

## Note

The pattern is intentionally abstract: directory structure, schema conventions, page formats and tooling are instantiated per domain in the schema.
