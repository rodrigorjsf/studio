# Getting started

> Translated from the upstream studio guide `1-primeiros-passos.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> Paths and commands here (`src/`, `tools/`, `projetos/`, `guias/`, `npm run …`) describe the upstream repo layout, not this plugin. The Estúdio folder and its Remotion template (ticket #3) and the no-admin installer (ticket #4) provide their plugin equivalents. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

This tutorial takes you from zero to the first edit. It takes about 20 minutes, most of it waiting on installs.

---

## 1. What you need

| Item | What for | Required? |
|---|---|---|
| **Claude** with Claude Code access (Pro or Max plan) | it is your video director | yes |
| **Node.js** (LTS version) | runs Remotion | yes |
| **Python** 3.10 or newer | transcription and the `watch` skill | yes |
| **FFmpeg** | reads and converts video | yes |
| **Git** | download and update this repository | recommended |
| **Higgsfield** account with credits | Nível 2 only | no |

You can use Claude in three ways. All of them work with this repository:

- **Claude Desktop, Code tab** (simplest, no terminal);
- **Claude Code in VS Code** (extension);
- **Claude Code in the terminal** (`claude` command).

> The `watch` skill **does not work in Cowork or in the regular Claude chat**. Always use a **Code** session.

## 2. Install the programs

*Pending: the plugin's no-admin installer (ticket #4) replaces this step.*

### Windows

Open **PowerShell** and run these, one at a time:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id Python.Python.3.12 --exact
winget install --id Gyan.FFmpeg --exact
winget install --id yt-dlp.yt-dlp --exact
winget install --id Git.Git --exact
```

Close and reopen PowerShell, then check:

```powershell
node --version
python --version
ffmpeg -version
```

### macOS

Install [Homebrew](https://brew.sh) and run:

```bash
brew install node python ffmpeg yt-dlp git
```

## 3. Download the Studio and install everything

*Pending: the plugin's no-admin installer (ticket #4) replaces this step.*

### Easy way: ask Claude

Open a **Code** session in Claude and paste:

```text
Instala o repositório https://github.com/mackswendhell/studio na pasta C:\dev (siga a seção "Instalação" do README).
```

It clones, installs the dependencies and the two free skills (**remotion-best-practices** and **watch**). When it finishes, **open a new Claude session** inside the `studio` folder: new skills only show up in a new session.

### Manual way

Pick a folder **outside** OneDrive, iCloud or Dropbox (syncing interferes with rendering). For example, `C:\dev` on Windows or `~/dev` on Mac.

```bash
cd C:\dev
git clone https://github.com/mackswendhell/studio.git
cd studio
npm run instalar
```

`npm run instalar` does everything at once: Remotion dependencies, local transcription (`faster-whisper`), the `remotion-best-practices` skill (inside the project) and the `watch` skill. At the end it prints a summary of what worked and what failed.

No Git? Download the ZIP from the green **Code → Download ZIP** button on GitHub, unzip it and run `npm run instalar` inside the folder.

Test Remotion:

```bash
npm run studio
```

It opens a browser page with the gallery examples. If you see the compositions under `Estilos` and can press play, everything is fine. Close it with `Ctrl+C` in the terminal.

## 4. About the free skills

Skills are knowledge packages that Claude loads when it needs them. `npm run instalar` already installs both:

- **`watch`**: watches videos, extracts frames and transcribes ([bradautomates/claude-video](https://github.com/bradautomates/claude-video));
- **`remotion-best-practices`**: Remotion best practices ([remotion-dev/skills](https://github.com/remotion-dev/skills)).

Using only Claude Desktop, without the `claude` terminal command? `watch` is declared in the project (`.claude/settings.json`), so Claude offers to install it when you open the folder: accept. If it does not show up, install it by hand at **Personalizar → Plugins → Adicionar → Adicionar marketplace → Adicionar de um repositório** (Customize → Plugins → Add → Add marketplace → Add from a repository), paste `https://github.com/bradautomates/claude-video`, click **Sincronizar** (Sync) and install **Watch**.

## 5. (Optional) Free Groq key

`watch` can use Groq to transcribe quickly. It is free within a generous limit.

1. Create the key at [console.groq.com/keys](https://console.groq.com/keys).
2. Save it as an environment variable:
   - Windows: `[Environment]::SetEnvironmentVariable("GROQ_API_KEY", "sua-chave", "User")`
   - Mac: add `export GROQ_API_KEY="sua-chave"` to `~/.zshrc`.
3. Reopen Claude.

Without this key everything works the same: `tools/transcrever.py` transcribes locally, for free.

## 6. (Nível 2 only) Connect Higgsfield

Follow the section [Connect Higgsfield to Claude](level-2-higgsfield.md#1-connect-higgsfield-to-claude). Summary: in Claude Desktop, **Configurações → Conectores → Adicionar conector personalizado** (Settings → Connectors → Add custom connector), URL `https://mcp.higgsfield.ai/mcp`, and log in to your account.

---

## 7. Understanding the folders

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
│     ├─ frames/       (generated) frames Claude "watched"
│     ├─ transcricao/  (generated) text with the timing of each word
│     ├─ hf/           (Nível 2) images and videos generated on Higgsfield
│     ├─ plano.md      (generated) the edit plan you approve
│     └─ edit.jsx      (Nível 2) assembly script for Higgsedit
│
├─ edicoes/            ← the finished video COMES OUT HERE
│  └─ 001. meu-video/
│
├─ src/                Remotion code (Nível 1)
│  ├─ Root.tsx         list of registered videos
│  ├─ videos/          one subfolder per video of yours
│  ├─ estilos/         code of the gallery examples
│  └─ _shared/         reused pieces
├─ tools/              local transcription and the Higgsfield Cloud API generator
└─ scripts/            automatic checks
```

Rule of thumb: **you only touch `projetos/`** (to hand in material) **and `edicoes/`** (to pick up the result). The rest is Claude's work.

The whole `projetos/` folder is kept out of Git (`.gitignore`), except for the example. That way your videos and prints do not end up on GitHub by accident if you publish a fork.

## 8. Your first edit

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

## 9. Quick glossary

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
