# Nível 2: advanced editing with Higgsfield

> Translated from the upstream studio guide `4-nivel-2-higgsfield.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> Paths and commands here (`src/`, `tools/`, `projetos/`, `guias/`, `npm run …`) describe the upstream repo layout, not this plugin. The Estúdio folder (`projetos/<projeto>/videos/<vídeo>/`, scaffolded with its Remotion template by the `estudio` skill) and the no-admin installer (ticket #4) provide their plugin equivalents. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

In Nível 2, besides assembling the edit, Claude **generates images and videos with AI** on [Higgsfield](https://higgsfield.ai): cinematic B-rolls, animated illustrations, visual metaphors, scene transformations. The final assembly runs on **Higgsedit**, Higgsfield's own editor, inside a cloud environment.

**Cost:** uses **Higgsfield credits** (paid plan). Nothing is generated without the Criadora approving the plan and the estimated cost.
**When it is worth it:** videos where generated images (B-roll, metaphors, realistic scenes) make a difference. If the video is more tutorial and prints, [Nível 1](level-1-remotion.md) solves it for free.

---

## 1. Connect Higgsfield to Claude

Nível 2 uses Higgsfield only through its official connector, with her own Higgsfield login. (The upstream API-key path and its script are not part of this plugin; see the spec decision on Níveis.)

### Sign in with her Higgsfield account

This is the official connector (MCP), at `https://mcp.higgsfield.ai/mcp`. Authentication is done by logging into her account; there is no key to copy.

**In Claude Desktop (or claude.ai):**

1. Open **Settings → Connectors** (in some versions, **Customize → Connectors**).
2. Click **Add custom connector**.
3. Name: `Higgsfield`. URL: `https://mcp.higgsfield.ai/mcp`.
4. Click **Connect** and log into her Higgsfield account in the window that opens.

Shortcut that already opens the form filled in:
[claude.ai/customize/connectors?modal=add-custom-connector…](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Higgsfield&connectorUrl=https%3A%2F%2Fmcp.higgsfield.ai%2Fmcp)

Connectors added to her Claude account also appear in the **Code** sessions of Claude Desktop and in Claude Code in the terminal, as long as she is logged into the same account.

**In Claude Code via the terminal (alternative):**

```bash
claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
```

Then, inside Claude Code, type `/mcp`, select `higgsfield` and authenticate in the browser.

**How to tell it worked:** ask Claude "check my balance on Higgsfield" (in pt-BR: "consulta meu saldo na Higgsfield"). It should answer with her credits.

---

## 2. What she hands over and what she gets

Same as Nível 1: a video **already cut** in `video/`, **prints** in `prints/` (photos of people mentioned, news, logos, thumbnails) and her **guidance**, including a **credit budget** if she wants to cap the spend.

She receives the final MP4 at `edicoes/<NNN. nome>/<nome>_final.mp4`.

---

## 3. The process

### 1. Organize
Same organization as Nível 1: folder `projetos/<NNN. nome>/`, `ffprobe` on the video and `edicoes/<NNN. nome>/`.

### 2. Watch and transcribe
Same process as Nível 1: frames with the `watch` skill into `frames/` and per-word timing with `tools/transcrever.py` into `transcricao/`.

*Pending: the plugin's no-admin installer (ticket #4) replaces this step.*

### 3. Plan (approval point)
The `plano.md` follows the [editorial direction](editorial-direction.md) and adds:

- a list of assets to generate, with model and **estimated cost in credits**;
- a redo margin;
- total cost.

