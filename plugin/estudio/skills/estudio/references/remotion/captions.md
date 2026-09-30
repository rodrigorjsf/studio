# Captions

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/display-captions.md`,
> `packages/skills/skills/remotion/rules/import-srt-captions.md` and
> `packages/skills/skills/remotion/rules/subtitles.md` (remotion-dev/remotion, tag `v4.0.451`, commit
> `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs: https://www.remotion.dev/docs/captions,
> https://www.remotion.dev/docs/captions/create-tiktok-style-captions,
> https://www.remotion.dev/docs/captions/parse-srt. Back to the [index](index.md).

Captions use the `Caption` type of `@remotion/captions` (`npx remotion add @remotion/captions`):
`{text, startMs, endMs, timestampMs, confidence}`, with `timestampMs` and `confidence` allowed to be
`null`. The transcription is local (faster-whisper); upstream's speech-to-text steps are not used.

## From `palavras.json` to `Caption[]`

The ingest writes `palavras.json` as `[{w, s, e}]` (word, start and end in seconds). Convert once,
with a leading space on every word but the first, because captions are whitespace-sensitive:

```ts
const captions: Caption[] = palavras.map((p, i) => ({
  text: (i === 0 ? '' : ' ') + p.w,
  startMs: p.s * 1000,
  endMs: p.e * 1000,
  timestampMs: ((p.s + p.e) / 2) * 1000,
  confidence: null,
}));
```

Load the file before the first frame renders: read it in `calculateMetadata` and pass it as a prop
([compositions.md](compositions.md)), or `fetch(staticFile(…))` inside the component while holding the
render with `useDelayRender()` (call its `delayRender()` once, then `continueRender(handle)` on success
or `cancelRender(error)` on failure).

## An existing `.srt`

`parseSrt({input: text})` returns `{captions}` in the same `Caption` format, ready for the functions
below. Load the text the same way as `palavras.json`.

## Pages, word by word

`createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds})` groups words into pages; the
number is how long one page may cover (higher = more words on screen). Each page has `text`,
`startMs`, `durationMs` and `tokens: [{text, fromMs, toMs}]`. Render each page in its own
`<Sequence>`, from `page.startMs / 1000 * fps`, lasting until the next page starts or the page's
maximum, whichever is first; skip pages whose duration comes out as zero or negative.

Inside a page, the current time is `page.startMs + (frame / fps) * 1000` (the Sequence resets the
frame); a token is being spoken when `fromMs <= now < toMs`, which is how the active word gets the
Kit's highlight color. Set `whiteSpace: 'pre'` on the caption text so the leading spaces survive.

## In the Estúdio

- Put the caption component in its own file and draw it over the master, not inside a scene.
- Style comes from the Kit's caption style; the page width is the free area outside the Zona do
  rosto, and `fillTextBox` from [measuring-text.md](measuring-text.md) is how to keep a page inside it.
- Fix a misheard proper noun in the text only; never move the timings.
