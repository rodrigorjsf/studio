# Editorial direction

> Translated from the upstream studio guide `5-direcao-editorial.md`. Talk to the Criadora in pt-BR; this reference is for you.
>
> Paths and commands here (`src/`, `tools/`, `projetos/`, `guias/`, `npm run …`) describe the upstream repo layout, not this plugin. The Estúdio folder (`projetos/<projeto>/videos/<vídeo>/`, scaffolded with its Remotion template by the `estudio` skill) and the no-admin installer (ticket #4) provide their plugin equivalents. The Criadora never runs these commands herself: you run them, or you tell her in one plain sentence what is missing.

This guide applies to both levels. It is a **repertoire**, not a rulebook: it describes what is possible and how to choose. In each video, the edit plan (`plano.md`) decides what goes in, based on the content and on **the Criadora's instructions for that video**. When she asks for something else, her request wins.

No video needs to use everything. One can be almost only camera with three precise insertions; another can be an entire lesson in split screen. What matters is that every choice serves what is being said.

---

## 1. Sensibility

- **Dynamics with intent.** The rhythm changes with the speech: breathing room with only the camera, dense lesson moments, moments of total immersion in the content. The problem is not having a lot going on, it is having things with no function.
- **Smooth movement, clean finish.** No gratuitous effects, no excessive fast zooms, no element that only decorates.
- **Golden rule:** every insertion is born from a spoken word, at the exact moment that word is said.

## 2. Contract of the recorded video

The video the Criadora places in `video/` arrives **already cut and finalized** (no mistakes, no long pauses). It is treated as `locked-final-cut`:

- do not cut, reorder, speed up, slow down or replace the audio;
- do not overwrite, recompress or delete the original file;
- the edit is **visual composition on top**: framing, text, animations, prints, split screen, B-roll;
- the original audio appears exactly once and stays continuous, including under full-screen scenes;
- the final duration equals the recorded video's duration (tolerance of 1 frame).

Two video files are two independent edits. They only become a sequence if she asks.

## 3. Scene repertoire

The names in `code` are the ones used in the edit plan.

| Scene | What it is | When to use |
|---|---|---|
| `camera` | full camera, clean | hook, opinion, thesis, connection, breathing room |
| `camera-enfase` | camera with a slow push-in or punch-in on a phrase | key phrase, rhetorical question |
| `camera-motion` | full camera with one element on top (chip, number, icon, word) | reinforce a term or a brief data point |
| `camera-espaco` | camera shifted (scale 1.15–1.25) to open space for text | question or phrase in large typography |
| `aula` | split screen: content on the left (~70%), camera on the right (~30%) | concept in steps, flow, list, comparison |
| `demo` | print or interface dominant, camera in a card that changes corner | tutorial, tool demonstration |
| `cena` | full-screen content, no camera | complex flow, a print that needs to be read, climax of the explanation |
| `broll` | full-screen video or illustration, speech continues underneath | metaphor, turning point, opening of a block |
| `transformacao` | an element grows into full screen, or the camera shrinks into a card | changes that carry meaning |

**Camera side.** In split screens and in the card, the default is **content on the left, camera on the right**. Invert only if the face framing, legibility or a request from the Criadora requires it, and record the reason in the plan.

### How to choose each stretch

| What is being said | First option |
|---|---|
| opinion, experience, conclusion | `camera` |
| brief data point or term | `camera-motion` |
| contrast, relationship, flow | `aula` or `cena` |
| step-by-step of software | `demo` |
| list, framework, long lesson | `aula` |
| high-impact abstract concept | `broll` or `cena` |
| news, research, document | `demo` with the print and highlighter |

Useful questions:

- Here, should the attention be **on me**, **on the content** or **split**?
- Is the idea better understood by **seeing a metaphor**, **following a flow** or **looking at the tool**?
- How long ago was the last change? Does a cut or a scene switch renew the attention?
- Does this help understanding or does it only decorate?

## 4. Movement and transitions

**Camera**

- Smooth base: push-in from 1.00 → 1.04 over a stretch, or pull-out from 1.06 → 1.00 when returning from an insertion.
- Emphasis: punch-in up to ~1.12 in 2–3 s.
- Pan limit: `|offset| ≤ width × (scale − 1) / 2`, otherwise a black border appears.

**Layout change** (entering an `aula`, the `demo` card switching corners): **0.9–1.2 s**, smooth curve with no "bounce" (`Easing.inOut(Easing.cubic)` in Remotion, `bezier(0.65, 0, 0.35, 1)` in Higgsedit). Camera and panel move **together**, with the same curve and the same time window. It may start a few frames before the word so it is ready on it, but the content never appears before it is said.

**Transition voices** (mix them so it is not predictable):

- **Hard cut:** change of subject, impact phrase, list rhythm.
- **Short fade (10–14 frames):** between scenes of the same atmosphere, or on an elegant return.
- **Animated transformation:** reserve for changes with meaning.

Never leave an empty or black screen between scenes.

**Elements in a scene:** panels and cards rise with a soft spring; text enters word by word; B-roll and highlights enter with a wipe. In `aula` and `cena`, elements enter **following the explanation**: one step of the flow at a time, the arrow appears when the relationship is spoken, the highlight moves between items as the speech advances.

## 5. Useful translations (speech → visual)

Starting ideas, not obligations:

- **Tool mentioned** → `demo` with the real print the Criadora saved in `prints/`.
- **News or research** → intact print with a slow zoom and a highlighter exactly over the quoted phrase.
- **Process or steps** → `aula` with a flow that assembles step by step.
- **Abstract concept** → metaphorical `broll` or an illustration that transforms.
- **Central number** → counter, bar or comparison.
- **Rhetorical question** → large typography over the shifted camera.
- **Comparison** → `aula` with two sides that reveal themselves.
- **"I already recorded a video about…"** → card with the real thumbnail, slightly rotated.

## 6. Prints and highlighter

Prints are the most valuable raw material of Nível 1: the result is much better when the Criadora **takes a screenshot of what she wants to see animated and saves it straight into `prints/`**.

- The print preserves whole the region that proves the speech: title, phrase, number. An accidental crop fails the frame.
- A deliberate crop is allowed when it improves reading, as long as the evidence stays visible.
- The highlighter is semantic: it covers **exactly** the quoted phrase, enters on the trigger word, and follows the print's zoom (both live in the same container).
- Before the final render, check one frame with the print settled and another with each highlight complete.

## 7. Formats

| Format | Size | Use | Care points |
|---|---|---|---|
| Horizontal 16:9 | 1920×1080 | YouTube, lessons | default; inherits the recorded video's fps |
| Vertical 9:16 | 1080×1920 | Reels, TikTok, Shorts | keep ~250 px free at the top and ~420 px at the bottom (app interface); large caption below the chin; split screen becomes **top / bottom** |
| Square or 4:5 | 1080×1080, 1080×1350 | feed | larger text, fewer elements at a time |

The gallery in [style-gallery.md](style-gallery.md) shows examples of each format.

## 8. Visual identity

Separate three decisions:

1. **Permanent identity:** clarity, sync with the speech, legibility on a phone, human finish, real assets.
2. **The video's dialect:** palette, fonts, texture, iconography, density. Pick a style from the [gallery](style-gallery.md) or bring her own (reference prints in `prints/` work very well). Intensity: `sutil`, `equilibrada` or `dominante`.
3. **Scene direction:** the layout (section 3) and the metaphor used in that stretch.

When several brands appear in the same video, prefer a neutral base with per-brand accents. Do not recreate logos or interfaces without the real asset.

## 9. Fixed care points

They apply to every video, in any style, because they are quality:

1. **Per-word timing.** Every trigger uses the exact start of the word in `palavras.json`.
2. **Face free.** Text and elements do not cover eyes, mouth or the outline of the face. The face position comes from the video's real frames, never from a guess.
3. **Legibility.** All text must be readable on a phone screen.
4. **No text inside AI-generated images.** All text enters in the composition.
5. **Numbers as spoken**, with no on-screen "correction".
6. **Intact prints** (section 6).
