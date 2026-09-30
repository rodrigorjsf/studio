# Estúdio plugin v1 — a professional editing studio for the Criadora

## Problem Statement

A small creator who edits alone while holding another job (the Criadora) spends her scarce, tired hours editing short videos for more than one domain — her company account and her personal Instagram — and every edit starts from zero. Nothing remembers who she is, how each account should look and sound, which caption style she liked last time, or what was already decided. The current repo (a single "diretor de vídeo" persona driven by `CLAUDE.md`) proves an AI can compose good edits on top of a recorded video, but it keeps the brief only in chat, rebuilds the visual identity from screenshots on every video, lists 16:9 first although she publishes vertical, has no reviewer independent from whoever made the edit (the demo shipped a cropped face and caption-style drift), requires a developer's install ritual (clone, `npm run instalar`, `brew`/`winget`), and runs only when opened as a repo. She is non-technical, uses a Mac with the Claude Desktop Code tab, and will answer a brief with one paragraph and approve a plan with one word.

## Solution

Turn the repo into an installable Claude plugin, `estudio`, that behaves like a professional editing studio. The Criadora installs it from a marketplace, opens one folder (her Estúdio) in the Claude Desktop Code tab and types `/estudio:estudio`. The Diretor greets her, prepares her computer with one plain-language question if tools are missing, and interviews her once about herself (Perfil) and once per domain (Projeto), storing a Kit de marca for each. For every new Vídeo it asks only what the Kit does not already answer, then moves the Vídeo along the Esteira: optional Pré-corte, Plano, Quadros de estilo, build, internal review by three Críticos who never judge their own Autor's work, her review in counted Rodadas, render, technical QC and Entrega — stopping at each Gate for her approval (or recording an automatic approval, per her Autonomia). Nível 1 draws everything locally for free with Remotion; Nível 2 adds Higgsfield-generated images and clips, always behind a credit Gate. Vertical 9:16 is the default Formato; 16:9 is available on request. Every Vídeo records how many questions, Gates, Rodadas and minutes it took, so the team can tell whether the studio actually lightens her load.

## User Stories

### Install and first run

1. As a Criadora, I want to install the studio from Claude's plugin screen by pasting one marketplace name, so that I never clone a repository or open a terminal.
2. As a Criadora, I want the studio to update itself when the maintainer publishes a new version, so that I always have the fixed version without doing anything.
3. As a Criadora, I want to open any folder I choose as my Estúdio, so that my videos live where I can see them in Finder.
4. As a Criadora, I want the studio to recognize an empty folder and offer to set it up, so that I do not need to know which files it needs.
5. As a Criadora, I want the studio to recognize a folder it already set up, so that opening it again continues where I left off.
6. As a Criadora, I want to be asked once, in plain words, whether the studio may prepare my computer, so that I understand what will happen before anything is downloaded.
7. As a Criadora, I want the preparation to need no password and no extra windows, so that I cannot get stuck halfway.
8. As a Criadora, I want to be told roughly how long preparation takes and to see progress in plain words, so that I know it is working.
9. As a Criadora, I want to be able to say "agora não" to the preparation, so that I can come back later without breaking anything.
10. As a Criadora, I want the studio to tell me plainly when something is still missing at the start of a session, so that I am not surprised mid-edit.
11. As a Criadora, I want uninstalling the studio to remove everything it downloaded, so that my computer is left clean.
12. As a Criadora on Windows or Mac, I want the same experience on both systems, so that instructions from the maintainer always match what I see.

### Perfil

13. As a Criadora, I want to be interviewed once about who I am, what I do, my routine and how much time I have to approve things, so that the studio adapts to my life.
14. As a Criadora, I want to set how much I delegate (Autonomia baixa, média or alta), so that the studio stops asking what I trust it to decide.
15. As a Criadora, I want to choose how the studio talks to me (explain more or decide more), so that conversations fit my energy.
16. As a Criadora, I want to reopen and change my Perfil with `/estudio:perfil`, so that the studio keeps up with changes in my routine.
17. As a Criadora, I want every question to offer a "decide você" answer that uses the recommendation, so that I can move on when I am tired.

### Projetos and Kit de marca

