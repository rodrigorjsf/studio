# Grilling record — estudio plugin (2026-09-29)

Decisions settled with the maintainer in the grill-with-docs session. Glossary: [CONTEXT.md](../../CONTEXT.md). ADRs: [docs/adr/](../../docs/adr/).

| # | Decision | Answer |
|---|---|---|
| Q1 | What the repo becomes | The whole repo becomes the plugin (package under `plugin/estudio/`, Q31) and scaffolds a separate Estúdio folder on first run |
| Q2 | Target surface | Criadora: Mac, Claude Desktop **Code tab**. Maintainer tests on native Windows Desktop and via CLI in WSL2 |
| Q3 | Níveis in v1 | **Both** Nível 1 (Remotion) and Nível 2 (Higgsfield) |
| Q4 | Data hierarchy | Perfil (one) → Projetos (many; e.g. company, personal Instagram) → Vídeos (many per Projeto). "Frente" rejected |
| Q5 | Input contract | Optional **Pré-corte** stage (off by default) |
| Q6 | Upstream | Diverge freely, credit in README |
| Q7 | Language | Creator-facing files and chat in pt-BR; plugin internals (SKILL.md, agents, code, wiki) in English; commands pt-BR |
| Q8 | Estúdio folder | One folder = one studio, marked by `estudio.json`, scaffolded on first run; must work on Mac **and Windows** |
| Q9 | Personas | 12: Diretor, Entrevistador (main thread); Assistente de edição, Editor de pré-corte, Roteirista-estrategista, Diretor de arte, Motion designer, Artista generativo, Finalizador, Críticos QC técnico / Guardião da marca / Revisor de plataforma (subagents). Critic never approves its own Autor |
| Q10 | Esteira | 0 onboarding (Perfil+Projeto grilling, Kit — gate) → 1 Vídeo briefing (gate) → 2 ingest → 3 Pré-corte opt. (gate) → 4 Plano + internal critique (gate, with time/cost/credits) → 5 Quadros de estilo (gate; may merge with 4 when Kit defines style) → 6 build → 7 internal QC loop → 8 Criadora review of stills, Rodadas (gate) → 9 render + technical QC → 10 Entrega (final gate) → archive + Kit learnings |
| Q11 | Grilling depth | Full catalogue once per Projeto; per-Vídeo only objective, CTA, key moments, Kit overrides; "decide você" option on every question |
| Q12 | Nível 2 montage | Always Remotion; Higgsfield as asset source; Higgsedit advanced features available **on request** |
| Q13 | Pré-corte mechanics | New file from transcript segments; Original in `video/original/`, approved Master in `video/master.mp4` |
| Q14 | Commands | `/estudio:estudio` (entry, reads state), `novo-projeto`, `projetos`, `editar-projeto`, `novo-video`, `perfil` (prefix per Q27) |
| Q15 | Perfil | Who she is, work, routine/time to approve, technical level, conversation tone, **Autonomia** (baixa/média/alta → auto-approved gates, recorded) |
| Q16 | Projeto files | `projeto.md` (pt-BR briefing), `marca/tokens.json` (machine-readable Kit, read by Remotion and the Guardião), `marca/assets/` |
| Q17 | Vídeo state | `video.md` frontmatter: Status, Rodada, Nível, cost estimated/spent; versions in `revisao/vNN/` |
| Q18 | Higgsedit on request | Same rules + its own cost gate |
| Q19 | Dependencies | SessionStart hook only checks; Diretor offers install in lay language (no "brew/winget") |
| Q20 | Validation | Maintainer's own short video end-to-end on Windows first, then the Criadora |
| Q21 | Installer | No-admin installer into `${CLAUDE_PLUGIN_DATA}` (uv Python, static ffmpeg, portable Node); one question "Posso preparar seu computador…?" |
| Q22 | Critic loop cap | 3 turns, then escalate in one sentence with two options; cost/time per turn in `video.md` |
| Q23 | Delivery path | `projetos/<slug>/videos/<NNN-slug>/entrega/<slug>-final-9x16.mp4` (+16:9 when asked); open folder at the end; `edicoes/` removed |
| Q24 | Spec format | GitHub issue via `to-spec`, sliced with `to-tickets`; copy/summary to `raw/` and wiki |
| Q25 | Music | Kit field: none / plugin free library / **added by her in the app** (default) |
| Q26 | Risk metric | `video.md` auto-counts questions, gates, time to delivery, rounds; `/estudio:projetos` shows per-Projeto averages |
| Q27 | Plugin name | `estudio` |
| Q28 | Distribution | Repo is a marketplace; install via Customize → Plugins → Add marketplace `rodrigorjsf/studio` |
| Q29 | Existing assets | CLAUDE.md persona → Diretor skill (CLAUDE.md becomes dev guide); guias → skill `references/` (EN) + lean pt-BR `docs/` for her; estilos → workspace template + Diretor de arte reference; tools/*.py → `skills/<x>/scripts/`; example plano → skill example; dev material stays out of the package |
| Q30 | Models | Opus 5.5 `medium`: Diretor, Entrevistador, Roteirista-estrategista, Diretor de arte, Motion designer. Sonnet 5.5 `high`: Assistente de edição, Editor de pré-corte, Artista generativo, Finalizador, QC técnico, Revisor de plataforma. Sonnet 5.5 `xhigh`: Guardião da marca. Full model IDs; `effort` set on every persona |
| Q31 | Package location | `plugin/estudio/`, marketplace.json at repo root |
| Q32 | Higgsfield path B | Dropped for v1 (connector login only); `hf_api.py` archived outside the package |

Standing product decision: vertical **9:16** is the primary Formato; 16:9 accepted as secondary.
