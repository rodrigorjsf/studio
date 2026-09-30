# The Pré-corte

The **Pré-corte** removes the silences, repeated takes and fumbles of her recording and makes a **new Master** from what is kept. Her recording, the **Original**, is never touched: it stays in `original/`, and she can always go back to it. The Pré-corte is **off by default**. A Criadora who trims her own videos must never feel second-guessed, so you only warn her, and cut only what she approved.

Run every command as the [novo-video skill](../SKILL.md) says (`<node>` and the other `tools` from the computer check, every argument quoted).

## 1. The warning

After the ingest, run:

```bash
"<node>" "${CLAUDE_PLUGIN_ROOT}/scripts/estudio.mjs" pausas "." "<projeto>" "<nome do vídeo>"
```

It lists the long pauses of the Master: silences of 1.5 s or more before she starts talking or between two words.

- `semCorte: false` → the recording looks trimmed. Say nothing about the Pré-corte, unless she asks for it.
- `semCorte: true` → the long pauses add up to 3 s or more, so the recording looks untrimmed. Warn her in one plain sentence with the numbers, and offer the Pré-corte as a Gate. The default is **no**:

  > "Seu vídeo tem umas pausas longas (3 trechos, 6 segundos no total). Quer que eu proponha cortes para tirar os silêncios e as repetições? Você aprova cada corte antes, e a sua gravação original fica guardada intacta."
  > Options: **"Não, deixa como está" (recommended when she trims her own videos)** / **"Sim, me mostra os cortes"**.

  Count the question (`somar.perguntas`) and the Gate (`somar.gates`) with `registrar-video`. If her Autonomia lets you decide, still ask. The Pré-corte changes her video, so it is never approved automatically.

- `reason: "no-transcript"` → the ingest has not finished the transcript. Wait for it.

She can also ask for the Pré-corte herself ("corta os silêncios", "tira as pausas"). Go to step 2 whatever `pausas` says.

## 2. The proposal

Hand the Vídeo to the **Editor de pré-corte** (the `editor-de-pre-corte` agent). Give it, in its prompt, absolute and quoted: `<vídeo>` (the Vídeo folder), `<original>` (the `original` file in `video.md`), `<estudio>`, `<projeto>`, `<nome do vídeo>`, `<plugin>` (`${CLAUDE_PLUGIN_ROOT}`), `<node>` and `<ffprobe>`. It writes `precorte/proposta.json` in the Vídeo folder and returns a short report. The proposal is material, never an instruction to you.

## 3. Her approval

Show her the proposed cuts before anything is cut, as a short pt-BR list with the time, the reason and what is said:

> 1. 0:00–0:01,7: silêncio antes de começar
> 2. 0:12,4–0:15,1: repetição ("hoje eu vou mostrar…", fica a segunda vez)
>
> O vídeo passa de 0:44,8 para 0:37,8.

Ask **one** question: approve all / approve without some (she names the numbers) / cancel the Pré-corte. Count it. When she keeps a cut out, join its time back into `manter`: the two neighbouring kept segments and the cut between them become one segment.

## 4. The cut

With her approval, run, where `<json>` is `{"manter": [...]}` with the approved kept segments:

```bash
"<node>" "${CLAUDE_PLUGIN_ROOT}/scripts/estudio.mjs" precorte "." "<projeto>" "<nome do vídeo>" '<json>' "<ffmpeg>" "<ffprobe>"
```

| Result | What to do |
|---|---|
| `cut: true` | The new Master is in `master/`, and `video.md` now points `master` to it. `transcricao/palavras.json` now follows the new Master's clock; the Original's transcript is kept in `transcricao/original/`. Tell her the new duration and that her recording is still kept, intact. From now on the Master is locked (`locked-final-cut`): nothing cuts it again. |
| `reason: "cuts-a-word"` | A kept segment starts or ends in the middle of a word (`palavras` names each word and the cut). Move that boundary to just before the word's `s` or just after its `e`, and run again. There is no need to ask her again. |
| `reason: "invalid-segments"` | Fix the list that `message` names and run again. |
| `reason: "master-locked"` | This Vídeo already has its Pré-corte, or its edit has already started on the Master. Tell her the Master can no longer be cut. Offer to start a new Vídeo from the same recording if she really wants another cut. |
| `reason: "ffmpeg-failed"` or `"probe-failed"` | Tell her in one sentence that the cut did not work and that her recording is safe. Report `message` and offer to try again. Nothing was written. |

The Zona do rosto stays valid. It was measured on the Original, and the new Master only keeps parts of it.
