# Nível 2: advanced editing with Higgsfield

> Translated from the upstream studio guide `4-nivel-2-higgsfield.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> The Estúdio folder (`projetos/<projeto>/videos/<vídeo>/`, scaffolded with its Remotion template by the `estudio` skill) holds everything a Vídeo needs; the Criadora never runs commands herself: you run them, or you tell her in one plain sentence what is missing.

In Nível 2, besides everything Nível 1 does, the studio **generates images and clips with AI** on [Higgsfield](https://higgsfield.ai): cinematic B-rolls, animated illustrations, visual metaphors, scene transformations. **The edit is still assembled in Remotion**, on her computer, exactly as in [Nível 1](level-1-remotion.md): Higgsfield is only a source of images and clips. One montage engine means one set of rules and one internal review for every Vídeo.

**Cost:** uses **Higgsfield credits** from her own account (paid plan). Nothing is generated before she approves the Plano and its cost in credits, whatever her Autonomia.
**When it is worth it:** videos where generated imagery (B-roll, metaphors, realistic scenes) makes a difference. If the video is more tutorial and Prints, Nível 1 solves it for free.

---

## 1. Connect Higgsfield to Claude

Nível 2 uses Higgsfield only through its official connector, logged in with her own Higgsfield account. There is no key to copy, set or store: never ask her for one, and never write one to a file or show one in the conversation.

### Sign in with her Higgsfield account

This is the official connector (MCP), at `https://mcp.higgsfield.ai/mcp`. Authentication is done by logging into her account.

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

**How to tell it worked:** call its `balance` tool (she can ask "consulta meu saldo na Higgsfield"). It answers with her credits.

---

## 2. What she hands over and what she gets

Same as Nível 1: her recording as a new Vídeo, **Prints** in the Vídeo's `prints/` folder, and her guidance. The Kit de marca's **Orçamento de créditos** (`creditos.porVideo`, `creditos.porMes`) caps what any Vídeo of the Projeto may be approved for.

She receives the final MP4 in the Vídeo's `entrega/` folder, as in Nível 1. The generated images and clips stay in the Vídeo's `gerados/` folder, with `gerados.json` listing each one: its file, model, cost and prompt.

---

## 3. The process

Everything of Nível 1 applies ([novo-video](../../novo-video/SKILL.md), [plano](../../plano/SKILL.md), [edicao](../../edicao/SKILL.md)); Nível 2 adds three things.

### The Plano states the credits
The Roteirista-estrategista writes `creditosEstimados` in the Plano: the sum of what each generated image and clip should cost (section 4), plus a redo margin. Each scene that needs generated imagery says so in its `visual`.

### The credit Gate (approval point)
At the Plano's Gate the Diretor reads her **balance** (`balance`) and shows it next to the credits the Plano expects. Her approval of the cost is recorded, with the balance just read, by:

```bash
"<node>" "${CLAUDE_PLUGIN_ROOT}/scripts/estudio.mjs" aprovar-creditos "." "<projeto>" "<nome do vídeo>" '{"saldo": <balance>}'
```

It refuses, changing nothing: `insufficient-balance` (her balance does not cover the estimate), `over-budget` (over the Kit's budget per Vídeo, or per month counting the Projeto's other Vídeos approved this month), `plano-not-approved`, `not-nivel-2`. Autonomia never approves credits for her.

### The images and clips are generated
The **Artista generativo** (the `artista-generativo` agent) generates them before the Motion designer builds. Before paying for each one it reads her balance and clears it with `gastar-creditos` (the file, the quoted cost, the balance, the model and the prompt):

- the prompt must forbid text in the image (`no text` or `sem texto`): **generated images and clips carry no text**; every word is drawn at the montage;
- her balance must cover it;
- the credits spent must stay within the approved estimate plus **~20%** (`limite`). The generation that would pass it is refused (`over-limit`): **the work stops**, the Vídeo waits for her (`estado` shows it), and nothing more is generated until she approves a new estimate, never below what was already spent (`aprovar-creditos` with `"creditosEstimados"`).

Images first, in batch, then animate them into clips (sound off). The results are downloaded into the Vídeo's `gerados/` folder. The Motion designer shows them in the edit with `<Gerado>` from the template's `src/_shared/edicao.tsx` (a clip is always muted: her original audio stays the only sound).

### Higgsedit, only on request
Higgsedit, Higgsfield's own cloud editor, is **not** used to assemble the edit. When she explicitly asks for an effect only Higgsedit has, it is a scope change with its own cost approval before anything runs.

*Pending: Higgsedit on request arrives in ticket #16.*

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
- [ ] her guidance reflected in the Plano, with `creditosEstimados`
- [ ] her balance read and the cost approved (`aprovar-creditos`) before generating
- [ ] every generation cleared by `gastar-creditos`; stopped at `over-limit`
- [ ] images and clips without text, saved in `gerados/`, redone when not legible
- [ ] the edit assembled in Remotion with `<Gerado>`, then reviewed and delivered as in Nível 1
