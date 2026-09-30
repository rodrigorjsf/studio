# Grilling 2026-09-30: Caderno (feedback memory) and the Social media persona

Source request: `.git/run-spec/29-spec-offline-transcription-via-a-mirrore/pending-scope-request.md` (maintainer, pt-BR), raised during spec #29 and kept out of its scope.
Research: `raw/research/post-copy-and-hashtags-2026/findings.md`.
Recorded in: `CONTEXT.md` (Caderno, Elogio, Queixa, Solução, Social media, Texto do post, Rascunho de issue), ADR 0007, ADR 0008.

## Decisions

### Caderno

1. **Two layers.** The Estúdio's Caderno covers her and her computer; each Projeto's Caderno covers that domain. The Diretor picks the layer, defaulting to the Estúdio unless the entry is about that Projeto's content or brand.
2. **Name and sections.** Caderno, with Elogios / Queixas / Soluções. It is separate from Kit learnings (`aprendizados.json`), which change the Kit.
3. **Writing.** Any persona originates entries in its report; only the Diretor writes, through an `estudio.mjs` append command stamped with persona, Vídeo and date.
4. **Capture.** The Diretor detects Elogios and Queixas in her words, writes them, and tells her in one line.
5. **Conflicts.** A new Elogio or Queixa that contradicts an existing one: she chooses which stays. A Queixa that contradicts the Kit: the Diretor also offers a Kit learning, because the Caderno never changes the Kit.
6. **Reading.** The Diretor reads both Cadernos at session start. Every persona gets both paths and reads them with the Kit. No per-persona filtering.
7. **Size.** No cap or pruning for now.

### Issues on `rodrigorjsf/studio` (public, issues enabled)

8. **Potential bug:** a defect in the plugin itself (script failure or wrong refusal, installer, wrong skill instruction, wrong check). Environment problems are only a Solução. A Solução that works around plugin behaviour also yields a Rascunho de issue.
9. **Self-evolution:** the internal Crítico loop hits its 3-turn cap on the same code, or the same Solução or Queixa appears in 2 or more Vídeos. The affected persona proposes the process or skill it lacks; the Diretor drafts.
10. **Consent Gate.** Drafts are shown at the close, together with the Kit learnings, as one multi-select question. They are never automatic, whatever her Autonomia. They are sanitized first (no speech, names, brand or paths). With her yes: `gh` when authenticated, else a pre-filled GitHub link. Declined drafts stay in the Estúdio's `issues/`.

### Social media and Texto do post

11. **Persona:** Social media (Sonnet, medium effort). **Artifact:** Texto do post, written to `entrega/texto-do-post.md`, one section per platform. `entregar` only checks `.mp4`/`.mov`, so the `.md` file is safe there.
12. **Timing:** runs in parallel with the Finalizador, after Aprovado. No Gate. It is shown in the closing message, ready to copy, with a "check each hashtag in the app" note.
13. **Platforms:** a new Kit field `plataformas`, with a new Projeto Grilling question; existing Projetos default to all three (Reels, TikTok, Shorts).
14. **Inputs:** transcript, Plano, `video.md` (objective, CTA), Kit, Perfil, both Cadernos, Resumos Notion.
15. **Rules:** a dated reference bundled inside the plugin, with source labels and `sourced:` dates; a warning past 6 months; the maintainer refreshes it quarterly. No live web research.
16. **Crítico:** the Revisor de plataforma. It rejects only on official rules: Instagram 5-hashtag cap, YouTube's 60-hashtag cutoff, engagement bait, `#fyp`-style filler tags, claims not in the transcript, first line without a keyword. Marketing-sourced counts and lengths are guidance only.
17. **Older Vídeos:** she can ask for a Texto do post on a Vídeo already Entregue or Arquivado; its Status does not change.

## Premise corrected by research

The request suggested "hashtags for fyp". No platform states that `#fyp`/`#foryou`/`#viral`/`#explore` help. Instagram caps hashtags at 5 (2025-12-18), and Mosseri says hashtags do not raise reach. Distribution follows viewer behaviour; the post text mainly helps classification and search.