See a complete real plan in projetos/000. exemplo/plano.md (the example ships with the Estúdio's Remotion template).

**No credit is spent before her approval.** If the spend goes past ~20% of the estimate, Claude stops and warns her.

### 4. Generate the assets
- Check the balance (`balance`) before starting.
- Images first, in batch (`generate_image_batch`). Build a review board and redo whatever is not legible.
- Then animate (`generate_video_batch`, `jobs_wait`, `show_generation_by_ids`) and approve using the middle frame and the last frame.
- Download the results into `hf/` with descriptive names (`03_broll_ampulheta.mp4`).
- **Generated images and videos carry no text.** All text goes in at assembly.

### 5. Assemble in Higgsedit
The assembly runs in Higgsfield's sandbox (`sandbox_exec`) with `higgsedit`.

1. Before writing the assembly script, Claude loads `get_workflow_instructions {workflow: "video-editing"}` and the workflow references (`compose.md`, `clip-geometry.md`, `animation-contract.md`, `shot-blueprints.md`, `failure-modes.md`).
2. The video and prints go up with `media_upload` → file upload → `media_confirm`. Generated assets already have a URL.
3. The script is saved at `projetos/<NNN. nome>/edit.jsx`. Each `sandbox_exec` downloads the files, runs `higgsedit build` and produces the output **in the same call** (the sandbox is discarded seconds later). If the script is too large for the command, it goes up with `media_upload` and is downloaded in the sandbox.
4. Structure: the recorded video goes at the base with `p.cut` (continuous image and audio). Framing, B-roll, text and title cards go on top with `p.compose`. The triggers are the exact seconds from `palavras.json`.
5. Google Fonts fonts are downloaded in the sandbox and registered with `higgsedit fonts add`.
6. Check before rendering with `higgsedit sheet` at the start, middle and end of each layout change: covered face, legibility, black border on zoom, sync.
7. Render in the background (`background: true`) with monitoring. If it exceeds the sandbox's 15-minute limit, render in blocks (`--range`) and join with ffmpeg.
8. Download the result to `edicoes/<NNN. nome>/<nome>_final.mp4`.

If Higgsedit cannot handle something, Claude says so and proposes an alternative (ffmpeg in the sandbox, or assembling that part in Remotion).

### 6. Validate and deliver
- `ffprobe`: resolution, fps, duration equal to the recorded video's, one audio track.
- `ffmpeg -af volumedetect` on the final and on the original: equal volumes.
- File path, duration, resolution, codecs and **credits spent**.

## 4. Reference models and costs

| Use | Model | Approx. cost | Note |
|---|---|---|---|
| 16:9 or 9:16 illustration | `nano_banana_pro`, 2k | 2 cr | batches of up to 12 with `generate_image_batch` |
| Isolated object | `nano_banana_pro`, 1:1 | 2 cr | then remove the background |
| Variation of the same scene | `nano_banana_pro` + `image_references` = generation id | 2 cr | e.g. full desk → empty desk |
| Remove background | `image_background_remover` | — | **requires `prompt`** ("remove background, keep only the X") |
| Standard image → video | `kling3_0`, mode `pro`, sound `off` | ~1.75 cr/s | `start_image`; accepts `end_image` for transformation |
| "Hero" image → video | `seedance_2_0`, 1080p, `generate_audio: false` | ~9 cr/s | main scenes |
| Realistic scene | `veo3_1`, `veo-3-1-fast`, quality `high`, 8 s | 22 cr | text → video, no identifiable people |

- Costs change. Claude confirms with `models_explore` when the model or the parameter changes, and uses `models_explore(action: "recommend")` when in doubt about which model to use.
- If a batch comes back with `submission_failed` suggesting a preset, resubmit with `declined_preset_id` equal to the suggested id.
- Diagrams, flows, chips and texts are built at assembly (0 credits). Higgsfield generates illustrations, objects and B-rolls.

## 5. Styles and base prompts

The gallery in [style-gallery.md](style-gallery.md) shows three styles made in Nível 2: **paper cut-out** (B-roll), **cream paper in a lesson** and **dark cinematic**. They are templates, not an obligation: she can describe the style she wants or bring reference images in `prints/`.

### Paper cut-out (preset from the original project)

Color tokens: paper `#F0EEE6`, light paper `#FAF9F5`, ink `#141413`, soft ink `#3D3929`, gray `#6B675C`, border `#E3DED2`, terracotta `#D97757`, dark terracotta `#B5532F`, sage `#788C5D`, red `#C0453A`.
Typography (Google Fonts): **Newsreader** (titles and numbers), **Inter** (interface, chips; minimum 18 px), **JetBrains Mono** (terminal, counters).

Style suffix:

```
Handcrafted layered paper-cut illustration, elegant and minimal, photographed cut paper diorama
with real paper grain and soft realistic shadows between layers, warm cream and ivory paper
(#F0EEE6, #E8E4D8), terracotta orange accents (#D97757), charcoal ink details (#2B2A27), small
touches of muted sage green and dusty blue paper, soft diffused top light, calm editorial didactic
mood, generous negative space. Absolutely no text, no letters, no numbers, no logos, no watermark.
```

Scene examples (before the suffix):

- **Background:** `Seamless empty background made of layered warm cream paper sheets with subtle torn deckled edges peeking at the corners, very subtle paper fiber texture, soft vignette, mostly flat and clean in the center for text overlay.`
- **Concept → object:** `A paper-cut conveyor belt running left to right: crumpled messy paper tasks enter a small elegant paper machine with gears and exit as neat stacked cards with terracotta check marks.`
- **Top-down metaphor:** `Top-down overhead view of a paper-cut light wooden desk with neatly arranged documents, note cards with abstract squiggle lines, a small round terracotta kitchen timer, a coffee cup.`
- **Isolated object:** `A single small round paper-cut kitchen timer, isolated and centered on a plain flat cream background, front view.`
- **Edit of the same scene:** `Edit this exact paper-cut desk scene, same overhead camera, same lighting, same style: remove all documents. Keep only the timer and the coffee cup exactly where they are.`

Animation suffix (image → video):

```
[specific, slow action]. Slow gentle camera push-in. Handmade paper stop-motion feel, keep the
exact paper-cut style, colors and soft lighting, no new objects, no text.
```

Transformation with `start_image` + `end_image`: `The documents lift off the desk one by one and fly away out of frame like paper leaves in a gentle breeze, leaving the desk clean; the timer and the cup stay in place. Static overhead camera.`

### Dark cinematic (realistic B-roll)

```
Cinematic macro shot of [object] on a dark wooden desk, [slow action], very slow push-in dolly,
warm moody tungsten lamp light, dark bookshelf softly out of focus, shallow depth of field,
calm and premium, realistic, no people / no faces, no text.
```

Adjust the light and the setting to match **her** studio: the B-roll should look like part of the same world as her camera.

### Vertical format
Generate the images directly in 9:16 (do not crop from 16:9). Keep the main subject in the central third, away from the top and the bottom, where the apps' interface sits.

## 6. Checklist

- [ ] frames read, face and background mapped
- [ ] `palavras.json` generated and checked
- [ ] her guidance reflected in the plan
- [ ] estimated cost approved before generating
- [ ] illustrations without text, approved on a board; animations approved by the middle and last frame
- [ ] every layout change checked (face, legibility, border, sync)
- [ ] final render validated (resolution, fps, duration, volume)
