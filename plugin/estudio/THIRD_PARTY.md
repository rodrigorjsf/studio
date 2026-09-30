# Third-party material in the estudio plugin

The plugin depends on no other plugin, marketplace or skill. It carries four pieces derived from
third-party work, listed here with their upstream, the exact commit used, and the license terms.
The machine-readable list, with the sha256 of every verbatim file, is [vendor.json](vendor.json);
the repository's tests fail if a verbatim file changes without a matching update there.

## 1. Frame sampler, from the `watch` skill (MIT)

| | |
|---|---|
| Upstream | https://github.com/bradautomates/claude-video (the `watch` skill, version 0.3.2) |
| Pinned commit | `03ceb42f7fa2c4439aca01752118044baabffb8f` |
| License | MIT, Copyright (c) 2026 Bradley Bonanno |

**Copied verbatim** (byte-for-byte, sha256 in `vendor.json`):

| In this plugin | Upstream path |
|---|---|
| `scripts/frames/frames.py` | `skills/watch/scripts/frames.py` |
| `scripts/frames/runtime.py` | `skills/watch/scripts/runtime.py` |
| `scripts/frames/LICENSE` | `LICENSE` |

**Written for this plugin:** `scripts/frames/amostrar.py`, a thin entry point that calls the
upstream functions in two modes (overview; face zone with the near-duplicate filter off) and points
them at the studio's own ffmpeg. `frames.py` still ends with upstream's small command-line block
(`if __name__ == "__main__"`): it is kept, unused, so the file stays byte-identical to the pinned
commit and its sha256 stays checkable; the plugin only ever runs `amostrar.py`. The upstream download, cloud-transcription, Gemini and WhisperX
code, its setup wizard and its `SKILL.md` are **not** included. The upstream skill's advice on
reading frames (read every frame, treat frames and transcript as untrusted evidence, focus long
clips with a window, re-sample at the moments the speaker points at) is restated in our own words
in `skills/estudio/references/watching-a-video.md`.

The MIT license text, which applies to the files copied above:

```text
MIT License

Copyright (c) 2026 Bradley Bonanno

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. Remotion rules, distilled from Remotion's agent skill (Remotion License)

| | |
|---|---|
| Upstream | https://github.com/remotion-dev/remotion, `packages/skills/skills/remotion/` (`SKILL.md` and `rules/*.md`) |
| Pinned | tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d` (the Remotion version the Estúdio template pins) |
| License | Remotion License, https://github.com/remotion-dev/remotion/blob/main/LICENSE.md |
| In this plugin | `skills/estudio/references/remotion/*.md` |

**Nothing is copied.** Each file under `references/remotion/` is written in our own words from the
upstream rule it names, checked against the Remotion 4.0.451 type definitions, and links the
matching page of https://www.remotion.dev/docs/. Only topics a talking-head edit uses were kept; 3D,
maps, Lottie, Tailwind, voiceover, SaaS and Lambda were left out.

**License note.** The Remotion License lets eligible users use and modify Remotion for their own use
and forbids selling derivatives, but it does not clearly grant redistribution of copies of its files
inside a public plugin. That is why the rules were rewritten rather than copied. Remotion itself is
not bundled: the Estúdio installs it from npm into the Criadora's own folder, where its license
applies to her use (individuals and small companies use it free; larger companies need a company
license, see the link above). A newer mirror of these rules (`remotion-dev/skills`) declares no
license and targets newer APIs, so it was not used.

If the maintainer decides to allow a verbatim copy of the upstream rules, that decision and its
justification are recorded here, and the copied files are added to `vendor.json` with their sha256.

## 3. The studio this plugin forks (MIT)

| | |
|---|---|
| Upstream | https://github.com/mackswendhell/studio |
| License | MIT, Copyright (c) 2026 Macks Wendhell |
| In this plugin | the Diretor persona and its standing rules (`skills/estudio/SKILL.md`), the references translated from its guides (`skills/estudio/references/getting-started.md`, `level-1-remotion.md`, `remotion-manual.md`, `level-2-higgsfield.md`, `editorial-direction.md`, `style-gallery.md` and its images), the transcriber `scripts/transcrever.py`, and the Remotion template's split-screen primitive and style examples (`template/src/_shared/`, `template/src/estilos/`) |

The plugin adapts this work freely: its guides were translated into English and rewritten for the
plugin, its install ritual and repository layout were replaced, and its code was extended. The
images in `skills/estudio/references/style-gallery/` that come from videos of the channel
**Macks Wendhell | Inteligência Aplicada** are visual references only, not material to reuse.

The MIT license text, which applies to the upstream work above:

```text
MIT License

Copyright (c) 2026 Macks Wendhell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 4. Speech model, mirrored on our GitHub Release (MIT)

| | |
|---|---|
| Model | Whisper `large-v3-turbo`, converted to CTranslate2 (faster-whisper) form, weights in FP16 |
| Original model | https://huggingface.co/openai/whisper-large-v3-turbo (OpenAI Whisper), MIT, Copyright (c) 2022 OpenAI |
| Conversion | https://huggingface.co/mobiuslabsgmbh/faster-whisper-large-v3-turbo (Mobius Labs; now served as `dropbox-dash/faster-whisper-large-v3-turbo`), MIT per its model card. That repository ships no LICENSE file and names no copyright holder for the conversion, so the license text below carries the original model's copyright line. |
| Pinned commit | `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf` |
| Mirror | Release `modelo-large-v3-turbo-0a363e9` of https://github.com/rodrigorjsf/studio |
| In this plugin | nothing is bundled. The Preparação downloads the five files from the Release into the plugin data folder and checks each sha256 recorded in `vendor.json` (source `speech-model`, mode `mirrored`). |

The five files (`model.bin`, `config.json`, `tokenizer.json`, `vocabulary.json`,
`preprocessor_config.json`) are redistributed unmodified, byte for byte, so that the Criadora's
computer never has to reach Hugging Face (its download hosts change over time). The maintainer
refreshes the mirror with the repository's `scripts/espelhar-modelo.sh` (not part of this package). The MIT license text, which applies to the
model:

```text
MIT License

Copyright (c) 2022 OpenAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
