---
title: Caderno
type: concept
updated: 2026-09-30
sources: [../sources/grilling-caderno-and-social-media-2026-09-30.md]
---

# Caderno

Built in ticket #40 (issue drafts and publishing are still planned): the studio's memory of how to work with the Criadora, separate from Kit learnings (which change the [Kit](brand-kit-per-front.md)). Decided in the [2026-09-30 grilling](../sources/grilling-caderno-and-social-media-2026-09-30.md); rationale in ADR 0007.

| Aspect | Decision |
|---|---|
| Layers | Estúdio (her, her computer) and one per Projeto (that domain); Diretor picks, default Estúdio |
| Sections | Elogios, Queixas, Soluções |
| Writer | any persona originates in its report (`caderno-proposto`); only the Diretor writes, via the `estudio.mjs` command `caderno` |
| Capture | Diretor spots Elogios/Queixas in her words, writes, tells her in one line |
| Conflicts | new vs old entry: she chooses; Queixa vs Kit: Diretor offers a Kit learning |
| Readers | Diretor at session start; every persona receives both paths (`<caderno-estudio>`, `<caderno-projeto>`) and reads them before working |
| Issues | planned, not built: plugin defects and recurring trouble become sanitized Rascunhos de issue, published only after her [Gate](approval-gate.md) at the close |

## Built (ticket #40)

- **Storage.** `caderno.md` at the Estúdio root and `projetos/<projeto>/caderno.md`, created on the first entry, pt-BR markdown with `## Elogios`, `## Queixas` and `## Soluções` and one line per entry: `- **#3** <text> — _<persona>, <Vídeo>, <date>_`. Identifiers are per file, the next one is the highest plus one.
- **CLI `caderno "<folder>" '<json>'`** (`plugin/estudio/scripts/lib/caderno.mjs`): `acao` `anexar` (layer, section, text, persona, optional Vídeo; the command stamps the date), `substituir` (same place, new text and stamp) or `remover`, both by `id`. Layers `estudio`/`projeto`, sections `elogios`/`queixas`/`solucoes`. It refuses with a stable `reason` and changes no file: `unknown-layer`, `unknown-section`, `unknown-projeto`, `unknown-video`, `unknown-entry`, `invalid-input`, `not-estudio`. Whether two entries conflict stays the Diretor's judgement.
- **`estado`** reports `caderno: {caminho, existe}` for the Estúdio and for each Projeto (absolute paths, so the Diretor hands them to personas as they are).
- **Prompts.** The Diretor's skills (`estudio`, `novo-video`, `plano`, `edicao`, with the protocol in `skills/estudio/references/caderno.md`) cover reading, capture with a one-line notice, layer choice, conflict resolution and the Kit learning offer. Every persona prompt has a "The Caderno" section: both paths, read first, and an optional `caderno-proposto` report field.
- Tests: `tests/caderno.test.mjs`, `tests/estado.test.mjs`.

```mermaid
flowchart LR
  P[Persona report] -->|proposed entry| D[Diretor]
  C[Her words] -->|Elogio / Queixa| D
  D -->|append| E[(Caderno do Estúdio)]
  D -->|append| J[(Caderno do Projeto)]
  D -->|bug or repeated trouble| R[Rascunho de issue]
  R -->|her yes at close| G[GitHub issue]
  R -->|her no| L[issues/ folder]
  classDef store fill:#fde68a,stroke:#b45309;
  class E,J store;
```
