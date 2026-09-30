# The master and other video clips

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/videos.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/media/video. Back to the [index](index.md).

## `<Video>` from `@remotion/media`

Use `<Video>` from `@remotion/media` (already in the Estúdio template) for her recording and for any
B-roll clip, with `src={staticFile('<projeto>/videos/<vídeo>/…')}`.

| Prop | Meaning |
|---|---|
| `trimBefore` / `trimAfter` | skip the source before / after this point. **In frames**, not seconds (the upstream rule text says seconds; its own example and the type say frames): `trimBefore={2 * fps}` skips two seconds |
| `volume` | a number 0–1, or a function of the clip's own frame (`f` starts at 0 when the clip starts) for fades |
| `muted` | no sound from this clip |
| `playbackRate` | speed; no reverse |
| `loop`, `loopVolumeCurveBehavior` | repeat the clip; `"repeat"` restarts the volume function's frame each loop, `"extend"` keeps counting |
| `toneFrequency` | pitch (0.01–2) without changing speed; applied only when rendering, not in the Studio preview |
| `style` | size and position (`width`, `height`, `position`, `transform`) |
| `objectFit` | its own prop on this `<Video>` (not a `style` key): `cover`, `contain`, … |

To start a clip later, wrap it in `<Sequence from={…}>` ([sequencing.md](sequencing.md)).

## The master is locked

Her recording is the Master and the edit is composition on top of it:

- **One** `<Video>` instance for the whole composition, never re-created per scene: remounting it
  restarts decoding and can drift the audio. Scenes animate the container around it (size, position,
  radius, crop via the `objectFit` prop), not the video element's timeline.
- No `trimBefore`/`trimAfter`, `playbackRate`, `loop` or `toneFrequency` on the master, and no second
  copy of its audio: the original audio plays exactly once and the render lasts exactly as long as
  the master (±1 frame). Any cut belongs to the Pré-corte, which makes a new Master before editing.
- Other clips (generated B-roll, screen recordings) may be trimmed and muted freely; mute them unless
  the Plano says their sound is wanted.
