# Remotion manual for people who have never edited video

> Translated from the upstream studio guide `3-manual-remotion.md`. Talk to the Criadora in pt-BR; this reference is for you.

This manual explains Remotion without requiring you to know how to program. The idea is for you to understand **what can be requested** and **what Claude is doing** when it edits your video in Nível 1.

---

## 1. The idea in one sentence

Remotion makes video **as if it were a web page**. Each frame of the video is a "page" drawn by the computer, and Remotion takes a picture of each one and stitches everything into an MP4.

Think of a flipbook, the little pad you flip through quickly so the drawing seems to move:

- each **sheet** is a **frame**;
- flipping **30 sheets per second** gives smooth motion: that is the **fps** (frames per second);
- a 10-second video at 30 fps has **300 frames**.

In Remotion, instead of drawing 300 sheets by hand, Claude writes a **rule**: "at frame 0 the title is invisible, at frame 15 it is fully visible". Remotion calculates all the sheets in between on its own.

## 2. The main pieces

| Piece | What it is | Analogy |
|---|---|---|
| **Composition** | a video with a defined size, fps and duration | the project's "blank sheet" |
| **Frame** | a still image of the video | one sheet of the flipbook |
| **fps** | how many frames per second | the speed of flipping |
| **Layers** | stacked elements (video at the bottom, text on top) | overlapping transparencies |
| **Sequence** | a stretch that appears only between two moments | a scene that enters and leaves the timeline |
| **Interpolation** | going from one value to another over time (opacity 0 → 1, position 100 → 0) | a light dimmer turned slowly |
| **Easing (curve)** | the "feel" of the movement: start slow, speed up, brake | a car pulling away from a traffic light and stopping at the next one |
| **Spring** | movement with slight elasticity, like something settling | a drawer that closes softly |
| **Public folder** | where your videos and prints live (`projetos/`) | the studio's storeroom |
| **Render** | turning everything into a final video file | developing the film |
| **Still** | exporting a single frame as an image | taking a photo of a moment |

## 3. Remotion Studio (the preview screen)

Run in the terminal, inside the project folder:

```bash
npm run studio
```

It opens a page in the browser with:

- **on the left**, the list of compositions. Under `Estilos` are the examples that ship with this repository; your videos appear below;
- **in the center**, the player. Play, pause and drag to any point;
- **at the bottom**, the timeline with the `Sequence`s, which shows when each scene enters and leaves;
- **on the right**, the properties and the **Render** button.

You can leave Studio open while you talk to Claude: when it changes the code, the preview updates by itself.

## 4. What you can ask for

Everything below is possible in Nível 1, at no cost. The Criadora asks in her own words.

### Text and typography
- Titles that come in word by word, letter by letter, with blur or rising up.
- Large Reels/TikTok-style captions with the spoken word highlighted.
- Phrases in large typography next to the face.
- Any Google Fonts font.

### Her prints (the strongest point)
- A print coming in like a sheet of paper, with a shadow.
- Slow zoom to the passage she is quoting.
- **Highlighter** (marca-texto) sweeping exactly over the phrase, at the moment she says it.
- Arrows, circles and annotations drawn on top.
- A tool screenshot with the cursor "clicking" through the steps of a tutorial.

### Layouts with the camera
- Full-screen camera with an element on top.
- Split screen: content on one side, camera on the other.
- Camera in a card in the corner (picture-in-picture), changing position per scene.
- Camera in a circle, with border and shadow.
- Smooth zoom on the camera at an important phrase.

### Visual explanations
- Flows and diagrams that build up step by step.
- Lists and numbered steps.
- Side-by-side comparisons (before/after, A × B).
- Timelines.
- Icons and illustrations drawn in SVG.

### Numbers and data
- Counters that count up to the spoken number.
- Bar, pie and line charts that grow on screen.
- Rulers, gauges and progress bars.

### Transitions
- Hard cut, fade, wipe (curtain), slide.
- Transformations: the camera shrinks into a card, an element grows into full screen.

### Formats
- Horizontal (YouTube), vertical (Reels, TikTok, Shorts), square (feed).
- Complete video as MP4 or separate inserts with a transparent background.

### More advanced (also free)
- 3D animations.
- Audio visualization (waves and bars reacting to the voice).
- Light, glow, grain and texture effects.

## 5. The files you will see

| File | What it is for |
|---|---|
| `src/Root.tsx` | the "list of videos": every composition registered here appears in Studio |
| `src/videos/<nome>/` | the code of each of her videos |
| `src/estilos/` | the gallery examples, ready to study and copy |
| `src/_shared/` | reused technical pieces (such as the synchronized split screen) |
| `projetos/` | her videos and prints (Remotion's public folder) |
| `edicoes/` | the final rendered files |
| `remotion.config.ts` | general render settings |

She does not need to open any of them. But if she wants to peek, the code of the examples in `src/estilos/` has comments in Portuguese explaining each style.

## 6. Useful commands

```bash
npm run studio         # opens the preview in the browser
npm run typecheck      # checks that the code has no errors
npm run compositions   # lists the registered compositions

# a still frame of a composition
npx remotion still src/index.ts VerticalLegendas edicoes/teste.png --frame=75

# render a video
npx remotion render src/index.ts VerticalLegendas edicoes/teste.mp4
```

In practice, Claude is the one who runs these commands. They are here so she knows what is going on.

## 7. MP4 or MOV?

- **MP4 (H.264):** the common format, light, plays anywhere. Use it for the final video and for full-screen inserts.
- **MOV (ProRes 4444):** a heavy file, but with a **transparent background**. Use it when she wants to place the animation on top of her video in another editor (Premiere, DaVinci, CapCut desktop, Final Cut).

## 8. Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm` is not recognized | Node.js not installed | install Node.js LTS (see [getting started](getting-started.md)) |
| Studio opens, but the video appears black | wrong file path, or the accent typed differently | ask Claude to check the `staticFile` |
| Render very slow | long video or heavy effects | normal the first time; ask for a render in parts or in draft quality for review |
| `EPERM` on Windows | antivirus or OneDrive blocking files | keep the project outside synced folders (e.g. `C:\dev\studio`) |
| Text cut off or off screen | phrase larger than the space | ask for a size adjustment or a line break |

## 9. Remotion license

Remotion is free for **individuals, non-profit organizations and companies with up to 3 people**. Larger companies need a paid license. Check the current terms at [remotion.dev/license](https://www.remotion.dev/license).

## 10. Going further

- Official documentation (in English): [remotion.dev/docs](https://www.remotion.dev/docs)
- Best-practices skill that Claude uses: [remotion-dev/skills](https://github.com/remotion-dev/skills)
