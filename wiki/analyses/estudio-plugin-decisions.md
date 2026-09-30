---
title: Estudio plugin — settled design
type: analysis
updated: 2026-09-29
sources: [../sources/spec-estudio-plugin-v1.md, ../sources/grilling-estudio-plugin-2026-09-29.md, ../sources/estudio-profissional-de-video-report.md, ../sources/modelos-opus-sonnet-5-5.md]
---

# Estudio plugin — settled design

What the grilling fixed, as input to the spec. Terms follow [CONTEXT.md](../../CONTEXT.md).

- **Package**: plugin `estudio` in `plugin/estudio/`; repo root is a marketplace; dev material outside the package (ADR 0005).
- **Surfaces**: Claude Desktop Code tab local session (Mac, native Windows) and CLI. Not WSL Desktop, not Cowork/chat in v1.
- **Data**: Estúdio folder (`estudio.json`) → `perfil.md`, `projetos/<slug>/{projeto.md, marca/tokens.json, marca/assets/, videos/<NNN-slug>/{video.md, video/original/, video/master.mp4, revisao/vNN/, entrega/}}`.
- **Commands**: `/estudio:estudio` (entry), `novo-projeto`, `projetos`, `editar-projeto`, `novo-video`, `perfil`.
- **Gates** run by the Diretor on the main thread (ADR 0001); Autonomia turns some into recorded auto-approvals; critic loop cap 3.
- **Níveis**: both in v1; Remotion montage always; Higgsfield via official connector only; Higgsedit on request with its own cost gate (ADR 0002).
- **Pré-corte**: optional, writes a new Master (ADR 0003).
- **Installer**: no-admin, into `${CLAUDE_PLUGIN_DATA}`, one lay question (ADR 0004).
- **Music**: default "she adds it in the app".
- **Metric**: `video.md` counts questions, gates, time, rounds.
- **Validation**: maintainer's video on Windows first, then the Criadora.
- **Spec**: [Spec — Estúdio plugin v1](../sources/spec-estudio-plugin-v1.md), issue #1; test seams: one CLI (`estado`/`qc`/`precorte`), Remotion still render, plugin structure check.
- **Notion**: read-only context via her account connector, Páginas Notion per Projeto/Vídeo, dated Resumo Notion, main thread only; see [notion-context](../concepts/notion-context.md).