18. As a Criadora, I want to create a Projeto for each domain I edit for (my company, my personal Instagram), so that each keeps its own rules.
19. As a Criadora, I want a full interview when I create a Projeto — business, audience, tone, references, camera behavior, framing, Prints, image interaction, animations, pacing, captions, color, sound, music policy, deliverables, credit budget — so that I answer those questions only once.
20. As a Criadora, I want to show reference images or videos instead of describing a style, so that the studio copies what I actually like.
21. As a Criadora, I want to approve the Kit de marca before it is used, so that nothing is edited in a look I did not agree to.
22. As a Criadora, I want the Kit to hold my logos, fonts, end card and other assets, so that I never upload them again.
23. As a Criadora, I want the Kit to remember my caption style, so that captions look the same in every video of that Projeto.
24. As a Criadora, I want to list all my Projetos and their Vídeos with `/estudio:projetos`, so that I see what is in progress, waiting for me or delivered.
25. As a Criadora, I want to change a Projeto's briefing or Kit with `/estudio:editar-projeto`, so that the next videos follow the new direction.
26. As a Criadora, I want a Kit change to apply only to new Vídeos unless I ask otherwise, so that delivered work does not change behind my back.
27. As a Criadora, I want the default Formato of each Projeto to be vertical 9:16, so that my Reels, TikToks and Shorts come out right without asking.
28. As a Criadora, I want the Kit's music policy to default to "I add the music in the app", so that my videos are not muted for copyright and I can use trending audio.
29. As a Criadora, I want to set a credit budget per Projeto for Nível 2, so that I never overspend.
30. As a Criadora, I want the studio to add learnings from each delivered Vídeo to the Kit after asking me, so that the studio gets better at my style over time.

### Starting a Vídeo

31. As a Criadora, I want to start a Vídeo with `/estudio:novo-video` and drop my recording in, so that the studio takes it from there.
32. As a Criadora, I want the studio to ask which Projeto the Vídeo belongs to when unclear, so that the right Kit is used.
33. As a Criadora, I want the Vídeo briefing to ask only the objective, the call to action, the key moments and what changes from the Kit, so that starting a Vídeo takes a minute.
34. As a Criadora, I want to be told which Prints would help the edit (sites, news, tools I mention) and why, so that I know what to capture.
35. As a Criadora, I want to choose Nível 1 or Nível 2 per Vídeo, so that I pay only when AI imagery is worth it.
36. As a Criadora, I want my original recording never to be changed or deleted, so that I can always go back to it.
37. As a Criadora, I want two recordings to be treated as two separate Vídeos unless I ask to join them, so that nothing is merged by accident.

### Pré-corte

38. As a Criadora who records without trimming, I want an optional Pré-corte that proposes removing silences and fumbles, so that I skip the most tiring manual step.
39. As a Criadora, I want to review the proposed cuts before they are applied, so that nothing I wanted is lost.
40. As a Criadora, I want the approved Pré-corte to become a new Master while the Original stays intact, so that I can always return to the full recording.
41. As a Criadora who already trims her videos, I want the Pré-corte off by default, so that the studio does not second-guess my cut.
42. As a Criadora, I want to be warned when a Master seems untrimmed (long pauses), so that I can choose the Pré-corte.

### Plano and Quadros de estilo

43. As a Criadora, I want a short Plano that lists what appears when and on which spoken word, so that I understand the edit before it is built.
44. As a Criadora, I want the Plano to state expected time, and for Nível 2 expected credits, before I approve, so that there are no surprises.
45. As a Criadora, I want the Plano to be reviewed internally before it reaches me, so that I only see a considered proposal.
46. As a Criadora, I want to see two or three labeled Quadros de estilo, so that I approve the look on real frames of my video.
47. As a Criadora, I want the Plano and the Quadros approved in one step when my Kit already defines the style, so that I answer fewer times.
48. As a Criadora, I want the studio to propose two or three directions itself after watching my video, so that I do not have to invent the edit.
49. As a Criadora, I want the studio to honor my request when I ask for something the editorial repertoire would not suggest, and to record it, so that my voice wins.
50. As a Criadora, I want content never to appear before I say it, so that the edit feels in sync with my speech.
51. As a Criadora, I want nothing ever to cover my eyes, mouth or face, measured across the whole video, so that I never appear cropped.
52. As a Criadora, I want my Prints shown whole with the highlighter exactly on the phrase I quote, so that the evidence is credible.
53. As a Criadora, I want text kept inside the area the apps do not cover, so that captions and titles are never hidden by buttons.
54. As a Criadora, I want a strong visual hook in the first seconds, so that viewers keep watching.

