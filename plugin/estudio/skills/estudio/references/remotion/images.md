# Images and Prints

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/images.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/img, https://www.remotion.dev/docs/get-image-dimensions. Back to the
> [index](index.md).

## Always `<Img>` from `remotion`

Show every image (Print, logo, generated still) with `<Img src={staticFile('…')} />` from `remotion`.
`<Img>` holds the frame until the file has loaded, so a render never captures a blank or half-loaded
picture. A plain `<img>`, a CSS `background-image` or a framework image component does not wait and
produces blank or flickering frames.

- Size and place it with `style` (`width`, `height`, `position`, `objectFit`, `transform`).
- File names can be built from data: ``staticFile(`${pasta}/prints/${nome}.png`)``.
- Remote URLs work without `staticFile()` if the server allows cross-origin loading; in the Estúdio,
  prefer files she saved, so the edit does not depend on a website.
- Animated GIFs need `<Gif>` from `@remotion/gif`; prefer converting them to a video clip.

## Prints stay intact

A Print is evidence she chose: show it whole or crop it with the container, never distort it.

- Keep its aspect ratio (`objectFit: 'contain'`, or `cover` inside a container shaped like it).
- Zoom and pan by animating a wrapper's `transform: scale() translate()` from one progress value
  ([timing.md](timing.md)); keep the whole frame sharp by using a Print at least as large as its
  on-screen size at the end of the zoom.
- The highlighter sits exactly on the quoted phrase: measure the phrase's box in the Print's own
  pixels and position the mark in the same coordinate system as the image (inside the scaled wrapper),
  so it follows the zoom.

## An image's size

`getImageDimensions(src)` resolves `{width, height}`, for example to size a composition or a
container from a Print. At 4.0.451 it lives in **`@remotion/media-utils`**, not in `remotion` (the
upstream rule imports it from `remotion`, which fails): add that package with `npx remotion add
@remotion/media-utils` first. For Prints, reading the size once at ingest (`ffprobe` works on images
too) and writing it into the props is simpler.
