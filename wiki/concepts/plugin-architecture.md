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

## Built: Perfil and Autonomia (ticket #5)

- Skill `plugin/estudio/skills/perfil/SKILL.md` (`/estudio:perfil`): the Entrevistador asks seven questions once — `quem-sou`, `trabalho`, `rotina`, `tempo-para-aprovar`, `nivel-tecnico`, `tom`, `autonomia` — and writes `perfil.md` (pt-BR) at the Estúdio root; reopening it edits only the answers she picks. The entry skill runs it when `estado` returns `nextStep.action: "perfil"`.
- Every question offers "Decide você": the recommendation becomes the answer and its key is listed under `decide-voce` in the frontmatter (removed when she later answers herself).
- `estado` validates the Perfil (`plugin/estudio/scripts/lib/perfil.mjs`: free-text answers present; `nivel-tecnico`/`tom`/`autonomia` among their options, accent- and case-insensitive; `decide-voce` names only known questions) and reports `perfil.{autonomia, tom, nivelTecnico, decideVoce}`. Tests: `tests/perfil.test.mjs`.
- Autonomia as told to her: baixa asks at every Gate; média auto-approves what the Kit already answers; alta decides almost everything and stops only for the review before the final video. Credit spending always waits for her. The Gate primitive that applies it is a later ticket.

## Built: no third-party skills (ticket #23)

- The plugin no longer depends on the `watch` plugin or the `remotion-best-practices` skill; the Criadora installs only `estudio`. The repo's `.claude/settings.json` no longer declares the `claude-video` marketplace, and `scripts/instalar.mjs` no longer installs either skill.
- Frame sampling: `plugin/estudio/scripts/frames/frames.py` and `runtime.py` are verbatim MIT copies from the `watch` skill (pinned commit and sha256 in `plugin/estudio/vendor.json`, attribution in `plugin/estudio/THIRD_PARTY.md`; `.gitattributes` marks them `-text` so the bytes never change). `amostrar.py` is the entry point: `--modo visao-geral` (scene-aware or uniform, near-duplicates dropped, cap 100) and `--modo zona-do-rosto` (1 fps over the whole clip, near-duplicates kept, for the Zona do rosto). It needs only Python stdlib + ffmpeg/ffprobe, run by `tools.*` paths; timestamps are on the source clock. Tests: `tests/amostrar.test.mjs` (need `ESTUDIO_DADOS` pointing at an installed plugin data folder, else skipped), `tests/terceiros.test.mjs`.
- Remotion guidance: `plugin/estudio/skills/estudio/references/remotion/` — 13 topic files written in our own words from Remotion's agent-skill rules at tag `v4.0.451` (the template's pinned version), checked against its type definitions; not copied, because the Remotion License does not clearly allow redistribution. The entry skill routes all Remotion work there.
