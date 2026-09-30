# Getting started

> Translated from the upstream studio guide `1-primeiros-passos.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> Paths are relative to her Estúdio folder: the `estudio` skill scaffolds the Remotion template there (`package.json`, `src/`, `remotion.config.ts`), and each Vídeo lives in `projetos/<projeto>/videos/<vídeo>/`. Run `npm` and `npx` with the Node the computer check prints (`tools.node`), from the Estúdio folder. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

This tutorial takes you from zero to the first edit. It takes about 20 minutes, most of it waiting on installs.

---

## 1. What you need

| Item | What for | Required? |
|---|---|---|
| **Claude** with Claude Code access (Pro or Max plan) | it is your video director | yes |
| **Node.js** (LTS version) | runs Remotion | yes |
| **Python** 3.10 or newer | transcription and the frame sampler | yes |
| **FFmpeg** | reads and converts video | yes |
| **Higgsfield** account with credits | Nível 2 only | no |

You can use Claude in three ways. All of them run the plugin:

- **Claude Desktop, Code tab** (simplest, no terminal);
- **Claude Code in VS Code** (extension);
- **Claude Code in the terminal** (`claude` command).

> The studio **does not work in Cowork or in the regular Claude chat**: it runs programs on her computer. Always use a **Code** session.

## 2. Prepare the computer (the plugin's installer)

She installs the plugin from the `studio` marketplace; she never clones a repository, opens a terminal or uses a package manager. The programs and the speech model it needs come from its own no-admin installer, the **Preparação**. The `estudio` skill runs it only after the Criadora answers "sim" to one question, "Posso preparar seu computador para editar vídeos? (~2 GB, ~15 min, grátis)"; see *The preparation question* in the skill. **Every download the studio needs happens here, once.** Nothing is downloaded in the middle of an edit, and transcribing a video afterwards needs no internet.

| What | Where it goes | Size (download) |
|---|---|---|
| Portable Node (official build, pinned version) | plugin data folder, `runtime/node/` | ~30–50 MB |
| Static ffmpeg + ffprobe | plugin data folder, `runtime/ffmpeg/` | ~30–200 MB, by system |
| Python through `uv`, with faster-whisper in its own environment | plugin data folder, `runtime/uv/`, `runtime/uv-python/`, `runtime/python/` | ~150 MB |
| The speech model (`large-v3-turbo`, five files, each checked against its sha256) | plugin data folder, `modelos/large-v3-turbo/` | ~1.6 GB |
| Remotion dependencies (`npm install` of the Estúdio's `package.json`) | the Estúdio folder, `node_modules/` | ~250 MB |

About **2 GB in all**, the figure the preparation question states. The model comes from a GitHub Release of the plugin's own repository (see *the speech model* below), so no other website is involved.

- Nothing needs an admin password or opens a system window: every file lands in a folder she owns, and download caches stay in the plugin data folder too.
- Claude Code deletes the plugin data folder when the plugin is uninstalled, so the runtimes leave with it. `node_modules/` is part of her Estúdio folder, like her videos, and stays.
- Every step is safe to repeat: a program that already works — the studio's own or one already on the computer — is not downloaded again.
- The programs the studio downloads are **not** on the computer's PATH. Run them by the full path the computer check prints (`tools.node`, `tools.ffmpeg`, `tools.ffprobe`, `tools.python`).
- **The speech model.** `instalar.sh modelo` (Windows: `instalar.ps1 -Passo modelo`) reads the file list from the plugin's `vendor.json` (source `speech-model`), downloads each file, checks its sha256, and deletes and reports any file that fails. A file that is already there and verified is skipped, so a re-run downloads nothing and an interrupted run resumes with the missing files. The computer check reports `speech-model` in `missing` when any file is absent; it never downloads.
- **If the model is missing when a transcription starts,** `transcrever.py` stops with exit 3 and writes nothing: it never downloads. Offer the Preparação again (it fetches only what is missing).
- Nothing else is installed: no other plugin, marketplace or skill. What the studio needs from third-party skills ships inside the plugin (section 3).

### If a Preparação download is blocked

Some Criadoras run the studio in Claude's cloud workspace, where the domains a session may reach are an account setting, so a Preparação download can fail because the workspace does not let the session reach that address. On her own computer nothing is blocked.

**Give this guidance only after a Preparação download has failed** (a step of `instalar.sh` or `instalar.ps1` ends with "Não consegui baixar…" and the internet itself works), **never up front**: on her own Mac or PC she must not read instructions she does not need, and do not describe the setting while the Preparação is running fine.

When it fails, tell her in plain pt-BR, in **one message with the whole list** (so she does not come back three times):

1. Open Claude (claude.ai or the app) → **Settings → Capabilities** (pt-BR screen: **Configurações → Recursos**).
2. Find the network access section, the one about the domains Claude may reach ("Acesso à rede" / allowed domains).
3. Add every host in the plugin's `hosts.json` (`${CLAUDE_PLUGIN_ROOT}/hosts.json`, the `hosts` list; each entry says in English what it is for, say it in a few plain pt-BR words). Do not shorten the list to the host that failed: the next step would need another one.
4. Come back and say "tenta de novo". Run the failed step again: what was already downloaded and verified is kept.

**On a Team or Enterprise plan only an admin can change this list**, in **Admin settings → Capabilities**. Tell her she cannot see the setting herself, and give her the message to send: the admin adds the hosts from the list, in the same place. Then wait; do not try workarounds.

The list has no Hugging Face host: the speech model comes from this repository's own GitHub Release (see *the speech model* above), so transcribing never needs one. If a session asks her to allow a Hugging Face address, something in the plugin is wrong; do not ask her to add it.

## 3. What ships inside the plugin

The plugin carries what the studio needs from two third-party skills, one to watch videos and one with Remotion best practices, so the Criadora installs only `estudio`:

- **The frame sampler** (`scripts/frames/amostrar.py`): samples frames of her video in two modes, an overview and a face-zone pass over the whole clip. It needs only the Python and ffmpeg from section 2, runs locally, sends nothing anywhere and asks for no key. How to use it: [watching a video](watching-a-video.md).
- **The Remotion rules** ([references/remotion/](remotion/index.md)): short rulebooks per topic, written for the Remotion version the Estúdio template pins.
- **Transcription** stays local and free with faster-whisper and the speech model from section 2; no cloud transcription service or API key is used, and no network is needed once the Preparação is done.

Where each piece comes from, with its license, is in the plugin's `THIRD_PARTY.md`.

## 4. (Nível 2 only) Connect Higgsfield

Follow the section [Connect Higgsfield to Claude](level-2-higgsfield.md#1-connect-higgsfield-to-claude). Summary: in Claude Desktop, **Configurações → Conectores → Adicionar conector personalizado** (Settings → Connectors → Add custom connector), URL `https://mcp.higgsfield.ai/mcp`, and log in to your account.

