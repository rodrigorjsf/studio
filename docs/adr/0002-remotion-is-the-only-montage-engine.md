# Remotion is the montage engine for both Níveis; Higgsfield is an asset source

Nível 2 composes the final video in Remotion, locally, exactly like Nível 1; Higgsfield (through its official connector, logged in with the Criadora's account) only generates images and video clips. The upstream repo montaged Nível 2 in Higgsfield's cloud editor (Higgsedit); we moved away from that so one engine, one set of Críticos and one set of rules cover every Vídeo. Higgsedit is still used when the Criadora explicitly asks for one of its exclusive features, behind its own cost Gate.

## Considered Options

- Higgsedit montage for Nível 2 (upstream): rejected as default — a second engine, cloud render time limits, and Críticos that cannot inspect the same artifacts.
- Higgsfield Cloud API with an API key (`tools/hf_api.py`, upstream "caminho B"): rejected for v1 — the Criadora is non-technical, the key would live in an environment variable she cannot set, and plugin sensitive config does not reach Bash-run scripts.
