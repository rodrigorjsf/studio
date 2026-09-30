# Compositions and `calculateMetadata`

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/compositions.md` and
> `packages/skills/skills/remotion/rules/calculate-metadata.md` (remotion-dev/remotion, tag `v4.0.451`,
> commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs: https://www.remotion.dev/docs/composition,
> https://www.remotion.dev/docs/calculate-metadata. Back to the [index](index.md).

## `<Composition>`

A composition is one renderable video: an `id`, a `component`, `width`, `height`, `fps` and
`durationInFrames`. They are registered in the Estúdio's `src/Root.tsx`, one per Vídeo (and per
Formato when she asks for more than one). The id is what `npx remotion render <id>` and
`npx remotion still <id>` take.

- **`defaultProps`** hands the component its data. It must be JSON-serializable (plus `Date`, `Map`,
  `Set` and `staticFile()` values). Declare the props with a `type` alias, not an `interface`, and
  write `defaultProps={{…} satisfies Props}` so a typo fails the typecheck.
- **`<Folder name="…">`** groups compositions in the Studio sidebar. The name may hold only letters,
  numbers and hyphens: use the Vídeo's slug, never its folder name with spaces and accents.
- **`<Still>`** registers a single-image composition (no `fps`, no duration), e.g. a cover.

## Matching the master

The edit's width, height and fps are the master's, and its duration equals the master's within one
frame. Two ways to get there:

1. **Static numbers from the ingest** (preferred). The ingest already ran `ffprobe` on the master and
   recorded duration, size and fps. Write them into the composition: `durationInFrames =
   Math.round(durationSeconds * fps)`.
2. **`calculateMetadata`**, when the numbers must follow data at render time.

## `calculateMetadata`

An async function set on the `<Composition>` that runs once before rendering (and whenever props
change in the Studio). It receives `{props, defaultProps, abortSignal, compositionId, isRendering}` and returns
any of these overrides:

| Field | Overrides |
|---|---|
| `durationInFrames`, `width`, `height`, `fps` | the composition's own values |
| `props` | the props the component receives (e.g. data read from a JSON file in the Vídeo folder) |
| `defaultOutName` | the output file name suggested by the Studio (extension added automatically) |
| `defaultCodec` and the other `default…` render settings | the render defaults (see [transparent-videos.md](transparent-videos.md)) |

Pass `abortSignal` to every `fetch` inside it, so a stale request is cancelled when props change.
Keep a placeholder `durationInFrames` on the `<Composition>`; the returned value replaces it.

```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props, abortSignal}) => {
  const palavras = await fetch(staticFile(props.palavras), {signal: abortSignal}).then((r) => r.json());
  return {props: {...props, palavras}};
};
```

Reading a video's duration or size inside `calculateMetadata` is covered in
[video-metadata.md](video-metadata.md).

## Embedding one composition in another

Render the other composition's component inside a `<Sequence width={w} height={h}>`: the Sequence
gives it its own canvas size.
