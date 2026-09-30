# Archive

Upstream material kept for reference only. Nothing here ships in the plugin or runs in the studio.

| File | What it was | Why it is archived |
|---|---|---|
| `hf_api.py` | The upstream Higgsfield Cloud API client ("caminho B"), authenticated by the `HF_KEY` / `HF_API_KEY` + `HF_API_SECRET` environment variables. | ADR 0002 dropped the API-key path: the Criadora reaches Higgsfield only through its official connector, logged in with her own account. `scripts/check-plugin.mjs` rejects a package that names this script or its variables. |
