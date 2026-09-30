# Nível 1: editing with Remotion (free)

> Distilled from the upstream studio guide `2-nivel-1-remotion.md` and rewritten for the plugin. This reference is for you, the Diretor and the personas; talk to the Criadora in pt-BR and never paste it to her.
>
> Paths are relative to her Estúdio folder: the `estudio` skill scaffolds the Remotion template there (`package.json`, `src/`, `remotion.config.ts`), and each Vídeo lives in `projetos/<projeto>/videos/<vídeo>/`. Run `npm` and `npx` with the Node the computer check prints (`tools.node`), from the Estúdio folder. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

In Nível 1 the studio watches her video, reads the timing of every word she says and **programs** the animations with [Remotion](https://www.remotion.dev), a tool that turns code into video. She never codes: she talks, approves the Plano and reviews the result.

**Cost:** zero. Everything runs on her computer.
**Tools:** the plugin's frame sampler (see [watching a video](watching-a-video.md)), the plugin's transcriber `scripts/transcrever.py` (timing of each word), the plugin's [Remotion rules](remotion/index.md) and Remotion itself. All of them ship with the plugin or come from its installer; nothing else is installed.

If you have never used Remotion, read the [Remotion manual](remotion-manual.md) first. When you program, follow the [Remotion rules](remotion/index.md) for each topic you touch.

---

## What she hands in

1. Her **recording**, already trimmed or not (an untrimmed one can go through the optional Pré-corte). The [novo-video skill](../../novo-video/SKILL.md) copies it untouched into `projetos/<projeto>/videos/<vídeo>/original/`.
2. **Prints** (screenshots) of what she mentions and wants on screen, in the Vídeo's `prints/` folder: pages, news, tool screens, logos, charts. Nothing improves the result more: an animation built on a real Print is more faithful than a recreation. After the ingest, the Diretor tells her which Prints are still missing and why.
3. Her **guidance** for this Vídeo, from the short Vídeo briefing: the objective, the call to action, the key moments and what changes from the Kit de marca. Style, Formato and captions already come from the Kit.

Clear Print names (`noticia-openai.png`, `tela-configuracoes.png`) help the Roteirista-estrategista place each one.

## What she gets

Everything goes to the Vídeo's own `entrega/` folder (`projetos/<projeto>/videos/<vídeo>/entrega/`):

- **Full video** (default): the final MP4 in the Kit's Formato (vertical 9:16 unless she chose otherwise), with camera, animations, split screens and Prints over her original audio.
- **16:9 version**: only when she asks.
- **Transparent overlays**: only when she asks, to finish in another editor: `.mov` (ProRes 4444, with alpha channel) plus a list of timecodes.

---

## The Esteira in Nível 1

The studio runs these steps in order and **stops at every Gate**.

### 1. Vídeo, briefing and ingest

The [novo-video skill](../../novo-video/SKILL.md): it stores her recording as the Vídeo's Original, runs the Vídeo briefing, and has the Assistente de edição probe, watch and transcribe the video and measure the Zona do rosto. What the ingest writes, inside the Vídeo folder:

1. **Overview frames:** the frame sampler in `--modo visao-geral`, into `frames/visao-geral/`. Every frame listed is read to map framing, background and light, following [watching a video](watching-a-video.md).
2. **Face-zone frames:** the same sampler in `--modo zona-do-rosto`, into `frames/zona-do-rosto/`: one frame per second over the whole video, to measure where her face is across the whole clip (`zona-do-rosto.json`).
3. **Per-word timing (local and free):** `scripts/transcrever.py` (the exact command is in the Assistente de edição's instructions) writes `transcricao/palavras.json` (start and end of each word) and `transcricao/transcript.md`. A badly transcribed proper noun can be fixed in the text ("cloud" → Claude) without touching the timings; the Kit's transcription glossary prevents most of them.
4. When a moment matters (she points at the screen, a number appears), sample it again at those times (`--cues`) or in a `--start`/`--end` window.

### 2. Plano and Quadros de estilo (Gate)

The [plano skill](../../plano/SKILL.md): the Roteirista-estrategista writes the Plano as `plano.json` in the Vídeo folder, using the [editorial direction](editorial-direction.md): two or three directions with one recommended, her requests, the expected time, and every scene on a word index of `palavras.json`. The `plano` command refuses any scene before its word, over the Zona do rosto, with text outside the Área livre, or with a Print she did not supply. The Diretor de arte renders two or three Quadros de estilo on real frames of her video (`QuadroDeEstilo` in the template). The Diretor holds one Gate for both when the Kit defines the style, two otherwise.

**Nothing is programmed before the Plano is approved.**

### 3. Build

The [edicao skill](../../edicao/SKILL.md): the Motion designer builds the Vídeo's composition and renders the key stills of each version into `revisao/v01/`, `revisao/v02/`… Rules for the code:

- The Vídeo's code lives in `src/videos/<slug>/` and is registered in `src/Root.tsx` inside a `<Folder>`.
- **Build on `<Edicao>`** from `src/_shared/edicao.tsx`: her Master as ONE continuous layer with its original audio, lasting exactly as long as the Master. Register it with `calculateMetadata={calculateEdicaoMetadata}` and the props `{projeto, formato, video, master, duracao}` (`master` = the `master` field of `video.md`, `duracao` = the Master's seconds from ffprobe). The edit renders at a constant 30 fps (`EDICAO_FPS`) on the Formato's canvas.
- **Never trim, loop, speed up or re-time the Master**, and never add a second unmuted copy of it: a split screen or a camera card that shows her again uses `<MutedMaster>`. The camera changes size and place by animating the container, never by restarting the video.
- **Every value of the brand comes from the Kit de marca** (the Vídeo's own `kit.json` when it has one, else `projetos/<projeto>/kit.json`): colors, fonts, type scale, caption style, motion and Formato. The component receives the Kit as its `kit` prop. Build text, captions and entrances with `src/_shared/marca.tsx` (`fontStyle`, `KitCaptions`, `useKitEntrance`, `useKitFonts`). Never write a color, a font or a caption rule in a Vídeo's code. `src/kit/PreviaDoKit.tsx` is the worked example. `npm run typecheck` runs the Estúdio's guard (`scripts/guard.mjs`) after TypeScript: it fails on any hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`) or `fontFamily` string written in a file under `src/videos/`, naming each file and line; take the value from the Kit instead.
- **Formato:** `formato: null` renders the Kit's Formato. A 16:9 version exists only when she asks: render the same composition with `formato: "16:9"`.
- **Files of the Vídeo** (Prints, generated assets) are reached with `videoFile(projeto, video, arquivo)` from `src/_shared/edicao.tsx`: `projetos/` is Remotion's public folder.
- **Split screen:** always use `src/_shared/synchronized-split.tsx`, which makes the camera and the panel enter and leave together. `npm run typecheck` (the same guard) blocks hand-made splits.
- Every animation depends on `useCurrentFrame()`. No CSS transitions or animations.
- Timings come in seconds from `palavras.json` and are converted with the fps.
- `<Sequence premountFor={fps}>` on every scene with defined timing.
- Avoid `TransitionSeries.Transition` on the Master's timeline: the overlap shortens the video.
- The examples in `src/estilos/` show how each gallery style was built. They carry their own colors, so use them for technique only; the look comes from the Kit.

### 4. Internal review, then her review (Gate)

1. `npm run typecheck`.
2. Stills at the start, middle and end of each layout change, into the version folder:
   `npx remotion still src/index.ts <Composicao> "<vídeo>/revisao/v01/01-abertura.png" --frame=450`
3. The three Críticos judge the version before she sees it: the QC técnico runs `qc` on the full render, the Guardião da marca holds the frames against the Kit, the Revisor de plataforma checks the Área livre, the hook and caption readability. None of them made the version.
4. The Diretor shows her the key stills and holds her review in Rodadas (`abrir-revisao`, `decidir-revisao`).

### 5. Render and Entrega

The Finalizador renders into `entrega/`:

- **Final MP4:**
  `npx remotion render src/index.ts <Composicao> "<vídeo>/entrega/<nome> 9x16.mp4" --codec=h264 --crf=17`
- **Transparent overlay** (on request):
  `npx remotion render src/index.ts <Composicao> "<vídeo>/entrega/<nome> sobreposição.mov" --props='{"sobreposicao": true}' --image-format=png --pixel-format=yuva444p10le --codec=prores --prores-profile=4444 --muted` (`--muted`: without it Remotion adds a silent audio track, and an overlay carries none)
- **Validation:** the `qc` command on each MP4 (duration equal to the Master's ±1 frame, a Formato's canvas, 30 fps, a single audio track, loudness equal to the Master's with integrated loudness and true peak reported, no black or frozen stretch the Master does not have; photosensitivity flagged for a person to check), then `entregar`, which runs the same checks on every MP4 and, on an overlay, the duration and no audio track. A failed QC blocks the Entrega.
- The Diretor tells her where the files are, opens the `entrega/` folder, and names duration, Formato and timecodes (for overlays).
- Delete only the intermediates the studio created itself. Her recording and her Prints are never deleted.

---

## Requests she may make

```text
Quero a legenda maior e palavra por palavra neste vídeo.
```

```text
Usa a notícia no momento em que eu falo "pesquisa".
```

```text
Faz também uma versão horizontal (16:9) para o YouTube.
```

```text
Muda a cena 7 do plano: em vez de tela cheia, quero o print com a câmera no canto.
```
