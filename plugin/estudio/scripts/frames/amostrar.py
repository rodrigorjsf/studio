#!/usr/bin/env python3
"""Sample frames from the Criadora's video for the Diretor to look at.

WHAT  The Estúdio's entry point to the vendored frame sampler (frames.py + runtime.py, MIT,
      see THIRD_PARTY.md at the plugin root). It only chooses how to call that code and
      prints one JSON result; the sampling itself is upstream's, unchanged.
WHY   Two different needs:
        visao-geral    overview: scene-aware selection (uniform when the clip is nearly
                       static), near-duplicates dropped, capped. For reading the video.
        zona-do-rosto  face zone: uniform frames at a fixed rate over the whole clip,
                       near-duplicates KEPT. Measuring where the face sits needs the
                       near-identical talking-head frames that dedup would remove.
HOW   "<python>" amostrar.py "<video>" "<out-dir>" --modo visao-geral|zona-do-rosto
          [--ffmpeg "<path>"] [--ffprobe "<path>"] [--start T] [--end T]
          [--max-frames N] [--fps F] [--resolution W] [--cues T1,T2,...]
      <python>, <path>: the `tools.*` paths from the computer check; the programs the studio
      downloads are not on PATH. Times are SS, MM:SS or HH:MM:SS. Every timestamp printed is
      on the source clock (seconds from the start of the video), also inside a --start window.
      Stdlib only; needs ffmpeg and ffprobe.
"""
from __future__ import annotations

import sys

sys.dont_write_bytecode = True  # never leave __pycache__ inside the installed plugin

import argparse
import json
import os
import shutil
from pathlib import Path

from runtime import configure_stdio
from frames import (
    MAX_FPS, auto_fps, auto_fps_focus, extract, extract_at_timestamps,
    extract_scene_or_uniform, get_metadata, merge_frames, parse_time, parse_timestamps,
    validate_controls,
)

OVERVIEW_CAP = 100      # upstream's "balanced" detail cap
FACE_ZONE_FPS = 1.0     # one frame per second is enough to follow the face
FACE_ZONE_CAP = 600     # 10 min at 1 fps; longer clips get a lower rate, never a shorter span


def use_programs(ffmpeg: str | None, ffprobe: str | None) -> None:
    """frames.py calls `ffmpeg`/`ffprobe` by name: put the given ones first on PATH."""
    for program in (ffprobe, ffmpeg):
        if program:
            os.environ["PATH"] = str(Path(program).resolve().parent) + os.pathsep + os.environ.get("PATH", "")
    for name in ("ffmpeg", "ffprobe"):
        if shutil.which(name) is None:
            raise SystemExit(f"{name} not found: pass --{name} with the path from the computer check (tools.{name}).")


def overview(args, meta: dict, start, end) -> dict:
    cap = args.max_frames or OVERVIEW_CAP
    span = max(0.0, (end if end is not None else meta["duration_seconds"]) - (start or 0.0))
    focused = start is not None or end is not None
    fps, target = (auto_fps_focus if focused else auto_fps)(span, max_frames=cap)
    if args.fps is not None:
        fps = min(args.fps, MAX_FPS)
        target = max(1, int(round(fps * span)))

    cues, cue_meta = [], None
    if args.cues:
        cues, cue_meta = extract_at_timestamps(
            args.video, args.out_dir, parse_timestamps(args.cues), resolution=args.resolution,
            max_frames=cap, start_seconds=start, end_seconds=end)
    budget = cap - len(cues)
    frames, frame_meta = [], {"engine": "none", "candidate_count": 0, "deduped_count": 0, "selected_count": 0, "fallback": False}
    if budget > 0:
        frames, frame_meta = extract_scene_or_uniform(
            args.video, args.out_dir, fps=fps, target_frames=target, resolution=args.resolution,
            max_frames=budget, start_seconds=start, end_seconds=end, dedup=True)
    return {"dedup": True, "fps": fps, **frame_meta, "cues": cue_meta, "frames": merge_frames(frames, cues)}


def face_zone(args, start, end) -> dict:
    fps = args.fps or FACE_ZONE_FPS
    frames = extract(
        args.video, args.out_dir, fps=fps, resolution=args.resolution,
        max_frames=args.max_frames or FACE_ZONE_CAP, start_seconds=start, end_seconds=end)
    return {"dedup": False, "fps": fps, "engine": "uniform", "candidate_count": len(frames),
            "deduped_count": 0, "selected_count": len(frames), "fallback": False, "cues": None, "frames": frames}


def main() -> None:
    configure_stdio()
    ap = argparse.ArgumentParser(description="Sample frames of a video (overview or face zone).")
    ap.add_argument("video")
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--modo", required=True, choices=["visao-geral", "zona-do-rosto"])
    ap.add_argument("--ffmpeg")
    ap.add_argument("--ffprobe")
    ap.add_argument("--start")
    ap.add_argument("--end")
    ap.add_argument("--max-frames", type=int)
    ap.add_argument("--fps", type=float)
    ap.add_argument("--resolution", type=int, default=512)
    ap.add_argument("--cues", help="overview only: comma-separated times to pin a frame at")
    args = ap.parse_args()
    if args.cues and args.modo != "visao-geral":
        ap.error("--cues works only with --modo visao-geral")

    use_programs(args.ffmpeg, args.ffprobe)
    start, end = parse_time(args.start), parse_time(args.end)
    validate_controls(args.resolution, args.max_frames, start, end, args.fps)
    meta = get_metadata(args.video)
    if start is not None and start >= meta["duration_seconds"]:
        raise SystemExit(f"--start {start:.1f}s is past the end of the video ({meta['duration_seconds']:.1f}s)")
    if end is not None:
        end = min(end, meta["duration_seconds"])

    result = overview(args, meta, start, end) if args.modo == "visao-geral" else face_zone(args, start, end)
    print(json.dumps({"modo": args.modo, "meta": meta, **result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