### Build and internal review

55. As a Criadora, I want the edit built from my Kit's colors, fonts, motion and caption style, so that every Vídeo of a Projeto looks like the same brand.
56. As a Criadora using Nível 2, I want generated images and clips to contain no text, so that all text stays sharp and correct.
57. As a Criadora using Nível 2, I want the studio to stop and ask if spending goes about 20% beyond the approved estimate, so that I stay in control of cost.
58. As a Criadora using Nível 2, I want to ask for Higgsedit-only features when I want them, with their own cost approval, so that advanced effects are available but never automatic.
59. As a Criadora, I want a technical reviewer to check duration, resolution, frame rate, loudness, black and frozen frames, so that the file is never broken.
60. As a Criadora, I want a brand reviewer to compare frames against my Kit, so that colors, fonts, logo and caption style are right.
61. As a Criadora, I want a platform reviewer to check safe areas, the hook and caption readability, so that the video works in the app.
62. As a Criadora, I want reviewers never to approve their own work, so that mistakes are actually caught.
63. As a Criadora, I want internal fixes to happen without bothering me, and to be told in one sentence with two options only when the reviewers cannot agree after three tries, so that I am involved only when it matters.

### My review and Rodadas

64. As a Criadora, I want to review key still frames before the final render, so that changes are cheap.
65. As a Criadora, I want to give all my notes at once and see them consolidated into one list, so that nothing I said is forgotten.
66. As a Criadora, I want to approve, approve with small changes, or ask for changes, so that small fixes do not cost another full review.
67. As a Criadora, I want each version kept (v01, v02…), so that I can compare or go back.
68. As a Criadora, I want to be told when a request is a new idea rather than a fix, so that I understand why it costs more time.

### Delivery

69. As a Criadora, I want the final vertical MP4 delivered inside the Vídeo's folder, so that I find everything in one place.
70. As a Criadora, I want a 16:9 version only when I ask, so that the studio does not waste time on formats I do not use.
71. As a Criadora, I want the delivery folder opened for me at the end, so that I can post right away.
72. As a Criadora, I want the final video to be exactly as long as the Master with my original audio untouched, so that my voice is never altered.
73. As a Criadora, I want transparent overlay files when I ask for them, so that I can finish in another editor if I prefer.

### Continuity

74. As a Criadora, I want `/estudio:estudio` to tell me where each Vídeo stopped and what the next step is, so that I can resume after days away.
75. As a Criadora, I want to leave a Vídeo mid-way and have no work lost, so that I can edit in small time slots.
76. As a Criadora, I want the studio to speak Portuguese and avoid jargon, explaining any technical term in half a sentence, so that I always understand.
77. As a Criadora, I want the studio to end each reply saying the next step and what I can ask now, so that I never feel lost.

### Maintainer

78. As the maintainer, I want every Vídeo to record the number of questions, Gates, Rodadas and minutes to delivery, so that I can measure whether the studio reduces her load.
79. As the maintainer, I want `/estudio:projetos` to show those averages per Projeto, so that I can compare her first and second videos.
80. As the maintainer, I want each persona to declare a fixed model and effort, so that cost and quality are predictable and a session-level effort change does not leak into subagents.
81. As the maintainer, I want the plugin package to contain only what the Criadora needs, so that it stays within the platform's size and file limits.
82. As the maintainer, I want the repo to act as the marketplace, so that publishing a new version is a push.
83. As the maintainer, I want to run the whole Esteira on my own short video on native Windows and via the CLI in WSL2 before she uses it, so that she never meets an untested path.
84. As the maintainer, I want deterministic logic (state, technical QC, Pré-corte) behind one tested command, so that regressions are caught without running a model.
85. As the maintainer, I want the Kit stored in a machine-readable form, so that the Remotion template and the brand reviewer read the same values.
86. As the maintainer, I want secrets never written to files or shown in chat, so that her Higgsfield account stays safe.

## Implementation Decisions

