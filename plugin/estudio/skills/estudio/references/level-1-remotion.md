# Nível 1: editing with Remotion (free)

> Translated from the upstream studio guide `2-nivel-1-remotion.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> Paths and commands here (`src/`, `tools/`, `projetos/`, `guias/`, `npm run …`) describe the upstream repo layout, not this plugin. The Estúdio folder (`projetos/<projeto>/videos/<vídeo>/`, scaffolded with its Remotion template by the `estudio` skill) and the no-admin installer (ticket #4) provide their plugin equivalents. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

In Nível 1, Claude watches your video, understands what you say and **programs** the animations with [Remotion](https://www.remotion.dev), a tool that turns code into video. You do not need to know how to code: you talk, approve the plan and check the result.

**Cost:** zero. Everything runs on your computer.
**Tools:** the `watch` skill (watches the video), `tools/transcrever.py` (timing of each word), the `remotion-best-practices` skill (Remotion best practices) and Remotion itself.

*Pending: the plugin's no-admin installer (ticket #4) replaces this step.* (Applies to every `tools/*.py` and `npm run` setup step in this guide.)

If you have never used Remotion, read the [Remotion manual for beginners](remotion-manual.md) first.

---

## What you hand in

1. The **already cut** video in `projetos/<NNN. nome>/video/`.
2. **Prints** (screenshots) of everything you want animated in `projetos/<NNN. nome>/prints/`: pages, news, tool screens, logos, charts. This is the point that improves the result the most. An animation built on a real print is always more faithful and better looking than a recreation.
3. Your **guidance** as free text: desired style (see the [gallery](style-gallery.md)), format (horizontal or vertical), what must not be missing, what to avoid.

Tip: give the prints clear names (`noticia-openai.png`, `tela-configuracoes.png`). Claude uses the name to know where each one goes.

## What you get

One of two deliverables (Claude asks if it is not clear):

- **Full video** (default): a final MP4 with camera, animations, split screens and prints, with the original audio.
- **Separate inserts:** loose files for you to assemble in your own editor. Transparent overlays in `.mov` (ProRes 4444, with alpha channel) and full screens in `.mp4`, plus a list of timecodes.

Everything goes to `edicoes/<NNN. nome>/`.

---

## The process, step by step

Claude runs these phases in order and **stops at the approval points**.

### 1. Organize

- Finds the new folder in `projetos/`. If you only dropped a video there, it creates `projetos/<NNN>/video/` and moves the file inside.
- Numbering: three digits, dot and space (`001. meu-video`). New project = highest existing number + 1.
- Runs `ffprobe` on the video to record duration, resolution, fps and codecs at the top of `plano.md`.
- Creates `edicoes/<NNN. nome>/`.

### 2. Watch and transcribe

1. **Frames and overview (`watch` skill):** Claude follows the skill's own instructions. Example:
   `python "<pasta da skill watch>/scripts/watch.py" "<vídeo>" --detail balanced --max-frames 60 --out-dir "<projeto>/frames"`
   It reads all the frames and maps framing, face position, background and light. `watch` also transcribes the video to understand the content: locally (WhisperX, in newer versions of the skill) or with a free Groq key (see [getting started](getting-started.md#4-optional-free-groq-key)). With neither, use `--no-whisper`: the next step already transcribes.
2. **Per-word timing (local and free):**
   `python tools/transcrever.py "<vídeo>" "<projeto>/transcricao"`
   Produces `palavras.json` (start and end of each word) and `transcript.md`.
3. Badly transcribed proper nouns can be fixed in the text ("cloud" → Claude) without touching the timings.
4. With the content understood, the folder gets a descriptive name: `001. meu-video`.

### 3. Plan (approval point)

Claude writes `plano.md` using the [editorial direction](editorial-direction.md):

- reading of the video and your guidance;
- chosen style and intensity;
- scenes from the repertoire that go in (and those left out, with the reason) and the energy curve;
- for videos longer than ~3 min: macro map (blocks and the dominant scene of each);
- table: `# | início–fim | cena | entrada | gatilho (palavra @ tempo) | visual | print usado` (# | start–end | scene | entrance | trigger (word @ time) | visual | print used);
- face zone to preserve, taken from the real frames.

See a real plan in `projetos/000. exemplo/plano.md` (the example ships with the Estúdio's Remotion template).

**Nothing is programmed before you approve the plan.**

### 4. Program the scenes

- The video's code lives in `src/videos/<slug>/` and is registered in `src/Root.tsx` inside a `<Folder>`.
- **Every value of the brand comes from the Projeto's Kit de marca** (`projetos/<projeto>/kit.json`): colors, fonts, type scale, caption style, motion and Formato. Register the composition with `calculateMetadata={calcularMetadadosDoKit}` and the props `{projeto, formato}` from `src/_shared/kit.ts`; the component receives the Kit as its `kit` prop. Build text, captions and entrances with `src/_shared/marca.tsx` (`estiloDaFonte`, `LegendaDoKit`, `useEntradaDoKit`, `useFontesDoKit`). Never write a color, a font or a caption rule in a Vídeo's code. `src/kit/PrevisaoDoKit.tsx` is the worked example.
- **Formato:** `formato: null` renders the Kit's Formato (vertical 9:16 unless she chose otherwise). A 16:9 version exists only when she asks: render the same composition with `formato: "16:9"`.
- Files in `projetos/` are accessed with `staticFile('<NNN. nome>/...')` (the `projetos` folder is Remotion's public folder).
- **Full video:** a single continuous `<Video>` instance with the master; the camera changes size and place by animating the container, never by restarting the video. Dimensions and fps inherited from the master.
- **Split screen:** always use `src/_shared/synchronized-split.tsx`. It guarantees the camera and the panel enter and leave together. `npm run typecheck` blocks hand-made splits.
- Every animation depends on `useCurrentFrame()`. No CSS transitions or animations.
- Timings defined in seconds (coming from `palavras.json`) and converted with the fps.
- `<Sequence premountFor={fps}>` on every scene with defined timing.
- Avoid `TransitionSeries.Transition` on the master timeline: the overlap shortens the video.
- The examples in `src/estilos/` show how each gallery style was built. Use them as a starting point, not a fixed mold.

### 5. Check (approval point)

1. `npm run typecheck`.
2. Stills (frozen frames) at the start, middle and end of each layout change:
   `npx remotion still src/index.ts <Composicao> edicoes/<NNN. nome>/stills/q0450.png --frame=450`
3. Claude reviews: face covered? text legible? black border? print cropped? highlight in place? And shows the main stills for you to approve before the render.
4. You can also watch everything in real time with `npm run studio` (opens in the browser).

### 6. Render and deliver

- **Final MP4:**
  `npx remotion render src/index.ts <Composicao> "edicoes/<NNN. nome>/<nome>-final.mp4" --codec=h264 --crf=17`
- **Transparent overlay:**
  `npx remotion render src/index.ts <Composicao> "edicoes/<NNN. nome>/<nome>-overlay.mov" --image-format=png --pixel-format=yuva444p10le --codec=prores --prores-profile=4444`
- Validation with `ffprobe`: resolution, fps, duration equal to the master's, a single audio track (and alpha channel in the `.mov` files).
- Claude reports the file path, duration, resolution, codecs and timecodes (if they are inserts).
- Deletes only the intermediates it created itself. Your video and your prints are never deleted.

---

## Requests that work well

```text
Edita o projeto 001 no nível 1. Estilo minimal suíço, vídeo completo em MP4.
```

```text
Quero só as inserções do projeto 002: overlays em MOV e telas cheias em MP4.
Os prints estão na pasta, usa a notícia no momento em que eu falo "pesquisa".
```

```text
Faz uma versão vertical (9:16) dos primeiros 45 segundos do projeto 003,
com legenda grande palavra por palavra.
```

```text
Muda a cena 7 do plano: em vez de tela cheia, quero o print com a câmera no canto.
```
