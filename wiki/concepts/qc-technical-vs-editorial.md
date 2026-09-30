---
title: Technical vs editorial QC
type: concept
updated: 2026-09-29
sources: [../sources/estudio-profissional-de-video-report.md]
---

# Technical vs editorial QC

**Technical QC** (automatable with the repo toolchain): `ffprobe` (codec, resolution, fps, duration vs master ±1 frame), `blackdetect`, `freezedetect`, `ebur128` (integrated loudness, true peak). Photosensitivity (flash >3 Hz over >25% of screen, ITU-R BT.1702) has no ffmpeg check — needs a tool or flagged manual check.

**Editorial QC** (independent critic, never the maker): on-screen spelling; captions vs audio; nothing before it is said; face never covered; text inside the safe zone; brand tokens and logo correct. Caption baselines: FCC four standards, 2×32 chars at 99% accuracy, Netflix 42 chars/line.

Loop: render → inspect frames → fix, with separate technical-QC, brand-guardian and platform critics.
