# Audio

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/audio.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/media/audio. Back to the [index](index.md).

## `<Audio>` from `@remotion/media`

`<Audio src={staticFile('…')} />` (from `@remotion/media`, already in the template) plays a sound file
from the start of wherever it is mounted, at full volume, to its end. Several `<Audio>` elements mix
together. Wrap one in `<Sequence from={…}>` to start it later. Its props mirror `<Video>`'s
([videos.md](videos.md)):

| Prop | Meaning |
|---|---|
| `trimBefore` / `trimAfter` | skip the file before / after this point, **in frames** |
| `volume` | 0–1, or a function of the audio's own frame (`f` is 0 when this audio starts, not the composition's frame) |
| `muted` | can change with the frame, e.g. `muted={frame >= a && frame < b}` |
| `playbackRate` | speed; no reverse |
| `loop`, `loopVolumeCurveBehavior` | repeat; `"repeat"` (default) restarts the volume function's frame each loop, `"extend"` keeps counting across loops, which is what a fade-out spanning several loops needs |
| `toneFrequency` | pitch 0.01–2, only in the final render |

## In the Estúdio

- Her voice is the master's own audio track, played once by the master `<Video>`. Never add it again
  as an `<Audio>`, never speed it up, and never mute a stretch of it.
- Music and effects follow the Kit's music policy. A music bed sits well below her voice and ducks
  under speech: drive its `volume` with an `interpolate` of the audio's frame, dipping around the
  word ranges from `palavras.json` and fading in and out over about half a second.
- A sound effect goes in its own `<Sequence from={triggerFrame}>` with a short file; do not leave long
  silent tails mounted.
- Loudness is measured by the technical QC, not normalized in the composition: keep volumes as
  plain factors.
