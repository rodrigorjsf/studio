# A video's duration, size and frames

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/get-video-duration.md`,
> `packages/skills/skills/remotion/rules/get-video-dimensions.md` and
> `packages/skills/skills/remotion/rules/extract-frames.md` (remotion-dev/remotion, tag `v4.0.451`,
> commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs: https://www.remotion.dev/docs/mediabunny/metadata,
> https://www.remotion.dev/docs/mediabunny/extract-frames. Back to the [index](index.md).

## Outside the composition: ffprobe and the sampler (preferred)

The Estúdio already has better tools for this than code inside Remotion:

- **Duration, size, fps, codecs:** `ffprobe` (`tools.ffprobe`) at ingest. Its numbers go into the
  Vídeo document and from there into the composition.
- **Frames to look at:** the plugin's frame sampler, `amostrar.py`, in overview or face-zone mode
  (see [watching-a-video.md](../watching-a-video.md)). Stills of the **edit** come from
  `npx remotion still`.

## Inside Remotion: Mediabunny

When a value must be read by the composition itself (e.g. in `calculateMetadata`, for a B-roll clip
whose length is not recorded), use Mediabunny. It comes with `@remotion/media` in the template (as
its dependency, `mediabunny` 1.39.x at Remotion 4.0.451); if you import it directly, add it to the
Estúdio's `package.json` at that same version.

- **Open a file:** `new Input({formats: ALL_FORMATS, source: new UrlSource(staticFile('…'))})`.
  `UrlSource` accepts an options object; `getRetryDelay: () => null` disables retries so a missing
  file fails at once. (For a `File` or `Blob` object, use `BlobSource`; the upstream rule names a `FileSource`, which the
  Mediabunny version at Remotion 4.0.451 does not export.)
- **Duration:** `await input.computeDuration()`, in seconds; `Math.ceil(seconds * fps)` frames.
- **Size:** `const track = await input.getPrimaryVideoTrack()` (it may be `null`: no video track),
  then `track.displayWidth` / `track.displayHeight`, which already account for rotation.
- **Several clips:** compute their durations with `Promise.all` and add them up.
- **Frames at given times:** `new VideoSampleSink(track).samplesAtTimestamps(seconds[])` yields a
  sample per time (or `null`); draw each with `sample.draw(ctx, x, y)` on a canvas and release it
  (`using` or `sample.close()`). Useful for a filmstrip insert; check an `AbortSignal` between
  samples so a Studio prop change cancels the work.
