# Sequencing: placing things on the timeline

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/sequencing.md` and
> `packages/skills/skills/remotion/rules/trimming.md` (remotion-dev/remotion, tag `v4.0.451`, commit
> `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs: https://www.remotion.dev/docs/sequence,
> https://www.remotion.dev/docs/series. Back to the [index](index.md).

## `<Sequence>`

`<Sequence from={f} durationInFrames={n}>` shows its children from frame `f` for `n` frames. Inside,
`useCurrentFrame()` restarts at 0, so a scene component animates from its own start and can be moved
along the timeline without touching its code.

| Prop | Effect |
|---|---|
| `from` | first frame on the parent's timeline (a word's start × `fps` in the Estúdio) |
| `durationInFrames` | how long the children stay mounted; after that they unmount |
| `premountFor` | mounts the children this many frames **before** `from`, invisibly, so images, fonts and video can load; use it on every Sequence (about one second, `fps`) |
| `layout="none"` | do not wrap the children in a full-frame absolutely positioned box (the default wrapper) |
| `width` / `height` | give the children their own canvas size, e.g. to embed another composition |

Sequences nest: an inner `from` is relative to the outer one. That lets a scene hold its own
sub-timings (title at +15, subtitle at +45) while the whole scene is placed by one word time.

## `<Series>`

`<Series>` with `<Series.Sequence durationInFrames={n}>` children plays them one after another with no
gaps, each starting when the previous ends. A negative `offset` on a `Series.Sequence` makes it start
that many frames before the previous one ends (an overlap). Use `Series` for a chain of full-screen
inserts; for overlays on the master use independent `Sequence`s placed by word time.

## Trimming an animation

- **Cut its start:** a negative `from` starts the child partway through. `<Sequence from={-15}>` shows
  the animation from its frame 15; the child sees `useCurrentFrame()` begin at 15.
- **Cut its end:** `durationInFrames` unmounts it early.
- **Both, plus a delay:** nest them. `<Sequence from={30}><Sequence from={-15}>…</Sequence></Sequence>`
  skips the first 15 frames of the animation and shows the rest starting at frame 30.

## In the Estúdio

- One `Sequence` per scene of the Plano, `from` = trigger word start × `fps`, rounded to a whole frame.
- Never place anything before its trigger word, and remember that `premountFor` is invisible: it
  loads early, it does not show early.
- The master recording is **one** continuous `<Video>` for the whole composition, outside these
  scene Sequences (see [videos.md](videos.md)); scenes move and resize its container, they never
  restart it.
