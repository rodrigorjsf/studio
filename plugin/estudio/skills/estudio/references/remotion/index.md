# Remotion rules for the Estúdio

Read the file for the topic you are about to program. Each file is a short rulebook for the Remotion
the Estúdio template pins, **4.0.451**, trimmed to what a talking-head edit (Nível 1, or Nível 2 through
the API key) actually uses. The beginner's tour is [remotion-manual.md](../remotion-manual.md); these
files are the precise rules.

| Topic | File | Read it when |
|---|---|---|
| Timing, interpolation, easing, springs | [timing.md](timing.md) | any element moves, fades or scales |
| Sequences, series, trimming an animation | [sequencing.md](sequencing.md) | placing scenes on the timeline by word time |
| Compositions and `calculateMetadata` | [compositions.md](compositions.md) | registering a Vídeo in `Root.tsx`, matching the master |
| The master video, trimming, volume | [videos.md](videos.md) | putting her recording on the timeline |
| Images and Prints | [images.md](images.md) | showing a Print, a logo, a generated image |
| Fonts | [fonts.md](fonts.md) | applying the Kit's typography |
| Measuring and fitting text | [measuring-text.md](measuring-text.md) | a title must fit a box, a caption must not overflow |
| Text animations | [text-animations.md](text-animations.md) | typewriter, highlighter on a word |
| Transitions | [transitions.md](transitions.md) | cutting between full-screen inserts |
| Captions (word by word, SRT) | [captions.md](captions.md) | dynamic captions from `palavras.json` |
| Audio | [audio.md](audio.md) | music bed, sound effects, ducking |
| Transparent renders | [transparent-videos.md](transparent-videos.md) | the "separate inserts" deliverable |
| Duration, size and frames of a video file | [video-metadata.md](video-metadata.md) | you need a clip's length, size or a still from it |

## Where these rules come from

They are distilled, in our own words, from the rule files of Remotion's official agent skill at
`packages/skills/skills/remotion/rules/` in the `remotion-dev/remotion` monorepo, tag `v4.0.451`
(commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`), which matches the template's pinned version. Each
file names its upstream rule and the matching page of https://www.remotion.dev/docs/. Every API named
here was checked against the 4.0.451 type definitions, and the upstream mistakes found that way are
corrected where they appear (`trimBefore`/`trimAfter` are frames, not seconds; `getImageDimensions`
comes from `@remotion/media-utils`, not `remotion`; Mediabunny has `BlobSource`, not `FileSource`; the
transparent WebM codec is VP9). The license note is in the plugin's `THIRD_PARTY.md`.

## Rules that hold in every file

- **Only APIs of Remotion 4.0.451.** Newer docs pages describe APIs the Estúdio does not have. When in
  doubt, read the type definitions under the Estúdio's `node_modules/remotion/` and `node_modules/@remotion/`.
- **Packages the template already has:** `remotion`, `@remotion/cli`, `@remotion/media` (which brings
  `mediabunny` with it). Anything else (`@remotion/transitions`, `@remotion/captions`,
  `@remotion/google-fonts`, `@remotion/fonts`, `@remotion/layout-utils`, `@remotion/media-utils`) is
  added from the Estúdio folder with `npx remotion add <package>`, run through `tools.node`'s `npx`. That
  command installs the exact version of the `remotion` already installed; never add an `@remotion/*`
  package at another version, and never run `npm update`.
- **Everything is driven by the frame number.** No CSS transitions, CSS keyframe animations or
  animation class names: the renderer takes one screenshot per frame and never lets time pass.
- **Every trigger comes from word timing.** Convert the seconds in `palavras.json` to frames with the
  composition's `fps`; nothing appears before it is said.
- **The Estúdio's public folder is `projetos/`.** Reference her files with
  `staticFile('<projeto>/videos/<vídeo>/…')`.
