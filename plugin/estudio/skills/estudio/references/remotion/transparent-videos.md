# Transparent renders (the "separate inserts" deliverable)

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/transparent-videos.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/transparent-videos. Back to the [index](index.md).

When she wants inserts to place in her own editor, each overlay is rendered **without a background**
and with an alpha channel. The composition itself must draw nothing behind the overlay (no master
video, no background color) for the transparent areas to stay transparent.

## Two formats

| Format | For | Render flags |
|---|---|---|
| ProRes 4444 `.mov` | video editors (Premiere, Final Cut, CapCut desktop, DaVinci) — **the Estúdio's default for inserts** | `--codec=prores --prores-profile=4444 --image-format=png --pixel-format=yuva444p10le` |
| VP9 `.webm` | web browsers | `--codec=vp9 --image-format=png --pixel-format=yuva420p` |

Both need PNG frames: the template's default JPEG frames have no alpha. The template's
`remotion.config.ts` sets `h264` / `jpeg` / `yuv420p` for the full-video deliverable, so pass the
flags on the command line for each overlay, e.g.:

```bash
npx remotion render src/index.ts <Overlay> "<vídeo folder>/entrega/<nome>-overlay.mov" --codec=prores --prores-profile=4444 --image-format=png --pixel-format=yuva444p10le
```

## Per-composition defaults

Instead of flags, an overlay composition can carry its own defaults through `calculateMetadata`
([compositions.md](compositions.md)), returning `defaultCodec: 'prores'`, `defaultProResProfile:
'4444'`, `defaultVideoImageFormat: 'png'` and `defaultPixelFormat: 'yuva444p10le'`. For WebM use
`defaultCodec: 'vp9'` with `yuva420p` (the upstream rule's example says `vp8` in this one place;
VP9 matches its own command line). Command-line flags still win over these defaults.

## Check the alpha

After rendering, `ffprobe` must show a pixel format with an `a` (alpha) for each overlay
(`yuva444p10le` / `yuva420p`); an overlay without alpha is a failed deliverable.
