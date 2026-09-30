---
title: Plugin architecture
type: concept
updated: 2026-09-30
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

> **Settled (ticket #15):** the plugin declares no Higgsfield server; Higgsfield comes only from her own connector, and the credit gate is enforced by the `gastar-creditos` CLI check before each generation, not by a hook. See "Built: Nível 2 Higgsfield assets" below.

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

## Built: new Vídeo, briefing and ingest (ticket #9)

- Skill `plugin/estudio/skills/novo-video/SKILL.md` (`/estudio:novo-video`): the Diretor picks the Projeto (only one whose Kit is approved), takes one recording per Vídeo, runs the short Vídeo briefing (objetivo, chamada para ação, momentos-chave, "o que muda do Kit" with the Kit's empty text fields folded in, and the Nível per Vídeo), then names the missing Prints with reasons and moves the Vídeo to `Planejamento`.
- CLI `plugin/estudio/scripts/lib/video.mjs`: `novo-video` copies the recording byte for byte into `videos/<vídeo>/original/` (her file is never moved; a second recording into an existing Vídeo is refused) and writes `video.md` — frontmatter `status`, `nivel`, `rodada`, `gate`, `original`, `master`, `creditosEstimados`, `creditosGastos`, `perguntas`, `gates`, `aprovacoesAutomaticas`, `iniciadoEm`, `entregueEm`; pt-BR briefing sections in the body. `registrar-video` records the Nível, a Status and counter increments; `zona-do-rosto` joins the face measured on each frame into `zona-do-rosto.json`.
- Persona `plugin/estudio/agents/assistente-de-edicao.md` (`claude-sonnet-5-5`, effort `high`, tools Bash/Read/Write): transcribes with `plugin/estudio/scripts/transcrever.py` (faster-whisper, model cached in the plugin data folder, Kit glossary as a spelling hint), samples frames with `amostrar.py`, measures a face box on every face-zone frame (`medicoes.json`) and returns a report with the Prints that would help.
- Zona do rosto rule (`plugin/estudio/scripts/lib/ingest.mjs`): accepted only from a face-zone sampler run over the whole clip (no gap wider than 1 s, or duration/600 past 10 min) with every frame measured; the zone is the union of the boxes plus a 0.05 margin, or `null` when no face appears.
- `estado` reports per Vídeo `briefing` and `ingest.{transcricao, zonaDoRosto}` and validates the counters, timestamps, `palavras.json` and `zona-do-rosto.json`. The installers pin `faster-whisper==1.2.1` with `av<19` (PyAV 19 breaks every transcription). Tests: `tests/video.test.mjs`, `tests/transcrever.test.mjs`.

## Built: Plano and Quadros de estilo (ticket #10)

- Skill `plugin/estudio/skills/plano/SKILL.md` (`/estudio:plano`): for a Vídeo in `Planejamento`, the Diretor has the Roteirista-estrategista draft the Plano, checks it, has the Diretor de arte render the Quadros de estilo, and holds the Gate. The Plano and the Quadros share one Gate when the Kit defines the style (no empty look text field of the Kit; `som.*` does not count). Otherwise the Plano has its own Gate and the Quadros a second one. Her requests go to `pedidosDela` and win over the repertoire.
- Plano file `videos/<vídeo>/plano.json`, schema in `plugin/estudio/scripts/lib/plano.mjs`. It holds:
  - `tempoEstimadoMin`, plus `creditosEstimados` for Nível 2;
  - 2–3 `direcoes`, exactly one of them `recomendada`;
  - `pedidosDela`;
  - `cenas`, each a repertoire `tipo` with `inicio`/`fim` and a `gatilho {indice, palavra}` into `palavras.json`; only `camera` may omit it. Optional `elementos[].area` and a `print {arquivo, frase}`;
  - `quadros[] {rotulo, tempo, arquivo}`;
  - the stamps `aprovadoEm` and `quadrosAprovadosEm`.
- CLI `plano` (read-only) refuses the following:
  - a trigger whose word is not the transcript's;
  - a scene that starts before its word is said;
  - a scene that ends after the Master;
  - an element over the Zona do rosto on a full camera. Moved-camera scenes are listed in `rostoNaoVerificado` instead;
  - text outside the 9:16 Área livre (y 250/1920 to 1−420/1920);
  - a missing Print or highlight phrase;
  - fewer than 2 or more than 3 Quadros, or Quadros not rendered.

  It also returns `gate: unico | separado` and `lacunasDoKit`.
- CLI `aprovar-plano <plano|quadros|plano-e-quadros>` refuses the wrong Gate shape or a Plano that breaks a rule. On approval it stamps the Plano, closes the Gate and adds 1 to `gates`; once both parts are approved the Vídeo moves to `Construção`. `registrar-video` now also records `gate: "aberto" | null`. `estado` reports `plano` and `quadros` for each Vídeo.
- Personas `plugin/estudio/agents/roteirista-estrategista.md` and `diretor-de-arte.md` (`claude-opus-5-5`, effort `medium`, tools Bash/Read/Write).
- Template composition `plugin/estudio/template/src/quadro/QuadroDeEstilo.tsx` draws the Master (`<Video>` from `@remotion/media`) at the chosen frame, with the Kit's title and caption on top. `carregarKit` now follows the Vídeo's own Kit (prop `video`). Tests: `tests/plano.test.mjs` (Seam 1) and `tests/quadro.test.mjs` (Seam 2, a real H.264 frame).

## Built: Pré-corte (ticket #14)

- Off by default (ADR 0003). `pausas` (`plugin/estudio/scripts/lib/precorte.mjs`) reads the Master's `palavras.json` and lists every silence of 1.5 s or more before the first word, between two words or after the last word; it probes the Master's duration with `ffprobe`. `semCorte: true` (long pauses adding up to 3 s or more) makes the Diretor warn her and offer the Pré-corte as a Gate, never approved automatically (`plugin/estudio/skills/novo-video/references/pre-corte.md`, step 6 of `/estudio:novo-video`).
- Persona `plugin/estudio/agents/editor-de-pre-corte.md` (`claude-sonnet-5-5`, effort `high`, tools Bash/Read/Write) proposes the cuts (silêncio, repetição, tropeço), always between words, in `precorte/proposta.json` with the kept segments (`manter`). The Criadora approves the list, or drops some cuts, before anything is cut.
- `precorte` takes the approved `{"manter": [{inicio, fim}]}` plus the `ffmpeg`/`ffprobe` paths. It snaps every boundary to a frame and refuses a boundary inside a word (`cuts-a-word`). It re-encodes the kept segments (H.264 + AAC) into `master/<name>.mp4`. It moves `palavras.json` onto the new Master's clock and rebuilds `transcript.md` sentence by sentence, keeping the Original's transcript in `transcricao/original/`, and writes the segment map to `precorte/mapa.json`. Finally it points `master` in `video.md` at the new file. The Original stays byte-identical.
- From then on the Master is locked (`locked-final-cut`): `precorte` refuses (`master-locked`) once `master` differs from `original`, or once the Vídeo has left `Briefing`, because the Plano is timed on the Master. The Zona do rosto measured on the Original stays valid, because it is one area over every frame of the Original, a superset of the Master's frames. Tests: `tests/precorte.test.mjs` (the cut tests need `ESTUDIO_DADOS`).

## Built: build, review Rodadas and Entrega (ticket #11)

- Skill `plugin/estudio/skills/edicao/SKILL.md` (`/estudio:edicao`): for a Vídeo in `Construção`, `QC interno`, `Revisão`, `Ajustes` or `Aprovado`. The Motion designer builds a version, the Diretor holds her review, the Finalizador renders the Entrega and the Diretor opens the delivery folder for her.
- Template base `plugin/estudio/template/src/_shared/edicao.tsx`: `<Edicao>` draws her Master as one continuous layer with its original audio, lasting exactly `duracao` seconds (`calcularMetadadosDaEdicao`, 30 fps); `<MasterMudo>` shows her again silently in a split or card; `sobreposicao: true` drops the Master for a transparent overlay. `EdicaoComLegendas` (Master + Kit captions) is registered as the simplest edit.
- CLI (`plugin/estudio/scripts/lib/revisao.mjs`):
  - `nova-versao` gives the next version folder `revisao/vNN/` (the open one again while her review is pending);
  - `abrir-revisao` needs at least one still PNG, then sets `Revisão`, `rodada` = N and opens the Gate;
  - `decidir-revisao` takes `aprovar` (no notes), `aprovar-com-ajustes` (notes, no scope change: straight to `Aprovado`, no new Rodada) or `pedir-mudancas` (to `Ajustes`); it consolidates the notes (trimmed, repeats dropped), names the scope changes, writes `decisao.json` and the pt-BR `notas.md`, closes the Gate and adds 1 to `gates`.
- CLI `entregar` (`plugin/estudio/scripts/lib/entrega.mjs`): for an `Aprovado` Vídeo, holds every `.mp4`/`.mov` in `entrega/` against the Master (picture duration within one frame; one audio track per MP4, none per overlay), then sets `Entregue` and `entregueEm` and returns `abrir`, the program that opens the folder (Finder, Explorer, `explorer.exe` with a Windows path in WSL, `xdg-open`). The full technical QC stays `qc`'s (ticket #12; since then `entregar` runs it on every MP4, see below).
- `estado` reports `versao {nome, decisao}` per Vídeo. Personas `plugin/estudio/agents/motion-designer.md` (`claude-opus-5-5`, effort `medium`, tools Bash/Read/Write/Edit) and `finalizador.md` (`claude-sonnet-5-5`, effort `high`, tools Bash/Read).
- Remotion adds a silent audio track to a render unless `--muted`: overlays are rendered muted. Tests: `tests/revisao.test.mjs`, `tests/entrega.test.mjs` (Seam 1), `tests/edicao.test.mjs` (Seam 2: a real render keeps the Master's duration and loudness, the overlay is transparent and silent).

## Built: technical QC (ticket #12)

- CLI `qc "<folder>" "<projeto>" "<vídeo>" "<render>" "<ffmpeg>" "<ffprobe>"` (`plugin/estudio/scripts/lib/qc.mjs`): holds one render (path relative to the Vídeo folder) against the Master in one ffprobe call plus one ffmpeg decoding pass per file (`blackdetect`, `freezedetect`, `ebur128=peak=true`). Returns `passed`, `problemas` `[{check, message}]`, `medidas` of both files (size, fps, duration, audio tracks, integrated loudness LUFS, true peak dBTP, black and frozen stretches) and `verificacaoManual` (always `photosensitivity`: flashes are not measured).
- Checks: `duration` (within one frame), `resolution` (a Formato canvas: 1080×1920, 1920×1080, 1080×1080), `frame-rate` (constant 30 fps, the edit's), `audio-tracks` (exactly one), `loudness` (within 1.5 LU of the Master; measured, never normalized), `black-frames` (≥ 0.5 s), `frozen-frames` (≥ 2 s; a black stretch counts as black only). Black or frozen stretches the Master already has are not the render's fault.
- Loudness is measured as played in stereo: a mono track is copied to both channels, because Remotion renders a mono Master that way (+3 LU against a plain mono measure, found by `tests/edicao.test.mjs`).
- `entregar` now takes `"<ffmpeg>" "<ffprobe>"` and runs the same checks on every MP4 in `entrega/`, so a failed QC always blocks the Entrega; overlays keep the duration and no-audio checks. Its answer carries `verificacaoManual` (photosensitivity) too. A silent Master and an equally silent render pass `loudness`.
- Persona `plugin/estudio/agents/qc-tecnico.md` (`claude-sonnet-5-5`, effort `high`, tools Bash/Read: no editing tools, enforced by `scripts/check-plugin.mjs`). The Motion designer renders each version in full into `revisao/vNN/`; the QC técnico judges it before her review opens, and judges the Finalizador's MP4s before the Diretor runs `entregar` (the Finalizador no longer runs it). Tests: `tests/qc.test.mjs` (Seam 1, ffmpeg fixtures: pass and each failure reason), `tests/entrega.test.mjs`.

## Built: brand and platform Críticos with the internal loop (ticket #13)

- Personas `plugin/estudio/agents/guardiao-da-marca.md` (`claude-sonnet-5-5`, effort `xhigh`) and `plugin/estudio/agents/revisor-de-plataforma.md` (`claude-sonnet-5-5`, effort `high`), both tools Bash/Read (no editing tools, enforced by `scripts/check-plugin.mjs`). The Guardião holds the key stills plus frames it samples from the full render (one every 3 s, into a temp folder outside the Estúdio) against the Kit: `cor`, `tipografia`, `logo`, `legenda`, `movimento`, `fazer-evitar`. The Revisor checks `area-livre` (9:16: top 250 px, bottom 420 px), `gancho` (first 3 s, sampled every 0.5 s) and `legenda-legivel` (~40 px, contrast, ≤ ~5 words, ≥ ~0.3 s per word). Both return `aprovado`/`reprovado` with coded reasons and never suggest fixes.
- CLI `qc-interno "<folder>" "<projeto>" "<vídeo>" '<json>'` (`plugin/estudio/scripts/lib/qc-interno.mjs`): records one turn of the three Críticos on the version being built, `{"vereditos": {qc-tecnico, guardiao-da-marca, revisor-de-plataforma: {veredito, motivos}}, "custo": {tokens, segundos}}` (a rejection needs reasons). It moves the Vídeo to `QC interno`, appends the turn to `revisao/vNN/qc-interno.json` and adds `turnosInternos`, `tokensInternos`, `segundosInternos` to `video.md` (new metric counters, also `registrar-video` `somar`-able). `proximo`: `abrir-revisao` (all approved), `corrigir` (back to the Motion designer, she is not told) or `escalar` (the third rejected turn in a row: Gate opened, `estado` shows her waiting; the Diretor asks one sentence with two options: see the version as it is, or follow her direction, which closes the Gate and starts a new cycle of three turns). Refusals: `awaiting-criadora`, `already-approved`, `invalid-turn`, `invalid-turns` (a damaged `qc-interno.json` never reads as a fresh start), `not-building`, `no-version`. `abrir-revisao` now refuses `not-reviewed` unless the version's last turn was approved or escalated, so nothing reaches her before the Críticos.
- Cost is the `total_tokens` and `duration_ms` the Agent tool reports for each persona run of the turn, summed by the Diretor; it is the evidence for the spec's "switch to Opus if Sonnet `xhigh` is weak or costly" decision.
- The Guardião and the Revisor also judge the Quadros de estilo before her Plano/Quadros Gate (`plugin/estudio/skills/plano/SKILL.md` step 5), same cap, turns recorded with `registrar-video` `somar`. The Entrega's QC técnico loop keeps the same cap, its checks counted the same way.
- Tests: `tests/qc-interno.test.mjs` (Seam 1), `tests/video.test.mjs` (the new counters), `tests/plugin-structure.test.mjs` (Seam 3: the package installs both Críticos).

## Built: Nível 2 Higgsfield assets (ticket #15)

- Higgsfield is an asset source only (ADR 0002). She reaches it through her own connector, logged in with her account. The edit is still assembled in Remotion. `plugin/estudio/skills/estudio/references/level-2-higgsfield.md` was rewritten to say so: no Higgsedit montage, no API-key path, and assets in `gerados/`. Higgsedit on explicit request, behind its own cost Gate, is ticket #16.
- CLI `plugin/estudio/scripts/lib/creditos.mjs`:
  - `aprovar-creditos` is the credit Gate, for a Nível 2 Vídeo with an approved Plano. It takes `{saldo, creditosEstimados?}`. It refuses `insufficient-balance` (the balance does not cover the estimate minus what is already spent), `over-budget` (the Kit's `creditos.porVideo`, or `porMes` counting the Projeto's other Vídeos approved this month) and `below-spent`. Otherwise it writes `creditosEstimados` and `creditosAprovadosEm` to `video.md`, lifts a stop (closing only the Gate that stop opened) and adds 1 to `gates`. Autonomia never approves it.
  - `gastar-creditos` runs before each generation is paid. It takes exactly `{arquivo, creditos, saldo, modelo, prompt}`; any other key, a secret included, is refused unwritten. It refuses without the credit Gate, while a Gate is open or after a stop until she approves again (`creditosParadosEm`), when the prompt lacks `no text`/`sem texto`, when the balance does not cover the cost, and for a file already paid for. A cost that would take the spending past the estimate × 1.2 is refused as `over-limit`: the check also opens the Gate, so the work stops and `estado` shows the Vídeo waiting for her. Otherwise it adds the cost to `creditosGastos` and appends the generation to `gerados/gerados.json`. "Spent" is the sum of the quoted costs.
- Persona `plugin/estudio/agents/artista-generativo.md` (`claude-sonnet-5-5`, effort `high`). Its tools are Bash, Read, `mcp__claude_ai_Higgsfield` and `mcp__higgsfield`: the two server names her connector can take. That is not yet verified end to end. It generates before the Motion designer builds, downloads into `gerados/`, and redoes an image that shows text.
- Template: `<Gerado>` in `plugin/estudio/template/src/_shared/edicao.tsx` shows a generated image or clip over the frame, and a clip is always muted. `arquivoDoVideo` serves any file of the Vídeo folder.
- The structure check (`scripts/check-plugin.mjs`) rejects a package that names `HF_KEY`, `HF_API_KEY`, `HF_API_SECRET` or `hf_api.py`.
- Tests: `tests/creditos.test.mjs` (Seam 1), `tests/gerados.test.mjs` (Seam 2: a generated image reaches the frame; a noisy generated clip leaves her loudness unchanged) and `tests/plugin-structure.test.mjs` (Seam 3).
