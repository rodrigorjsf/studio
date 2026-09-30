# Text animations

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/text-animations.md`
> and its two example components (remotion-dev/remotion, tag `v4.0.451`, commit
> `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs: https://www.remotion.dev/docs/animating-properties.
> Back to the [index](index.md).

## Typewriter

Reveal a string by **slicing** it by the frame: `texto.slice(0, Math.floor(frame / framesPerChar))`.
Do not fade each character's opacity: it is slower to render, and a half-transparent letter reads as
a glitch. Useful refinements:

- a pause after a phrase: freeze the character count for `pauseSeconds * fps` frames before continuing;
- a blinking cursor: an `interpolate` of `frame % blinkFrames` over `[0, blinkFrames / 2, blinkFrames]`
  → `[1, 0, 1]` driving the cursor's opacity;
- measure the **full** string once for layout ([measuring-text.md](measuring-text.md)), so the line
  does not re-wrap while it types.

## Highlighter on a word

Wrap the word in an inline-block `span`, and behind it (absolutely positioned, lower `zIndex`) a
colored bar with `transformOrigin: 'left center'` whose `transform: scaleX(p)` grows from 0 to 1.
Drive `p` with a `spring({frame, fps, config: {damping: 200}, delay, durationInFrames})` or an eased
`interpolate`, clamped to 0–1, and start it at the word's time from `palavras.json`. Give the bar a
small border radius and a height a little above `1em` so it looks hand-drawn.

The same technique is the marker on a Print; there, the bar sits in the Print's coordinate system
(see [images.md](images.md)).

## Word timing

Per-word effects (karaoke color, a pop on the key word) use each word's start and end from
`palavras.json`, converted to frames; see [captions.md](captions.md) for full captions.
