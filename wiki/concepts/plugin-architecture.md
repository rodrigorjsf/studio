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
- Scripts under `skills/<x>/scripts/` via inline `${CLAUDE_SKILL_DIR}` (plugin path vars are not in the Bash env); no top-level `bin/` (claude.ai/Cowork refuse the plugin).
- `SessionStart` hook installs node_modules / faster-whisper / weights into `${CLAUDE_PLUGIN_DATA}`; user data (kits, projects, deliverables) in the workspace. Plugin cap 200 MB / 5,000 files.
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

## Built: Perfil and Autonomia (ticket #5)

- Skill `plugin/estudio/skills/perfil/SKILL.md` (`/estudio:perfil`): the Entrevistador asks seven questions once — `quem-sou`, `trabalho`, `rotina`, `tempo-para-aprovar`, `nivel-tecnico`, `tom`, `autonomia` — and writes `perfil.md` (pt-BR) at the Estúdio root; reopening it edits only the answers she picks. The entry skill runs it when `estado` returns `nextStep.action: "perfil"`.
- Every question offers "Decide você": the recommendation becomes the answer and its key is listed under `decide-voce` in the frontmatter (removed when she later answers herself).
- `estado` validates the Perfil (`plugin/estudio/scripts/lib/perfil.mjs`: free-text answers present; `nivel-tecnico`/`tom`/`autonomia` among their options, accent- and case-insensitive; `decide-voce` names only known questions) and reports `perfil.{autonomia, tom, decideVoce}`. Tests: `tests/perfil.test.mjs`.
- Autonomia as told to her: baixa asks at every Gate; média auto-approves what the Kit already answers; alta decides almost everything and stops only for the review before the final video. Credit spending always waits for her. The Gate primitive that applies it is a later ticket.
