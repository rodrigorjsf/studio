# Timing: interpolation, easing and springs

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/timing.md` and
> `packages/skills/skills/remotion/rules/animations.md` (remotion-dev/remotion, tag `v4.0.451`, commit
> `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs: https://www.remotion.dev/docs/interpolate,
> https://www.remotion.dev/docs/easing, https://www.remotion.dev/docs/spring. Back to the [index](index.md).

## The one rule

Every visual change is a pure function of the current frame. Read the frame with `useCurrentFrame()`
and the rate with `useVideoConfig().fps`, think in **seconds** and multiply by `fps` at the edge. A
component that looks at anything else to decide what to draw (a timer, `Date.now()`, a CSS
transition, an animation class) renders wrong or flickers, because the renderer captures frames out
of order and never waits.

## `interpolate()`

`interpolate(input, inputRange, outputRange, options)` maps a number from one range to another.
Two details decide whether it behaves:

- **It extrapolates by default.** Past the last input point the output keeps going (an opacity of
  1.4, a scale of −0.2). Set `extrapolateLeft: 'clamp'` and `extrapolateRight: 'clamp'` whenever the
  value must stop at the ends, which is almost always.
- **Input ranges must increase.** `[start, end]` in frames, with `start < end`.

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();
const inAt = palavra.s * fps;                 // word start, seconds → frames
const opacity = interpolate(frame, [inAt, inAt + 0.4 * fps], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.16, 1, 0.3, 1),
});
```

## Easing

Pass `easing` in the options. Two families:

| Kind | How | Use |
|---|---|---|
| Custom curve | `Easing.bezier(x1, y1, x2, y2)`, the same four numbers as CSS `cubic-bezier()` | when the Kit's motion tokens give a curve, or you copy one from a web spec |
| Presets | `Easing.in(f)`, `Easing.out(f)`, `Easing.inOut(f)` wrapping `Easing.quad`, `.cubic`, `.sin`, `.exp`, `.circle` (roughly gentle → strong) | quick, readable defaults |

The default is linear, which reads as mechanical on screen. Rules of thumb:

- **Entrances decelerate** (`Easing.out`, or a bezier like `0.16, 1, 0.3, 1`): the element arrives
  with speed and settles.
- **Exits accelerate** (`Easing.in`): it leaves as if pulled away.
- **Symmetric moves** (a slow push-in, a pan) use `inOut`, e.g. `0.45, 0, 0.55, 1`.
- **Overshoot** (`y` control point above 1, e.g. `0.34, 1.56, 0.64, 1`) is for rare emphasis, never
  for text the viewer must read.

## One progress value, many properties

When several properties move together (a panel slides in while the camera card shifts), compute a
single 0→1 progress once and derive each property from it. Timing (when, how fast) stays in one
place; mapping (from where to where) is per property. An exit is a second progress subtracted from
the first:

```tsx
const enter = interpolate(frame, [a, a + 20], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const leave = interpolate(frame, [b, b + 15], [0, 1], {easing: Easing.in(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const p = enter - leave;
const panelX = interpolate(p, [0, 1], [100, 0]);   // %, off-screen → in place
const cardScale = interpolate(p, [0, 1], [1, 0.42]);
```

This is also what keeps a split screen's two halves in step; in the Estúdio, split screens must
still go through the template's `synchronized-split.tsx`.

## Springs

`spring({frame, fps, config, delay, durationInFrames})` returns a physically damped 0→1 value.
`config: {damping: 200}` gives a smooth settle without bounce; lower damping bounces. `delay` shifts
the start in frames, and `durationInFrames` stretches the spring to a fixed length. Prefer
`interpolate` + easing when the timing must land on a word exactly; use a spring for organic
secondary motion (a sticker popping in, a highlighter wipe).
