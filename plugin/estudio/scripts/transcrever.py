#!/usr/bin/env python3
"""Transcribe the Criadora's video locally, with the exact time of every word.

WHAT  Writes two files into the output folder:
        palavras.json   [{"w": word, "s": start, "e": end}, ...], seconds on the video's clock
        transcript.md   one "[MM:SS.mmm] sentence" line per sentence, after a header comment
      and prints one JSON summary: {"palavras", "frases", "duracao", "modelo", "dispositivo", "saida"}.
WHY   Every Palavra-gatilho comes from palavras.json: nothing may appear before it is said.
      faster-whisper runs on her computer, free, with no account or key.
WHEN  The Assistente de edição runs it once per Vídeo during the ingest, on the Master.
HOW   "<python>" transcrever.py "<video>" "<output folder>" --modelos "<plugin data>/modelos"
          [--idioma pt] [--kit "<kit.json>"] [--modelo large-v3-turbo]
      <python> is `tools.python` from the computer check (the Python holding faster-whisper).
      --modelos is the folder the Preparação fills with the speech model (~1.6 GB for
      large-v3-turbo, in the subfolder named after the model). The model is loaded from that
      folder by path and never downloaded: this script never contacts the network. --kit reads
      the Kit de marca's `glossario` (names and brands she says) and hands it to the model as a
      hint for their spelling.
      Exit 0 = done. Exit 2 = usage error. Exit 3 = the model is not prepared: nothing was
      written, and the message names the Preparação (the Diretor offers it again).
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True  # never leave __pycache__ inside the installed plugin

import argparse
import json
from pathlib import Path

DEFAULT_MODEL = "large-v3-turbo"
EXIT_MODEL_NOT_PREPARED = 3
# What faster-whisper cannot load a model without. A folder missing the tokenizer would make it
# fall back to a download, which this script never does; without the vocabulary the engine fails
# with a raw error. The Preparação verifies every file: this only decides "prepared or not".
REQUIRED_MODEL_FILES = ("model.bin", "config.json", "tokenizer.json")
VOCABULARY_FILES = ("vocabulary.json", "vocabulary.txt")  # either spelling, depending on the model
# The graphics card when there is one, the processor otherwise.
DEVICES = [("cuda", "float16"), ("cpu", "int8")]


def mmss(t: float) -> str:
    return f"{int(t // 60):02d}:{t % 60:06.3f}"


def glossary_prompt(kit: Path | None) -> str | None:
    """The Kit's glossary as a hint sentence, or None when there is none."""
    if kit is None:
        return None
    words = [w for w in json.loads(kit.read_text(encoding="utf-8")).get("glossario", []) if isinstance(w, str) and w.strip()]
    return f"Glossário: {', '.join(words)}." if words else None


def model_prepared(folder: Path) -> bool:
    return (all((folder / name).is_file() for name in REQUIRED_MODEL_FILES)
            and any((folder / name).is_file() for name in VOCABULARY_FILES))


def transcribe(video: Path, language: str, folder: Path, prompt: str | None):
    from faster_whisper import WhisperModel  # imported here: a usage error needs no model

    errors = []
    for device, compute in DEVICES:
        try:
            model = WhisperModel(str(folder), device=device, compute_type=compute)
            segments, info = model.transcribe(
                str(video), language=language, word_timestamps=True, vad_filter=True, initial_prompt=prompt)
            # The generator decodes only here; CUDA errors surface on this line.
            return list(segments), info, device
        except Exception as err:  # noqa: BLE001 — try the next device, report all at the end
            errors.append(f"{device}: {err}")
    raise SystemExit("a transcrição falhou:\n" + "\n".join(errors))


def main() -> None:
    ap = argparse.ArgumentParser(description="Word-timed local transcription (faster-whisper).")
    ap.add_argument("video", type=Path)
    ap.add_argument("saida", type=Path)
    ap.add_argument("--modelos", type=Path, required=True)
    ap.add_argument("--idioma", default="pt")
    ap.add_argument("--kit", type=Path)
    ap.add_argument("--modelo", default=DEFAULT_MODEL)
    args = ap.parse_args()
    if not args.video.is_file():
        ap.error(f"video not found: {args.video}")

    folder = args.modelos / args.modelo
    if not model_prepared(folder):
        print(f'o modelo de fala "{args.modelo}" ainda não está preparado em {folder}. '
              "Ele é baixado uma única vez, na Preparação do computador; nada foi transcrito nem escrito.",
              file=sys.stderr)
        sys.exit(EXIT_MODEL_NOT_PREPARED)

    args.saida.mkdir(parents=True, exist_ok=True)
    segments, info, device = transcribe(args.video, args.idioma, folder, glossary_prompt(args.kit))

    words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)}
             for segment in segments for w in (segment.words or [])]
    (args.saida / "palavras.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = [f"<!-- {args.modelo} | {device} | {info.duration:.3f}s -->"]
    lines += [f"[{mmss(s.start)}] {s.text.strip()}" for s in segments]
    (args.saida / "transcript.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"palavras": len(words), "frases": len(segments), "duracao": round(info.duration, 3),
                      "modelo": args.modelo, "dispositivo": device, "saida": str(args.saida)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