---

## 5. Understanding the folders

Her Estúdio is any folder she chooses and opens in the Code tab. The `estudio` skill sets it up on first run; everything of hers lives there, never inside the plugin (the plugin's own folder is replaced on every update).

```text
<her Estúdio>/
├─ estudio.json        the marker: "this folder is an Estúdio"
├─ perfil.md           her Perfil (who she is, her Autonomia)
├─ projetos/
│  └─ <projeto>/       one per domain (her company, her personal account…)
│     ├─ projeto.md    the Projeto briefing
│     ├─ kit.json      the Kit de marca (colors, fonts, captions, Formato…)
│     ├─ kit/          the Kit's logos, fonts and reference images
│     └─ videos/
│        └─ <vídeo>/
│           ├─ video.md      the Vídeo document: Status, Rodada, Nível, metrics
│           ├─ original/     her recording, never altered
│           ├─ prints/       screenshots of what she wants animated
│           ├─ transcricao/  (generated) text with the timing of each word
│           ├─ frames/       (generated) frames sampled from the video
│           ├─ plano.json    (generated) the edit plan she approves
│           ├─ revisao/      (generated) the stills of each version she reviews
│           ├─ gerados/      (Nível 2) images and clips generated on Higgsfield
│           └─ entrega/      ← the finished video COMES OUT HERE
├─ src/                the Remotion template: the code of each Vídeo's edit
└─ package.json, remotion.config.ts, node_modules/   what Remotion needs
```

Rule of thumb: **she only touches `prints/`** (to hand in material) **and `entrega/`** (to pick up the result). The rest is the studio's work.

## 6. Her first edit

1. She opens her Estúdio folder in Claude (Desktop → **Code** → choose folder) and types `/estudio:estudio`.
2. The Diretor offers to prepare her computer and to set up the folder, then interviews her once about herself (Perfil) and once per domain (Projeto), and she approves the Kit de marca.
3. For each new Vídeo she hands in the recording and answers only what the Kit does not already answer (`/estudio:novo-video`).
4. She approves (or adjusts) the edit plan and the Quadros de estilo.
5. She checks the review stills of each version and decides.
6. She picks up the video in the Vídeo's `entrega/` folder; the Diretor opens it for her.

Does she not know what to ask for? She can ask the Diretor itself: "o que dá para fazer com esse vídeo?" (what can be done with this video?). It was instructed to suggest options.

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
