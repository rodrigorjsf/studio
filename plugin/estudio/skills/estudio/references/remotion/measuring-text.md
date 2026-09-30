# Measuring and fitting text

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/measuring-text.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/layout-utils/measure-text, https://www.remotion.dev/docs/layout-utils/fit-text,
> https://www.remotion.dev/docs/layout-utils/fill-text-box. Back to the [index](index.md).

Vertical 9:16 leaves little width, and a title or caption that overflows ends up over her face. Size
text by measuring it instead of guessing. Add `@remotion/layout-utils` (`npx remotion add
@remotion/layout-utils`).

| Function | Answers | Notes |
|---|---|---|
| `measureText({text, fontFamily, fontSize, fontWeight, letterSpacing, …})` | `{width, height}` of one line | results are cached per input |
| `fitText({text, withinWidth, fontFamily, fontWeight, …})` | `{fontSize}` that makes one line exactly fill `withinWidth` | cap it with the Kit's largest size: `Math.min(fontSize, max)` |
| `fitTextOnNLines({text, maxLines, maxBoxWidth, …})` | a font size and the lines, for text allowed to wrap | good for two-line titles |
| `fillTextBox({maxBoxWidth, maxLines})` | a box you `add({text, fontFamily, fontSize, …})` words to; each call says `exceedsBox` | for splitting a caption into pages that fit |

Three rules make the numbers true:

1. **Measure only after the font has loaded** (`waitUntilDone()` of `@remotion/google-fonts`, or the
   promise of `@remotion/fonts`); otherwise you measure the fallback font. Passing
   `validateFontIsLoaded: true` makes a measurement throw instead of silently using the fallback.
2. **Measure with the exact style you render**: same family, size, weight, letter spacing and text
   transform. Keep them in one style object used for both.
3. **No padding or border on the measured element**; they change its size. Draw outlines with
   `outline`, which takes no space.

In the Estúdio, the box you fit into is the free area outside the Zona do rosto, not the full frame.
