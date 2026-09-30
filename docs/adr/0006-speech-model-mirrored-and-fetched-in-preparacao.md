# The speech model is mirrored on our GitHub Release and fetched during the Preparação

Transcription uses faster-whisper with `large-v3-turbo`. Until now the model (~1.6 GB) was downloaded from Hugging Face the first time `transcrever.py` ran, in the middle of an edit. In Claude's cloud workspace the network is an account-level domain allowlist, so the Criadora met an unexplained "allow huggingface.co" prompt mid-edit. The upstream studio (mackswendhell/studio) had the same behaviour and only hid it behind an already-warm `~/.cache/huggingface`. The `watch` skill we vendor from does not help: its transcription paths are segment-level only (cloud Whisper with `verbose_json`, WhisperX with `--no_align`), so they break the word-level timing every Palavra-gatilho needs, and its local WhisperX path downloads from Hugging Face too.

We decided three things:

- **The model is fetched during the Preparação, never during editing.** `transcrever.py` loads it from a local path and fails with exit 3 when it is missing, instead of downloading. The Diretor then offers the Preparação again, and the Preparação is idempotent.
- **The model comes from a GitHub Release of `rodrigorjsf/studio`.** The Release mirrors the five CTranslate2 files of `mobiuslabsgmbh/faster-whisper-large-v3-turbo` (MIT, now served as `dropbox-dash/…`) pinned at commit `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf`, and `vendor.json` records the sha256 of each file. GitHub is already a Preparação host, so no new domain is needed. The upstream repo has already changed owner once, which a pinned mirror absorbs. Hugging Face's download hosts also churn: a test run on 2026-09-30 needed `huggingface.co`, `cdn-lfs.huggingface.co` and the wildcard `*.hf.co` (the Xet storage hosts, such as `cas-bridge.xethub.hf.co`).
- **Cloud transcription is rejected.** It would break Nível 1's promise of free, local, no-account work, and it would send the Criadora's audio off her machine.

Considered and rejected:

- Keeping Hugging Face and only moving the download into the Preparação. The domain prompt would stay.
- `openai-whisper`, which downloads from Azure and needs Torch.
- A smaller model. Worse names and brands mean wrong Palavras-gatilho.

Costs:

- The Preparação grows by ~1.6 GB.
- The maintainer redistributes the model and refreshes the mirror by hand, with `scripts/espelhar-modelo.sh`.
- When a download is blocked in the cloud workspace, the Diretor explains how to add the Preparação's hosts to the allowlist in Settings → Capabilities (Configurações → Recursos). On a Team or Enterprise plan, an admin does it.

Builds on [0004](0004-installer-without-admin-rights.md).
