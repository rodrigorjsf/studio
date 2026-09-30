---
title: Texto do post
type: concept
updated: 2026-09-30
sources: [../sources/post-copy-and-hashtags-2026.md, ../sources/grilling-caderno-and-social-media-2026-09-30.md]
---

# Texto do post

The words she pastes into each app when posting — first line, text, hashtags and, for Shorts, the title. Built in ticket #44: the Social media persona (`plugin/estudio/agents/social-media.md`) writes it beside the Finalizador into `entrega/texto-do-post.md`, and the edicao skill shows it in the closing message, one ready-to-copy block per platform with the reminder to check each hashtag in the app (plus a line when `estado` says the reference is stale). It carries no Gate and `entregar` counts only MP4 and MOV, so the file never blocks the Entrega. It is not the burned-in caption (legenda). Rationale in ADR 0008; evidence in [the 2026 research](../sources/post-copy-and-hashtags-2026.md).

- **`texto-do-post` command** (`plugin/estudio/scripts/lib/texto-do-post.mjs`, `tests/texto-do-post.test.mjs`): reads the file against the Vídeo's Kit and returns `problemas` and `pronto`. One `## ` section per platform of the Kit (`## Reels`, `## TikTok`, `## Shorts`), no other; Instagram at most 5 hashtags, any platform at most 60; a Shorts section needs a `**Título:**` line of at most 100 characters without hashtags; no filler tag (`#fyp`, `#foryou`, `#viral`, `#explore`, `#reels`, `#trending`, …); a section needs text. It refuses with `no-texto`, `invalid-kit`, `unknown-projeto`, `unknown-video`. Only mechanical rules: claims, keyword and engagement bait are judged by the writer and, in ticket #45, the Revisor de plataforma. The Social media reruns it until it passes, three rounds at most.
- Platforms come from a new Kit field `plataformas`; existing Projetos default to Reels, TikTok and Shorts.
- Rules come from a dated reference bundled in the plugin (source label + `sourced:` date), with a warning past 6 months; no live web research.
- The Revisor de plataforma judges it and rejects only on official rules: Instagram's 5-hashtag cap, YouTube's 60-hashtag cutoff, engagement bait, `#fyp`-style filler, claims absent from the transcript, first line without a keyword.
- Marketing-sourced guidance (TikTok 3–5 hashtags, first line ≤ ~100 chars, Shorts title ~40 chars visible) steers the writer but never rejects.

See also [short-form 9:16 rules](short-form-9x16.md).
