# Estúdio plugin — maintainer guide

This repo is the Claude plugin marketplace that ships one plugin, `estudio`, from `plugin/estudio/`.
The video-director persona lives inside the plugin (`plugin/estudio/skills/estudio/`), not here.

- Talk to the maintainer in pt-BR; write code, comments, commits, issues, ADRs and wiki pages in English.
- Start with [docs/developer-guide.md](docs/developer-guide.md): layout, commands, packaging rules, how to release.
- Vocabulary: [CONTEXT.md](CONTEXT.md). Decisions: [docs/adr/](docs/adr/). Criadora-facing overview: [README.md](README.md).
- Edit only what ships under `plugin/estudio/`; the package must not reference repo docs outside it.
- Before calling work done: `node --test "tests/**/*.test.mjs"`, `npm run typecheck` and `node scripts/check-plugin.mjs .` are green.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `rodrigorjsf/studio` (use the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## LLM wiki

Project knowledge lives in `wiki/` (schema: `wiki/SCHEMA.md`), maintained with the `llm-wiki` skill; immutable sources live in `raw/`.

## Applied Learning

When something fails repeatedly, when User has to re-explain, or when a workaround is found for a platform/tool limitation, add a one-line bullet here. Keep each bullet under 15 words. No explanations. Only add things that will save time in future sessions.

- Tickets editing `CLAUDE.md` or deleting root folders: run in main session, not subagents.
- `core.autocrlf=true` here: tests reading repo files must normalize CRLF to LF.
- `npm` broken on the WSL box: run script bodies with `node` directly.
