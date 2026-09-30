---
paths:
  - "raw/**"
---
# Raw sources are immutable

- Leave every committed file under `raw/` unchanged; a correction is a new file beside it. Only `README.md` indexes may be updated, to list new files.
- Put research output in `raw/research/<topic-slug>/` with a `README.md` listing its files; put images in `raw/assets/`.
- After adding a raw file, run the `llm-wiki` skill's ingest for it in the same task.
