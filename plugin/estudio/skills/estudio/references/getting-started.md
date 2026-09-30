# Getting started

> Translated from the upstream studio guide `1-primeiros-passos.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> Paths and commands here (`src/`, `tools/`, `projetos/`, `guias/`, `npm run …`) describe the upstream repo layout, not this plugin. The Estúdio folder (`projetos/<projeto>/videos/<vídeo>/`, scaffolded with its Remotion template by the `estudio` skill) and the no-admin installer (section 2 below) provide their plugin equivalents. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

This tutorial takes you from zero to the first edit. It takes about 20 minutes, most of it waiting on installs.

---

## 1. What you need

| Item | What for | Required? |
|---|---|---|
| **Claude** with Claude Code access (Pro or Max plan) | it is your video director | yes |
| **Node.js** (LTS version) | runs Remotion | yes |
| **Python** 3.10 or newer | transcription and the frame sampler | yes |
| **FFmpeg** | reads and converts video | yes |
| **Git** | download and update this repository | recommended |
| **Higgsfield** account with credits | Nível 2 only | no |

You can use Claude in three ways. All of them work with this repository:

- **Claude Desktop, Code tab** (simplest, no terminal);
- **Claude Code in VS Code** (extension);
- **Claude Code in the terminal** (`claude` command).

> The studio **does not work in Cowork or in the regular Claude chat**: it runs programs on her computer. Always use a **Code** session.

## 2. Prepare the computer (the plugin's installer)

The plugin replaces the upstream install ritual (package managers, cloning, `npm run instalar`) with its own no-admin installer. The `estudio` skill runs it only after the Criadora answers "sim" to one question, "Posso preparar seu computador para editar vídeos? (~10 min, grátis)"; see *The preparation question* in the skill.

| What | Where it goes | Size (download) |
|---|---|---|
| Portable Node (official build, pinned version) | plugin data folder, `runtime/node/` | ~30–50 MB |
| Static ffmpeg + ffprobe | plugin data folder, `runtime/ffmpeg/` | ~30–200 MB, by system |
| Python through `uv`, with faster-whisper in its own environment | plugin data folder, `runtime/uv/`, `runtime/uv-python/`, `runtime/python/` | ~150 MB |
| Remotion dependencies (`npm install` of the Estúdio's `package.json`) | the Estúdio folder, `node_modules/` | ~250 MB |

- Nothing needs an admin password or opens a system window: every file lands in a folder she owns, and download caches stay in the plugin data folder too.
- Claude Code deletes the plugin data folder when the plugin is uninstalled, so the runtimes leave with it. `node_modules/` is part of her Estúdio folder, like her videos, and stays.
- Every step is safe to repeat: a program that already works — the studio's own or one already on the computer — is not downloaded again.
- The programs the studio downloads are **not** on the computer's PATH. Run them by the full path the computer check prints (`tools.node`, `tools.ffmpeg`, `tools.ffprobe`, `tools.python`).
- Nothing else is installed: no other plugin, marketplace or skill. What the upstream setup took from two external skills now ships inside the plugin (section 3).

## 3. What ships inside the plugin

Upstream, `npm run instalar` also installed two third-party skills, one to watch videos and one with Remotion best practices. The plugin carries what the studio needs from them instead, so the Criadora installs only `estudio`:

- **The frame sampler** (`scripts/frames/amostrar.py`): samples frames of her video in two modes, an overview and a face-zone pass over the whole clip. It needs only the Python and ffmpeg from section 2, runs locally, sends nothing anywhere and asks for no key. How to use it: [watching a video](watching-a-video.md).
- **The Remotion rules** ([references/remotion/](remotion/index.md)): short rulebooks per topic, written for the Remotion version the Estúdio template pins.
- **Transcription** stays local and free with faster-whisper (section 2); no cloud transcription service or API key is used.

Where each piece comes from, with its license, is in the plugin's `THIRD_PARTY.md`.

## 4. (Nível 2 only) Connect Higgsfield

Follow the section [Connect Higgsfield to Claude](level-2-higgsfield.md#1-connect-higgsfield-to-claude). Summary: in Claude Desktop, **Configurações → Conectores → Adicionar conector personalizado** (Settings → Connectors → Add custom connector), URL `https://mcp.higgsfield.ai/mcp`, and log in to your account.

---

## 5. Understanding the folders

```text
studio/
├─ CLAUDE.md           the "director": instructions Claude reads when opening the project
├─ README.md           overview
├─ guias/              the manuals (you are here)
├─ estilos/            gallery of reference styles, with images
│
├─ projetos/           ← YOU PUT the video and the prints HERE
│  └─ 001. meu-video/
│     ├─ video/        the recorded video, already cut (never altered)
│     ├─ prints/       screenshots and images of what you want animated
│     ├─ frames/       (generated) frames sampled from the video
│     ├─ transcricao/  (generated) text with the timing of each word
│     ├─ gerados/      (Nível 2) images and clips generated on Higgsfield
│     └─ plano.md      (generated) the edit plan you approve
│
├─ edicoes/            ← the finished video COMES OUT HERE
│  └─ 001. meu-video/
│
├─ src/                Remotion code (Nível 1)
│  ├─ Root.tsx         list of registered videos
│  ├─ videos/          one subfolder per video of yours
│  ├─ estilos/         code of the gallery examples
│  └─ _shared/         reused pieces
├─ tools/              local transcription
└─ scripts/            automatic checks
```

Rule of thumb: **you only touch `projetos/`** (to hand in material) **and `edicoes/`** (to pick up the result). The rest is Claude's work.

The whole `projetos/` folder is kept out of Git (`.gitignore`), except for the example. That way your videos and prints do not end up on GitHub by accident if you publish a fork.

## 6. Your first edit

1. Create the folder `projetos/001. meu-video/video/` and put your video there (MP4 or MOV, already cut).
2. Create `projetos/001. meu-video/prints/` and save screenshots of everything you mention in the video: websites, news, tool screens.
3. Open the `studio` folder in Claude (Desktop → Code → choose folder; or `claude` in the terminal inside it).
4. Claude will ask whether you want **Nível 1** or **Nível 2**. Answer.
5. Say what you want. Example:
   ```text
   Edita o projeto 001. Quero o vídeo completo, estilo minimal suíço, sem exagero de zoom.
   ```
6. Approve (or adjust) the edit plan it presents.
7. Check the review frames it shows.
8. Pick up the video in `edicoes/001. meu-video/`.

Do not know what to ask for? Ask Claude itself: "o que dá para fazer com esse vídeo?" (what can be done with this video?). It was instructed to suggest options.

## 7. Quick glossary

| Term | Meaning |
|---|---|
| **Master** | your recorded, cut video, the basis of everything |
| **Inserção** (insert) | any element that goes on top of, or in place of, the camera |
| **Overlay** | an insert with a transparent background, sitting on top of the video |
| **B-roll** | supporting full-screen images while you keep talking |
| **Split / tela dividida** | content on one side, camera on the other |
| **PiP** (picture-in-picture) | small camera in a corner |
| **Push-in / punch-in** | slow zoom / quick zoom on the camera |
| **Gatilho** (trigger) | the spoken word that makes an insert appear |
| **Render** | generating the final video file |
| **Still** | a frozen frame exported as an image, used for review |
| **MCP** | the "cable" that connects Claude to an external service, such as Higgsfield |
| **Skill** | a package of instructions that teaches Claude to do a task |
