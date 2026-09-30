# Transitions

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/transitions.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/transitions/transitionseries. Back to the [index](index.md).

## `<TransitionSeries>`

From `@remotion/transitions` (`npx remotion add @remotion/transitions`). Like a `Series`, it plays
`<TransitionSeries.Sequence durationInFrames={n}>` children one after another, and between two of them
you may put:

- **`<TransitionSeries.Transition presentation={…} timing={…} />`**: both neighbours play at the same
  time while one replaces the other. **It shortens the total**: two 60-frame scenes with a 15-frame
  transition last 105 frames, not 120.
- **`<TransitionSeries.Overlay durationInFrames={n} offset={k}>`**: any component drawn over the cut,
  centred on it (`offset` moves it later if positive, earlier if negative). **It does not change the
  total.** An overlay may not sit next to a transition or another overlay.

Presentations are imported from their own paths: `fade` (`@remotion/transitions/fade`), `slide`
(`…/slide`, with `direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom'`), `wipe`,
`flip`, `clockWipe` (`…/clock-wipe`), `iris`, `none`. Timings: `linearTiming({durationInFrames})`, or
`springTiming({config: {damping: 200}, durationInFrames?})`. `timing.getDurationInFrames({fps})`
gives a transition's length (a spring without `durationInFrames` lasts until it settles, so its
length depends on `fps`); subtract each one from the sum of the scenes to get the total.

## In the Estúdio

- **Never put the master inside a `TransitionSeries.Transition`.** The overlap would shorten the edit
  and play her audio twice during the transition. Transitions are for full-screen inserts that sit on
  top of the continuous master, and their total must still end where the master ends.
- For a single insert entering and leaving over the master, a plain `Sequence` with an eased
  entrance and exit ([timing.md](timing.md)) is simpler and cannot change the duration.
- An overlay across a cut (a flash, a light sweep) is safe for the duration; keep it off her face.
