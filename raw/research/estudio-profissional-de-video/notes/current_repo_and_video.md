# Current "studio" repo and its demo video, plus comparable AI video-editing agents

Scope note: the video transcript was obtained (YouTube auto-captions, pt) with `uvx yt-dlp --skip-download --write-auto-subs` on 2026-09-29 and saved next to this file:
- `transcript/transcript_pt_por_minuto.md` (grouped per minute, readable), `transcript/transcript_pt.txt` (deduped cue lines), `transcript/video.pt-orig.vtt` (raw), `transcript/video.description`, `transcript/meta.txt`.
- Captions are auto-generated: proper nouns are garbled ("Cloud" = Claude, "Oppul/OPO 5" = Opus 5.5, "Higsfield/Rickfield/Hixfield" = Higgsfield). Timestamps below are `mm:ss` minute buckets from that file. The video itself (visuals) was NOT watched; only the speech is known.
- Video metadata: "Opus 5.5 Editando Vídeo: Remotion Grátis x Higgsfield no Mesmo Vídeo", channel Macks Wendhell | Inteligência Aplicada, published 2026-09-27, 36:40 long, marked "Vídeo em parceria com a Higgsfield" (sponsored) — [video](https://youtu.be/0I5AWAuPFj0). Upstream repo created 2026-09-26, 10 stars / 4 forks at fetch time (`gh api repos/mackswendhell/studio`) — [upstream](https://github.com/mackswendhell/studio).
- Repo files were read only; nothing in the repo was modified (only this notes folder was written).

## 1. What does the demo video show (workflow, steps, what works / doesn't, limitations, tips)?

### Takeaway
The video is a sponsored side-by-side test: the same ~1:50 vertical talking-head clip edited twice by Claude Code (Opus 5.5, medium effort) using the repo — Level 1 (Remotion + watch, free, ~20 min, ~228–238k tokens) and Level 2 (Higgsfield MCP, ~50 min, ~420k tokens, 97 credits). The author's workflow is "drop raw video + reference prints in a project folder → loose natural-language brief with creative freedom → Claude writes a plan → user says 'aprovado' → Claude renders"; the author is not an editor and admits a demanding motion designer would spot flaws.

### Cited Findings
Chapters (from description): 00:00 intro, 01:11 setup (Claude Code, medium effort, free skills), 09:10 Level 1, 16:58 Level 1 result, 22:41 Level 2 connecting Higgsfield, 27:27 Level 2 result + cost, 31:19 side by side — [video description](https://youtu.be/0I5AWAuPFj0)

Setup and install
- Uses Claude Code inside Claude Desktop (not chat/Cowork), picks an empty desktop folder containing only one video, trusts the directory — [video 02:00–02:59](https://youtu.be/0I5AWAuPFj0?t=120)
- Recommends Opus 5.5 at **medium effort** as best cost/benefit; says high/extra-high barely improves results at much higher cost — [video 01:00–02:00](https://youtu.be/0I5AWAuPFj0?t=60)
- Two free skills: Remotion best practices ("more than 300 effects… transitions", he ships a manual of possibilities) and watch ("the eyes" — transcribes local/YouTube video and extracts frames at configurable intervals, e.g. every 4/8/16 s or every second; cost is cents because it's scripts, not LLM work) — [video 03:00–05:00](https://youtu.be/0I5AWAuPFj0?t=180)
- Install tip: ask Claude to clone the repo **and read the README first**, because the README holds agent install instructions; then restart Claude so skills are recognised in a new session — [video 05:00–07:00](https://youtu.be/0I5AWAuPFj0?t=300)
- He built the repo because viewers of his previous video "got stuck configuring the CLAUDE.md" — [video 20:00](https://youtu.be/0I5AWAuPFj0?t=1200)
- Repo is MIT, forkable and commercially usable — [video 05:00](https://youtu.be/0I5AWAuPFj0?t=300)

Level 1 run
- One folder per video under `projetos/`, finals appear in `edicoes/`, code in `src/`; CLAUDE.md is "the brain" read at the start of every project — [video 07:00–08:59](https://youtu.be/0I5AWAuPFj0?t=420)
- His raw video "has some silences, some pauses… a rough cut" (contrasts with the repo contract that input must be already cut, see Q2) — [video 09:00](https://youtu.be/0I5AWAuPFj0?t=540)
- First message triggers the `AskUserQuestion` level picker from CLAUDE.md; after choosing Level 1 Claude immediately starts transcription (faster-whisper Python script) in background and asks for the brief meanwhile — [video 09:00–10:59](https://youtu.be/0I5AWAuPFj0?t=540)
- Transcription auto-corrected "cloud" → Claude from context — [video 11:00](https://youtu.be/0I5AWAuPFj0?t=660)
- Claude proactively listed **which prints were missing**; he dropped them into `prints/` — [video 12:00](https://youtu.be/0I5AWAuPFj0?t=720)
- Frames are not extracted automatically; he tells Claude to take **a single frame** because his position is fixed — [video 12:00–13:59](https://youtu.be/0I5AWAuPFj0?t=720)
- Style via **reference images** (paper-cut collage found online + a print of the Opus launch identity), not verbal description — [video 11:00, 13:00](https://youtu.be/0I5AWAuPFj0?t=660)
- Brief is loose on purpose (full screen / split screen / illustrations, light transitions, face in a small card…), ending with "these are my general instructions but don't restrict yourself… you have creative freedom"; he explicitly avoids a per-second metaprompt — [video 13:00–15:00](https://youtu.be/0I5AWAuPFj0?t=780)
- Plan produced in ~2 min: scene per numbered segment (camera, news/print, split "aula", b-roll), identified hook → CTA short-form structure. He approves by typing "aprovado"; "if I wanted to change something, this is the moment" — [video 15:00–16:59](https://youtu.be/0I5AWAuPFj0?t=900)
- Full Level 1 edit took ~20 min; Claude generated stills and corrected out-of-frame issues during the process ("storyboard" frames saved in `edicoes/`) — [video 16:00–18:00](https://youtu.be/0I5AWAuPFj0?t=960)
- Claude added animated captions without being asked; installed a font package mid-process — [video 18:00, 33:00](https://youtu.be/0I5AWAuPFj0?t=1080)
- Session used ~228k tokens (~23% of the 1M context) for a 2-min video — [video 23:00](https://youtu.be/0I5AWAuPFj0?t=1380)

What worked / didn't (Level 1)
- Flaw: at one point his face/frame was cut off on the right; cause attributed to sampling only one/a few frames — tip: "ask for all frames at the initial stage" if you move or have different scenes — [video 18:00–19:59](https://youtu.be/0I5AWAuPFj0?t=1080)
- "The 80/20 of the project" is the initial visual reference step — [video 21:00](https://youtu.be/0I5AWAuPFj0?t=1260)
- Honest caveat: some things "look a bit off" to a demanding After Effects editor, but far beyond what he could do himself — [video 21:00–22:59](https://youtu.be/0I5AWAuPFj0?t=1260)
- Because everything is code, "I change anything later without redoing everything" (spoken inside the edited video) — [video 20:00](https://youtu.be/0I5AWAuPFj0?t=1200)

Level 2 run
- Connect Higgsfield via Claude Desktop → Personalizar → Conectores → search Higgsfield → OAuth; then ask Claude to confirm the MCP is available in the session — [video 23:00–24:59](https://youtu.be/0I5AWAuPFj0?t=1380)
- New project folder `002` with the same video and prints; a shorter brief ("you have the whole platform in hand"); if the prompt already says the level, Claude skips the AskUserQuestion — [video 24:00–26:59](https://youtu.be/0I5AWAuPFj0?t=1440)
- ~50 min for a 1:50 video; time dominated by waiting loops on Higgsfield generation; ~420k tokens; 3000 → 2906 credits (he later says 97 credits) — [video 27:00–28:59, 32:00](https://youtu.be/0I5AWAuPFj0?t=1620)
- Liked: paper-cut objects recreated from his own set (lamp, desk, MacBook), "Thanos" disintegration effect, jitter on elements; disliked: caption style looked "typewriter", preferred Level 1 captions; Level 2 did everything in Higgsfield and did **not** use Remotion overlays because he didn't ask — [video 29:00–32:59](https://youtu.be/0I5AWAuPFj0?t=1740)
- Tip: you can put a **credit budget per video** in the prompt (e.g., for 20 videos/week), and more inserts = more credits — [video 35:00](https://youtu.be/0I5AWAuPFj0?t=2100)
- Whole video used <40% of his daily session limit (Pro/plan) — [video 34:00](https://youtu.be/0I5AWAuPFj0?t=2040)
- Framing: "Claude Code is the director, watch the eyes, Remotion the hand, Higgsfield the imagination" — [video 31:00](https://youtu.be/0I5AWAuPFj0?t=1860)

### Inferences
- The only human gates actually exercised in the video were: level choice, dropping prints, one free-text brief, and a one-word plan approval. The "stills review before render" gate in CLAUDE.md was not visibly used — he watched the final MP4 and critiqued afterwards.
- Both failures observed (cut-off face, disliked captions) are the kind a structured QA/review step or a stored brand caption spec would have caught; the style was carried entirely by ad-hoc reference images per project.
- The content is a sponsored promo; claims about cost/quality are one data point on one 2-min clip.

### Gaps
- Visual quality could not be judged (only captions read, video not watched).
- Whether the author iterated after the final render (revision loop) is not shown.
- Auto-captions may mis-render numbers (228k vs 238k tokens both appear).

## 2. What is the repo's current workflow, and which steps, approval points and roles are implicit?

### Takeaway
The repo is a CLAUDE.md-driven single-agent "video director" persona with a fixed 6-phase pipeline (organize → watch/transcribe → plan → build → review stills → render/deliver), three mandatory approvals (plan, stills, credit cost), strong hard rules (locked-final-cut, word-level timing, face-safe zones), and two engines (Remotion local / Higgsfield MCP or Cloud API). Everything else — briefing, identity, multiple roles — is implicit and lives in one conversation and one `plano.md` per video.

### Cited Findings
Session start and roles
- CLAUDE.md makes Claude the "diretor de vídeo" for a possibly never-edited-before user; first reply asks Level 1 vs 2 via `AskUserQuestion`, then reads level guides, silently checks prerequisites (node_modules, faster_whisper, skills; ffmpeg/node/python; Higgsfield `balance`), lists `projetos/`, presents a "cardápio" (deliverable, format, style, intensity, resources, excerpt) — [CLAUDE.md](/home/rodrigo/Workspace/studio/CLAUDE.md)
- Posture: proactive, jargon-free, "one decision at a time" and assume sensible defaults stating which; proactively name missing prints; propose 2–3 directions after watching — [CLAUDE.md](/home/rodrigo/Workspace/studio/CLAUDE.md)
- Mandatory approvals: `plano.md` before coding/generating; review stills before final render; Level 2 credit cost before generation; stop if spend exceeds ~20% of estimate — [CLAUDE.md](/home/rodrigo/Workspace/studio/CLAUDE.md), [guias/4-nivel-2-higgsfield.md](/home/rodrigo/Workspace/studio/guias/4-nivel-2-higgsfield.md)

Pipeline (Level 1) — [guias/2-nivel-1-remotion.md](/home/rodrigo/Workspace/studio/guias/2-nivel-1-remotion.md)
1. Organize: `projetos/NNN. slug/`, `ffprobe` metadata at top of `plano.md`, create `edicoes/NNN. slug/`.
2. Watch + transcribe: watch skill (`--detail balanced --max-frames 60`) for framing/face/background; `tools/transcrever.py` (faster-whisper `large-v3-turbo`, CUDA→CPU fallback) → `palavras.json` `{w,s,e}` + `transcript.md`; fix proper nouns without touching timing — also [tools/transcrever.py](/home/rodrigo/Workspace/studio/tools/transcrever.py)
3. Plan (approval): reading of the video, style + intensity, chosen/excluded scenes, energy curve, macro block map for >3 min, timeline table `# | início–fim | cena | entrada | gatilho (palavra @ tempo) | visual | print`, face zone from real frames.
4. Code: `src/videos/<slug>/`, registered in `src/Root.tsx`; one continuous `<Video>` of the master; splits must use `src/_shared/synchronized-split.tsx` (enforced by `scripts/check-split-layouts.mjs` in `npm run typecheck`); `useCurrentFrame()` only; `<Sequence premountFor={fps}>`; avoid `TransitionSeries` on master.
5. Review (approval): typecheck, stills at start/middle/end of each layout change, self-check (face covered? legible? black border? print cut? highlighter placed?) then show user.
6. Render (h264 crf 17 MP4, or ProRes 4444 alpha overlays), ffprobe validation (duration = master ±1 frame, one audio track), report, delete only own intermediates.

Level 2 — [guias/4-nivel-2-higgsfield.md](/home/rodrigo/Workspace/studio/guias/4-nivel-2-higgsfield.md)
- Path A: official MCP `https://mcp.higgsfield.ai/mcp` (OAuth, no API key) → batch images, contact-sheet review, animate, download to `hf/`, assemble in Higgsedit via `sandbox_exec` (15-min sandbox limit, render by `--range` chunks), `higgsedit sheet` review, volume check with `volumedetect`, report credits spent.
- Path B: Higgsfield Cloud API key via `tools/hf_api.py` (env `HF_KEY`), no Higgsedit; assembly in Remotion.
- Model/cost table (e.g., `nano_banana_pro` 2 cr; `kling3_0` ~1.75 cr/s; `seedance_2_0` ~9 cr/s; `veo3_1` 22 cr/8 s) and a "paper-cut" preset with color tokens and fonts (Newsreader/Inter/JetBrains Mono) plus prompt suffixes.

Editorial direction — [guias/5-direcao-editorial.md](/home/rodrigo/Workspace/studio/guias/5-direcao-editorial.md)
- Scene vocabulary: `camera`, `camera-enfase`, `camera-motion`, `camera-espaco`, `aula` (70/30), `demo`, `cena`, `broll`, `transformacao`; speech→visual mapping table; motion numbers (push-in 1.00→1.04, punch ≤1.12, layout change 0.9–1.2 s, fades 10–14 frames, pan limit formula); formats 16:9 / 9:16 (safe areas ~250 px top, ~420 px bottom) / 1:1 / 4:5.
- Identity is split into three layers: permanent identity (clarity, sync, mobile legibility), per-video "dialect" (palette, fonts, texture, density; choose from gallery or bring references in `prints/`), and scene direction — but there is no file where a creator's permanent brand is stored.
- Fixed quality rules: word timing, face-free, mobile legibility, no text in AI images, numbers as spoken, intact prints.

Example plan — [projetos/000. exemplo/plano.md](/home/rodrigo/Workspace/studio/projetos/000.%20exemplo/plano.md) (137 lines, a real 12:19 Level 2 news video): block map, "orientações recebidas" (moderate, zoom ≤1.08, 400–500 credit budget), name corrections, used/excluded resources with reasons, dialect with hex colors, energy curve, face zone in pixels, timeline table.

Style gallery — [estilos/README.md](/home/rodrigo/Workspace/studio/estilos/README.md): 5 runnable Remotion examples in `src/estilos/` (Minimal suíço, Terminal técnico, 3 verticals) + reference images from the original "Editoria" projects.

Other repo facts
- `projetos/` is gitignored except `000. exemplo/`; it is also Remotion's public dir (`staticFile('<NNN. slug>/…')`) — [projetos/LEIA-ME.md](/home/rodrigo/Workspace/studio/projetos/LEIA-ME.md), [CLAUDE.md](/home/rodrigo/Workspace/studio/CLAUDE.md)
- `npm run instalar` installs npm deps, faster-whisper, `remotion-best-practices` skill (`npx skills add remotion-dev/skills`), and the watch plugin (`bradautomates/claude-video`); `.claude/settings.json` declares the watch marketplace/plugin — [scripts/instalar.mjs](/home/rodrigo/Workspace/studio/scripts/instalar.mjs), [.claude/settings.json](/home/rodrigo/Workspace/studio/.claude/settings.json)
- Upstream commit message: "Une os fluxos do Editoria (Remotion) e do Higgsfield num único repositório" — the repo merges two earlier private workflows — [upstream commits](https://github.com/mackswendhell/studio/commits/main)
- The fork adds only agent-skill config (issue tracker, triage labels, domain docs) plus untracked `PROJETO.md`/`ROADMAP.md`/`GLOSSARIO.md`/`estado/` describing the plugin idea: "personas em esteira, projetos com briefing próprio e um grilling antes de cada trabalho", for "criadoras solo" producing for more than one front (company, personal Instagram) — [PROJETO.md](/home/rodrigo/Workspace/studio/PROJETO.md), [GLOSSARIO.md](/home/rodrigo/Workspace/studio/GLOSSARIO.md)
- Dependency on the watch skill: supports detail levels transcript/efficient (≤50 frames)/balanced (≤100)/token-burner, transcription via WhisperX local, Groq, OpenAI or none; works only in Claude Code (not Chat/Cowork) — [bradautomates/claude-video](https://github.com/bradautomates/claude-video)

### Inferences
Implicit steps/roles (one agent wears all hats):

| Implicit role | Where it lives today | Output artifact |
|---|---|---|
| Producer / intake (level, project, deliverable, format) | CLAUDE.md "Início de toda sessão" + cardápio | none persisted (chat only) |
| Assistant editor / logger (ingest, ffprobe, transcription, frames) | guide phases 1–2 | `plano.md` header, `transcricao/`, `frames/` |
| Director / editor (scene choice, energy curve) | guide 5 + phase 3 | `plano.md` |
| Art director (style, dialect, palette) | guide 5 §8, gallery, `prints/` refs | section inside `plano.md` |
| Motion designer / developer | phase 4 | `src/videos/<slug>/`, `edit.jsx` |
| Generative artist + budget controller (L2) | guide 4 | `hf/`, credit estimate |
| QA / reviewer | phase 5 self-check list | `edicoes/.../stills/` |
| Finishing / delivery engineer | phase 6 | final MP4/MOV + ffprobe report |

- Approval gates are explicit (plan, stills, credits) but the **brief** is not a gate — it's free text in chat, and the video shows the approval can collapse to "aprovado".
- There is a doc/reality drift: the repo says input must be already cut (`locked-final-cut`), while the video author feeds a rough cut with silences; the tool does not detect/handle this.

### Gaps
- No evidence of how Level 2 Path A's Higgsedit references (`compose.md`, `failure-modes.md`) look; they come from the Higgsfield MCP at runtime, not the repo.
- `src/videos/` is empty in the fork, so no real Level 1 edit code was inspected.

## 3. What comparable agentic / AI video-editing tools exist, and what ideas are worth adopting?

### Takeaway
2026 has many "coding-agent as editor" projects (Remotion skills, OpenEdit, premiere-agent, OpenChatCut, FireRed-OpenStoryline) and SaaS agents (Descript Underlord, OpusClip Agent Opus). The recurring ideas worth adopting are: reusable **style/brand profiles saved as skills or templates**, a **render → inspect frames → fix** self-review loop, a **strategy proposal before cutting** gate, **editable output** (NLE XML / timeline) rather than only a flat MP4, and **multi-subagent pipelines** with named roles.

### Cited Findings
- Remotion officially documents prompting videos with coding agents (Claude Code, Codex, etc.) and ships Agent Skills installed via CLI; the docs focus on setup, not on brand, review or iteration practice — [Remotion: Prompting videos with coding agents](https://www.remotion.dev/docs/ai/coding-agents), [remotion-dev/skills](https://github.com/remotion-dev/skills), [Remotion Claude Code plugin](https://www.remotion.dev/docs/ai/claude-code-plugin)
- Community "claude-remotion-skill" encodes motion-design craft as hard rules plus a **mandatory render → inspect frames → fix → re-render loop** — [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) (sourced via search snippet)
- **OpenEdit** (VEED, Apache-2.0, ~1.3k stars): agent-driven, no-GUI pipeline for Claude Code/Codex/Gemini CLI — transcription (hosted, WhisperX, or custom JSON) → agent writes HTML compositions → frame-by-frame browser render → agent inspects frames and fixes → MP4, with code kept in `runs/`; style via reference images or brand books through Figma MCP, but no dedicated brand config — [veedstudio/open-edit](https://github.com/veedstudio/open-edit)
- **premiere-agent**: drop clips in a folder, run Claude/Codex; the agent inventories sources, **asks a few questions about intent**, preprocesses footage into three small text timelines, **proposes a strategy and waits for OK**, writes the cut, **self-evaluates every boundary**, and exports `cut.fcpxml` + `cut.xml` + `master.srt` for Premiere/Resolve/FCP — [Kemerd/premiere-agent](https://github.com/Kemerd/premiere-agent)
- **OpenChatCut**: local-first conversational editor where Claude Code/Codex read and edit a real multitrack timeline that stays editable; Agent Skills + MCP + Remotion rendering — [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut), [openchatcut.com blog](https://openchatcut.com/blog/ai-agent-video-editing)
- **FireRed-OpenStoryline** (~3.5k stars, updated 2026-04): LLM agent orchestrating nodes (media search, script, BGM/voiceover matching, conversational refinement); users can **save a complete editing workflow as a custom "Style Skill"** and re-apply it by swapping media; ships `create_profile_style_skill` and `default_editing_workflow_skill`; Claude Code project skills + MCP server — [FireRedTeam/FireRed-OpenStoryline](https://github.com/FireRedTeam/FireRed-OpenStoryline), [skills.sh listing](https://www.skills.sh/fireredteam/firered-openstoryline)
- **Descript Underlord**: agentic co-editor that chains requests (remove fillers, tighten pauses, captions, vertical clips) and shows edits for approval; captions can use brand colors/fonts; Business plan has "Brand Studio", though users complain the AI doesn't default to their brand layout pack — [Descript Underlord](https://www.descript.com/underlord), [Descript Canny feature request](https://descript.canny.io/feature-requests/p/problems-with-new-underlord-ai-features), [letscompareai summary](https://www.letscompareai.com/post/descript-underlord-update-faster-ai-video-editing-for-creators-in-2026) (secondary)
- **OpusClip**: Brand Templates apply fonts/colors/logos to every clip (Starter 1 template, Pro 2); ClipAnything 2.0 natural-language moment search; **Agent Opus** described as a squad of sub-agents for research, scripting, storyboarding, motion graphics, voiceover, avatars, editing, with a brand kit — [OpusClip Brand Templates](https://www.opus.pro/brand-templates), [mer.vin on Agent Opus](https://mer.vin/2026/07/agent-opus-explained-opusclip-end-to-end-ai-video-agent/) (secondary blog); independent test says ~40% of auto clips get discarded — [bigvu review](https://bigvu.tv/blog/opus-clip-tested-2026-where-ai-wins-40-percent-discard/)
- **Higgsfield MCP**: Claude picks the model, generates/edits images and video in-chat, reuses past assets, runs creative workflows — [Higgsfield blog](https://higgsfield.ai/blog/claude-higgsfield-mcp-creative-studio), [Higgsfield MCP](https://higgsfield.ai/mcp). A practitioner workflow (2026-08-03) adds human checkpoints: define audience/aspect → still concept → review composition & text safety → short motion draft → manual approval of export; keep brief, direction, revisions in one traceable thread and store final prompt + model per asset — [dev.to](https://dev.to/pointchecknote/claude-higgsfield-mcp-a-practical-video-workflow-with-human-checkpoints-3mnn)

### Inferences
Ideas worth adopting in the studio plugin:
1. **Persistent brand/style profile per creator/front** (like OpusClip Brand Templates, FireRed "Style Skill", Descript Brand Studio) — a file the director loads by default instead of re-deriving style from `prints/` every project; note Descript users' complaint that the agent ignores the stored brand, so loading must be enforced, not optional.
2. **Intake questions + strategy proposal gate** (premiere-agent) — formalize the brief as an artifact before `plano.md`.
3. **Automated render→inspect→fix loop** (claude-remotion-skill, OpenEdit) as a distinct reviewer step, which would have caught the cut-off face in the demo.
4. **Named sub-agent roles** (Agent Opus) → matches the fork's "personas em esteira" idea.
5. **Editable handoff** (FCPXML/EDL/SRT from premiere-agent; editable timeline from OpenChatCut) for creators who want to finish in their own NLE — the repo already has a partial version (ProRes overlays + timecode list).
6. **Asset provenance** (store prompt + model + cost per generated asset) for reuse across projects and budget control.

### Gaps
- Star counts and feature claims for community repos come from GitHub pages/search snippets on 2026-09-29; not independently tested.
- No evidence found of any tool that does **multi-persona review** (e.g., separate brand, audience, technical QA critics) on video edits specifically.
- Agent Opus sub-agent details come from a secondary blog, not OpusClip docs.

## 4. What gaps does the video/repo reveal for multi-project, briefing, brand identity and multi-persona review?

### Takeaway
The repo handles "many videos" but not "many clients/fronts": there is no persisted brief, no persisted brand identity, and a single agent both makes and judges the edit. These are exactly the gaps the fork's plugin idea targets.

### Cited Findings
- Multi-project: projects are flat numbered folders `projetos/NNN. slug/` mirrored in `edicoes/`; "new project = highest number + 1"; no grouping by client/brand/channel — [CLAUDE.md](/home/rodrigo/Workspace/studio/CLAUDE.md), [projetos/LEIA-ME.md](/home/rodrigo/Workspace/studio/projetos/LEIA-ME.md)
- In the demo, Level 2 required copying the same video and prints into a second project folder (`002`) — [video 24:00–25:59](https://youtu.be/0I5AWAuPFj0?t=1440)
- Briefing: orientations are free text given in chat and summarized in `plano.md` under "Orientações recebidas" — [guias/2-nivel-1-remotion.md](/home/rodrigo/Workspace/studio/guias/2-nivel-1-remotion.md), [projetos/000. exemplo/plano.md](/home/rodrigo/Workspace/studio/projetos/000.%20exemplo/plano.md); the author deliberately keeps briefs loose and grants "creative freedom" — [video 14:00–15:00](https://youtu.be/0I5AWAuPFj0?t=840)
- Brand identity: guide 5 §8 separates "identidade permanente" from per-video "dialeto" but stores neither outside the per-video plan; the only concrete token set is the Level 2 "papel recortado" preset in the guide — [guias/5-direcao-editorial.md](/home/rodrigo/Workspace/studio/guias/5-direcao-editorial.md), [guias/4-nivel-2-higgsfield.md](/home/rodrigo/Workspace/studio/guias/4-nivel-2-higgsfield.md)
- The author calls the visual reference step "the 80/20 of the project" and supplies it anew each time — [video 21:00](https://youtu.be/0I5AWAuPFj0?t=1260)
- Captions style changed between the two runs (black vs white, paper vs typewriter) and he preferred the first — no stored caption spec — [video 29:00–30:59](https://youtu.be/0I5AWAuPFj0?t=1740)
- Review: QA is a self-check by the same agent (phase 5 checklist) plus user approval of stills — [guias/2-nivel-1-remotion.md](/home/rodrigo/Workspace/studio/guias/2-nivel-1-remotion.md); in the demo, the face cut-off still shipped — [video 18:00](https://youtu.be/0I5AWAuPFj0?t=1080)
- Fork's own problem statement: each edit "recomeça do zero, sem briefing, identidade visual ou alinhamento técnico guardados"; goal: personas in a pipeline, projects with their own briefing, and a grilling before each job; dominant risk is solution risk (whether the pipeline adds steps for a tired non-technical creator) — [PROJETO.md](/home/rodrigo/Workspace/studio/PROJETO.md), [GLOSSARIO.md](/home/rodrigo/Workspace/studio/GLOSSARIO.md)

### Inferences
- **Multi-project gap:** need a level above the video — e.g. `marcas/<front>/` (brand kit, caption spec, recurring assets like logo/end card, default format, credit budget) with videos referencing it; today the example plan notes "tela final e animação de like… não existem no canal como asset", i.e., recurring assets have no home.
- **Briefing gap:** the brief should become a versioned artifact (`briefing.md`) produced by a short structured interview/grilling (audience, platform, goal/CTA, must-include, must-avoid, budget, deadline), approved before `plano.md`. Keep it short — the video shows the creator's natural behavior is a one-paragraph brief and a one-word approval, which is the solution risk flagged in PROJETO.md.
- **Brand identity gap:** persist the "identidade permanente" + default "dialeto" (tokens, fonts, caption style, logo usage, face-zone defaults per recording setup) so every project inherits it; the demo's caption inconsistency and repeated reference-image step are the concrete cost.
- **Multi-persona review gap:** add independent reviewers after stills (technical QA: face zone/borders/sync/duration; brand guardian: tokens/captions/logo; audience/platform reviewer: hook, safe areas, pacing) with the maker unable to self-approve — this mirrors premiere-agent's boundary self-evaluation and the render-inspect-fix loops, but splits the critic from the maker.
- **Input-contract gap:** the repo assumes an already-cut master, but the author records rough cuts with silences; an optional pre-step (silence/filler detection, as Underlord does) or an explicit check-and-warn would align doc and practice.
- **Cost/latency visibility:** Level 2 took 2.5× the time and ~1.8× tokens of Level 1; a plugin should surface expected duration/tokens/credits in the plan.

### Gaps
- No user research on whether creators (e.g., the fork owner's influencer friend) would tolerate extra gates; the video is a single expert-ish creator.
- No data on how the upstream author handles multiple clients/channels in private use.
