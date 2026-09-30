---
title: Plugin architecture
type: concept
updated: 2026-09-29
sources: [../sources/estudio-profissional-de-video-report.md, ../sources/grilling-estudio-plugin-2026-09-29.md]
---

# Plugin architecture

Proposed packaging of the studio as a Claude Code plugin.

- **Entry skill = director** (e.g. `/studio:dirigir`), running every human gate on the main thread: subagents cannot use `AskUserQuestion`; workflows take no mid-run input; a plugin-root `CLAUDE.md` is not loaded.
- Skills: `dirigir`, `briefing` (grilling → `briefing.md`), `marca` (`marcas/<front>/`); guides become `references/`.
- Agents: assistant-editor, strategist, motion-builder, generative-artist; critics qc-tecnico, guardiao-da-marca, revisor-de-plataforma.
- Scripts under `skills/<x>/scripts/` via inline `${CLAUDE_SKILL_DIR}` (plugin path vars are not in the Bash env; skill bodies and hook commands get `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` substituted inline, verified with `claude -p --plugin-dir` in ticket #4); no top-level `bin/` (claude.ai/Cowork refuse the plugin).
- `SessionStart` hook only checks and reports; the no-admin installer puts runtimes into `${CLAUDE_PLUGIN_DATA}` after the Criadora's yes (superseded by ADR 0004, built in ticket #4 below); user data (kits, projects, deliverables) in the Estúdio folder. Plugin cap 200 MB / 5,000 files.
- Higgsfield: remote MCP in `.mcp.json`; sensitive `userConfig` reaches hooks/MCP only, not Bash scripts; a `PreToolUse` hook can enforce the credit gate.
- Surfaces: Claude Code CLI or Desktop Code tab local session; Cowork unverified for rendering; chat = skills + remote MCP only. **Plugins are unavailable in Desktop WSL sessions** — develop via CLI in WSL2.
- Distribution: GitHub marketplace via Customize → Plugins.

Related: [studio-personas](../entities/studio-personas.md), [approval-gate](approval-gate.md).

> **Settled (grilling 2026-09-29):** plugin name `estudio`, entry skill `/estudio:estudio` (not `/studio:dirigir`); package in `plugin/estudio/`; Higgsfield API-key path dropped for v1. See [estudio-plugin-decisions](../analyses/estudio-plugin-decisions.md).

## Built: Estúdio folder and `estado` (ticket #3)

- The deterministic CLI is `plugin/estudio/scripts/estudio.mjs` (JSON out; exit 2 on usage error), called from the entry skill as `node "${CLAUDE_PLUGIN_ROOT}/scripts/estudio.mjs" <cmd> "."`.
- `criar` scaffolds a folder: marker `estudio.json` (`schemaVersion: 1`), `projetos/`, and the Remotion template copied from `plugin/estudio/template/` (never overwrites; refuses an existing Estúdio).
- `estado` validates the marker, `perfil.md`, each `projetos/<projeto>/{projeto.md,kit.json}` and `videos/<vídeo>/video.md` (frontmatter `status`, `rodada`, `nivel`, `gate: aberto`), and returns Projetos, Vídeos, what waits for the Criadora and one `nextStep`. Names are reported NFC so Mac paths match.
- Layout contract: `plugin/estudio/scripts/lib/layout.mjs`; tests: `tests/estado.test.mjs`.

## Built: preparing the computer (ticket #4)

- `plugin/estudio/hooks/hooks.json` registers one `SessionStart` command that is valid in both bash and PowerShell: bash runs `scripts/verificar.sh` and exits; PowerShell (Windows without Git Bash) reads `` `# <# … #> `` as a comment and runs `scripts/verificar.ps1`. It prints one line only when something is missing and never installs. Evidence: `tests/preparar.test.mjs` (bash and PowerShell hook tests).
- `verificar.sh` / `verificar.ps1 --json` returns `missing` (`node`, `ffmpeg`, `ffprobe`, `python`, `remotion`) and `tools` (full paths). The skill runs every program by that path, because the portable runtimes are not on PATH.
- `instalar.sh` (macOS, Linux) and `instalar.ps1` (Windows) install one step at a time (`node`, `ffmpeg`, `python`, `remotion`, or `tudo`) into `${CLAUDE_PLUGIN_DATA}/runtime/`, with pinned Node, uv and Python versions (see the scripts' headers) + faster-whisper, and a static ffmpeg (latest release from martin-riedl on macOS; BtbN's 9.0 branch on Linux/Windows, rebuilt upstream, not pinned). Remotion dependencies go to the Estúdio's `node_modules/`. Caches stay in `${CLAUDE_PLUGIN_DATA}/cache/`. Re-runs skip what works.
- System stubs are never run by the check: macOS `/usr/bin/python3` (it opens the developer-tools window) and the Windows Store `python.exe`.
- Verified: a real install on Linux (73 s, nothing written to `$HOME`) and on Windows through WSL interop (96 s); `claude plugin uninstall` deletes `plugins/data/estudio-studio`. macOS is not verified on a Mac yet (end-to-end run, ticket #19).