- **Packaging** (ADR 0005). One plugin, `estudio`, in its own package directory; the repo root is a marketplace listing it. Development material (wiki, raw research, idea-validation files, tests) stays outside the package. The fork diverges freely from upstream, credited in the README. The root `CLAUDE.md` becomes a developer guide; the director persona moves into the plugin.
- **Surfaces**. Claude Desktop Code tab in a local session (Mac for the Criadora, native Windows for testing) and the Claude Code CLI. Desktop sessions inside WSL, Cowork and claude.ai chat are out of scope for v1. No top-level `bin/` in the package.
- **Skills (main thread)**. `estudio` (entry: reads state, greets, routes to the next step), `novo-projeto`, `projetos`, `editar-projeto`, `novo-video`, `perfil`. The Diretor and Entrevistador are the only personas that ask the Criadora anything, because subagents cannot use the question tool and workflows accept no input mid-run (ADR 0001). The upstream guides become English reference files inside the relevant skills; a lean pt-BR guide for the Criadora stays in the repo docs.
- **Personas as subagents**, each with pinned full model ID and explicit effort: Roteirista-estrategista, Diretor de arte, Motion designer on Opus 5.5 `medium`; Assistente de edição, Editor de pré-corte, Artista generativo, Finalizador, QC técnico, Revisor de plataforma on Sonnet 5.5 `high`; Guardião da marca on Sonnet 5.5 `xhigh`. Diretor and Entrevistador run in the main session at Opus 5.5 `medium`. Críticos have no editing tools and only return a verdict with reasons. Sonnet personas at `xhigh` are told to stop and report rather than spawn their own reviewers.
- **Gate primitive**. Every Gate follows one shape: Autor produces a versioned artifact → Críticos review → notes consolidated → Criadora decides (approve / approve with changes / request changes) or Autonomia records an automatic approval → Rodada counter increments. Internal critic loop capped at 3 turns, then escalation in one sentence with two options. Scope changes (new concept, new footage, extra versions) are named as such.
- **Esteira** (Status values in parentheses): 0 onboarding — Perfil and Projeto Grilling, Kit approved; 1 Vídeo briefing (Briefing); 2 ingest by the Assistente de edição — probe, transcription with word timing, frames sampled densely enough to measure the Zona do rosto across the whole clip; 3 optional Pré-corte; 4 Plano with time/cost estimate (Planejamento); 5 Quadros de estilo, merged with 4 when the Kit defines style; 6 build (Construção); 7 internal QC loop (QC interno); 8 Criadora review of stills (Revisão, rodada N / Ajustes); 9 render and technical QC; 10 Entrega (Aprovado → Entregue); archive and Kit learnings (Arquivado).
- **Estúdio folder data model**. A marker file identifies the folder and its schema version. One Perfil document (pt-BR, with Autonomia). Per Projeto: a pt-BR briefing document holding the Grilling answers; a machine-readable Kit (color tokens, type scale, caption style, motion tokens, default Formato, music policy, credit budget, face-zone defaults per recording setup, do/don't list, transcription glossary); a Kit assets folder. Per Vídeo: a document whose frontmatter holds Status, Rodada, Nível, cost estimated/spent and the metric counters (questions asked, Gates, auto-approvals, Rodadas, start/delivery timestamps); the Original in its own folder; the Master; versioned review folders; the delivery folder. The upstream `edicoes/` folder is removed.
- **Deterministic CLI** (one executable, JSON in/out, run with the plugin's portable Node):
  - `estado` — reads an Estúdio folder, validates every document against its schema, returns each Projeto's and Vídeo's Status, what is waiting for the Criadora, and the next step; also computes metric averages per Projeto.
  - `qc` — compares a render with its Master: duration within ±1 frame, resolution, frame rate, single audio track, integrated loudness and true peak (measured and reported, never normalized), black and frozen frames; returns pass/fail with reasons. Photosensitivity is reported as a flagged manual check.
  - `precorte` — takes the word-timed transcript and an approved list of kept segments, writes a new Master without touching the Original, returns its duration and the segment map.
- **Remotion template**. Scaffolded into the Estúdio folder on first run, carrying the synchronized-split primitive, the example styles and a composition registry; every composition reads the Projeto's Kit. The master video is one continuous layer; all edits are composition on top (`locked-final-cut`). 9:16 compositions are the default; 16:9 variants on request.
- **Níveis** (ADR 0002). Remotion is the only montage engine for both. Nível 2 uses Higgsfield only as an asset source through its official remote connector with the Criadora's login; the API-key path and its script are dropped from the package. Higgsedit montage runs only on explicit request, behind its own cost Gate. Credit balance checked before generating; spending more than ~20% over the estimate stops work.
- **Installer** (ADR 0004). A session-start hook only checks for Node, Python with faster-whisper, ffmpeg/ffprobe and the Remotion dependencies, and reports. The Diretor asks one lay question; on yes, a per-OS script installs portable, no-admin builds into the plugin's data folder (Python via uv, static ffmpeg, portable Node) and Remotion dependencies into the Estúdio folder, narrating progress in plain Portuguese. Skills call scripts by inline plugin paths because plugin path variables are not in the shell environment.
- **Pré-corte** (ADR 0003). Proposed by the Editor de pré-corte from the transcript (silences, repeats, fumbles), approved by the Criadora, executed by `precorte`; the result becomes the Master and `locked-final-cut` applies from then on.
- **Standing rules carried from upstream**: Original untouched; one continuous original audio; final duration equals Master ±1 frame; triggers from word timing, nothing before it is said; Zona do rosto never covered, measured from real frames; Prints intact with exact highlighting; no text inside AI-generated imagery; never delete files the studio did not create; secrets never in files or chat; paths with spaces and accents always quoted.
- **Language**. Conversation and every file the Criadora reads in pt-BR; skill bodies, agent prompts, code and the project wiki in English; command names in pt-BR.

## Testing Decisions

- **What a good test is**: it drives a public entry point with realistic input and asserts only on observable output (JSON verdicts, files produced, exit codes) — never on internal functions or prompt wording.
- **Seam 1 — the deterministic CLI** (primary). `estado`, `qc` and `precorte` tested with Node's built-in test runner against fixture Estúdio folders (valid, missing marker, malformed Kit, Vídeos in each Status, metric counters) and synthetic 2–3 s videos generated by ffmpeg during the test (known duration, silences, black and frozen segments, loud and quiet audio). Assertions: next step and waiting items from `estado`; pass/fail reasons from `qc`; new Master duration, segment map and byte-identical Original from `precorte`.
- **Seam 2 — Remotion template**. The existing `npm run typecheck` (TypeScript plus the split-layout guard) stays; added: a still render of a fixture composition reading a fixture Kit, asserting the file exists at the expected size — proof the Kit reaches the frame.
- **Seam 3 — plugin structure**. Manifest and marketplace validation, plus a check that every persona declares model and effort, that Crítico personas have no editing tools, and that the package contains no development material and stays within size/file limits.
- **Not unit-tested**: model behavior (Grilling quality, Plano quality, Crítico judgment). Validated by the end-to-end run on the maintainer's own short video on native Windows and WSL2 CLI, then with the Criadora; evidence is the metric counters in each Vídeo document.
- **Prior art**: `scripts/check-split-layouts.mjs` (a Node script enforcing a structural rule, exiting non-zero on violation) and `npm run typecheck`; no test runner exists yet.

## Out of Scope

- Claude Desktop sessions in WSL, Cowork and claude.ai chat surfaces.
- The Higgsfield Cloud API-key path.
- Cutting, reordering or re-timing the Master beyond the approved Pré-corte; grading or re-mixing the original audio.
- Publishing to Instagram/TikTok/YouTube, scheduling, analytics ingestion, Trial Reels automation.
- Multi-user studios, sharing Kits between Criadoras, cloud sync of the Estúdio folder.
- A plugin-bundled music library (the Kit field exists; the library ships later).
- Automated photosensitivity analysis (reported as a manual check).
- Monetization, licensing and billing for the plugin.

## Further Notes

- Glossary: `CONTEXT.md`. Decisions: ADRs 0001–0005. Grilling record: `raw/grilling/2026-09-29-estudio-plugin.md`. Research: `raw/research/estudio-profissional-de-video/` and `raw/research/modelos-opus-sonnet-5-5/`. All ingested into the project wiki.
- Dominant risk (from the idea-validation track): a solution risk — whether gated personas lighten or burden a tired, non-technical creator. The success metric is the fewest questions per Vídeo once a Projeto's Kit exists; target from the second Vídeo of a Projeto: one override question and two approvals.
- Sonnet 5.5 `xhigh` cost is unpublished; if end-to-end runs show weak Críticos or high cost, switch all personas to Opus 5.5 `medium`.
- The Criadora-facing install guide (marketplace steps with screenshots) is written once by the maintainer.
