# Rebuild the studio as gated personas

A professional video studio is a chain of about fifteen roles: makers, specialists, and critics who are deliberately separate from the makers. They pass versioned artifacts through a fixed set of approval gates. The most important gate is **picture lock**, which separates the creative loop with the client from parallel finishing work. The `rodrigorjsf/studio` repo already has half of this chain inside one "diretor de vídeo" persona: a locked master, word-timed triggers, and mandatory approval of `plano.md`, stills, and credit spend. It is missing the three things studios use to make quality repeatable across clients and jobs. The first is a **persisted brief**. The second is a **persisted brand kit**, one per creator "front". The third is a **review step whose critic is not the maker**. The Higgsfield-sponsored demo video shows the cost of each gap. The reference-image step, which the author calls "the 80/20 of the project", was redone from scratch for every project. The caption style changed between two runs of the same clip. A cut-off face shipped because only one frame was sampled. For short-form creators the primary deliverable should be **9:16 at 1080×1920**, with text inside a conservative safe box of roughly 900×1400, captions burned in, and a hook in the first 3 seconds. 16:9 should be a secondary composition, not the default the repo lists first today. The right package is a Claude Code plugin whose **entry skill is the director**. The director runs every human gate on the main thread, because subagents cannot call `AskUserQuestion` and workflows accept no input mid-run. Specialist and critic subagents do the work between gates. Brand kits and projects live in the user's workspace. Heavy dependencies live in `${CLAUDE_PLUGIN_DATA}`. The biggest risk is not technical: the users are burned-out solo creators who in practice answer a brief with one paragraph and approve a plan with "aprovado".

## Fifteen studio roles collapse into four families and one non-negotiable split

Studio approval authority runs upward: "the production company refers to the agency, the agency refers to the creative director, and the client has the final word" ([Mini Fridge Media](https://www.minifridgemedia.com/blog/video-production-workflow-agency-guide/)). The roles below are grouped under the four families this report was asked to use.

| Family | Role | What it decides or produces | Source |
|---|---|---|---|
| **Creative** | Creative Director | Creative strategy and vision; approves direction | [School of Motion](https://schoolofmotion.com/blog/motion-design-industry-roles-responsibilities) |
| | Art Director | "Visual road map" from strategy and brand; approves design | same |
| | Strategist | Platform fit, hooks, titles and thumbnails; post-publish variants | [vidIQ](https://vidiq.com/blog/post/youtube-jobs-content-creators/) |
| | Scriptwriter / copywriter | Script, outline, on-screen copy | same |
| **Execution** | Assistant Editor | Ingest, sync, logging, selects, stringouts | [Frame.io Workflow Guide](https://workflow.frame.io/guide/) |
| | Editor | Assembly → rough → fine cut | [Frame.io editing stages](https://workflow.frame.io/guide/editing-stages) |
| | Motion designer | Graphics built from scratch (vs the editor, who assembles footage) | [Moonb](https://www.moonb.io/blog/motion-designer-and-video-editor) |
| | Colorist, sound designer/mixer, captioner, thumbnail designer | Grade, mix at a loudness target, captions, click image | [The Green Shot](https://www.thegreenshot.io/uncategorized/post-production-workflow/) |
| **Evaluative** | CD/AD creative review; QC | Creative fit; technical compliance (loudness, captions, spelling, safe zones) | [Farmerswife](https://blog.farmerswife.com/post-production-scheduling-steps) |
| **Review / coordination** | Producer / account lead | Scope, budget, schedule, revision budget; **consolidates feedback** | [School of Motion](https://schoolofmotion.com/blog/motion-design-industry-roles-responsibilities), [Ivory Media](https://ivorymedia.com.au/how-to-brief-video-production-company/) |
| | Post supervisor | Coordinates post departments, versions, delivery | [Frame.io Insider](https://blog.frame.io/2020/01/27/post-production-supervisor/) |
| | Client | Final sign-off | [Mini Fridge Media](https://www.minifridgemedia.com/blog/video-production-workflow-agency-guide/) |

Small teams stack these hats. In a generalist setting one editor also manages assets, mixes audio, adds motion, and grades ([Noble Desktop](https://www.nobledesktop.com/careers/video-editor/job-description)). Wistia runs its whole in-house studio with five people ([Wistia](https://wistia.com/blog/behind-the-scenes-video-team)). For a solo creator the chain compresses to: **Director** (producer + CD + client liaison) → **Strategist** → **Writer** → **Assistant Editor** → **Editor/Motion** → **Finishing** (color, sound, captions) → **QC critic** → **Delivery**. Specialists join only when the format needs them; a screen recording, for example, needs no colorist. The one split never to compress is **critic versus maker**. Solo editors lose that independent check, and an agent system can add it back cheaply. The repo shows what happens without it. Its phase-5 checklist is a self-check by the same agent that built the edit ([guias/2-nivel-1-remotion.md](../../../guias/2-nivel-1-remotion.md)), and the demo's cut-off face got through anyway ([video 18:00](https://youtu.be/0I5AWAuPFj0?t=1080)).

The repo's single persona already wears most of these hats implicitly. Intake lives in the "Início de toda sessão" section of `CLAUDE.md`. The assistant-editor role is `ffprobe` plus `tools/transcrever.py` and `palavras.json`. Director and art director live in `plano.md` and guide 5. Motion design lives in `src/videos/<slug>/`. The generative artist and budget controller is guide 4. Finishing is the render and ffprobe validation. Two roles are absent. **Producer/intake persists nothing**: the brief is free text in chat. **No evaluator is independent** of the maker.

## Picture lock is the seam, and this repo starts already locked

The canonical chain is **brief → treatment → script (1–2 rounds) → storyboard (sign-off before production spend) → production → ingest → selects → assembly → rough → fine → client cut → picture lock → graphics/color/sound in parallel → captions → conform → QC → delivery → archive**. At agencies it takes **6–9 weeks, 4–6 of them in post** ([Mini Fridge Media](https://www.minifridgemedia.com/blog/video-production-workflow-agency-guide/)). At picture lock, "No cuts can be altered", and that is what lets color, sound and finishing start ([Frame.io](https://workflow.frame.io/guide/editing-stages)). Everything before lock is an ambiguous creative loop with the client. Everything after it is parallel, specialized, low-ambiguity work that can fan out.

This repo's first rule, `locked-final-cut`, forbids cutting, reordering, speeding up, or swapping the audio of the recorded master ([CLAUDE.md](../../../CLAUDE.md)). The master therefore arrives **already picture-locked**. The whole pre-lock loop (assembly, rough cut, fine cut) disappears, and the studio's editorial work becomes composition on top of the master. What stays is a short creative loop, **brief → plan → style stills**, followed by the parallel post-lock work: graphics, captions, generated B-roll, sound checks, and QC. There is one drift to fix. The demo author fed in a rough cut "with some silences, some pauses" ([video 09:00](https://youtu.be/0I5AWAuPFj0?t=540)), and the tool neither detects nor warns about that. The input contract needs an explicit check-and-warn step, or an optional pre-lock trim stage.

| Studio gate | Norm | Studio plugin equivalent |
|---|---|---|
| Brief signed | Before scripting ([Celtx](https://blog.celtx.com/how-to-write-a-creative-brief-video/)) | `briefing.md` approved (new) |
| Style frames / storyboard | Sign-off before spend ([Mini Fridge Media](https://www.minifridgemedia.com/blog/video-production-workflow-agency-guide/)) | `plano.md` + 2–3 labeled style stills |
| Rough / fine / client cut | **2–3 edit rounds**, round 1 internal first | Stills review, round-counted |
| Picture lock | Hard gate | The master itself (rule 1) |
| QC pass | Technical + editorial, before master delivery ([Farmerswife](https://blog.farmerswife.com/post-production-scheduling-steps)) | Independent QC critic on the render |
| Spend approval | Scope change needs written approval | Higgsfield credit estimate; stop at ~20% overrun |

Every gate has the same shape, so it should be one reusable primitive. A maker produces a versioned artifact. An internal critic reviews it **before** the user sees it, because agencies do internal review first. The notes are consolidated into one list, because one person consolidating feedback is what prevents endless rounds ([Ivory Media](https://ivorymedia.com.au/how-to-brief-video-production-company/)). The user decides, and a round counter increments. A round is "consolidated feedback and changes implemented with a new version delivered", and **2–3 rounds** is the contracted norm ([Bonsai](https://www.hellobonsai.com/contract-template/video-editing)). Changing concept, footage, or the number of versions is a scope change, not a revision ([Pixflow](https://pixflow.net/blog/freelance-video-editing-rates/)). Review tools add a useful fourth decision, **"approved with changes"**, which closes a round without another review cycle ([Ziflow](https://help.ziflow.com/en/articles/5809937-finishing-a-review-understanding-decisions-in-the-legacy-ziflow-viewer)). Naming review exports `_vNN` makes the version stack and the round count the same thing. Re-rendering after lock is cheap in Remotion, but it still invalidates captions, timing and QC downstream, so "locked" should survive as a state flag.

## The grilling interview asks once per brand and briefly per video

Published brief templates agree on about ten fields: background, objective, audience, key message, tone with references, channels, deliverables and specs, timeline, budget, and metrics ([StudioBinder](https://www.studiobinder.com/blog/best-creative-brief-template-video-agencies-free-download/), [Ziflow](https://www.ziflow.com/blog/video-brief-template), [Celtx](https://blog.celtx.com/how-to-write-a-creative-brief-video/)). Templates from 2025 add an **approval workflow** and **"3–5 clippable moments"** for repurposing ([Goldcast](https://www.goldcast.io/blog-post/video-creative-brief-template)). Creator-side briefs lean on a stable style guide plus **"three to five finished videos with timestamped notes"**, a statement of creative latitude, and revision limits that define "what counts as a revision, what counts as a new request" ([The Creator's Assistant](https://www.thecreatorsassistant.com/how-to-hire-youtube-video-editor)). Rights topics (music licensing, talent releases, ownership of AI-generated elements) usually sit in the contract, not the creative brief ([Minifridge Media, contracts](https://www.minifridgemedia.com/blog/video-production-contracts/)). An AI interview can merge the two.

The key design move is to split the catalogue. **Brand/stable** topics are asked once and stored in the kit. **Per-video** topics are asked each time. Every technical topic must also be translated into what it means under a locked master, because the repo cannot cut.

| Topic | Scope | What to ask | Meaning under `locked-final-cut` |
|---|---|---|---|
| Business, channel promise, audience | brand | Who, pain points, competitors | Unchanged |
| Objective, CTA, one message, clippable moments | per-video | Goal, CTA wording, must-say / must-avoid | Hooks and CTAs become overlays, never reordering |
| Tone and references | both | 3–5 references with *what to copy*, plus anti-references | Style stills before the build ([VMG Studios](https://blog.vmgstudios.com/animation-mood-boards-style-frames-storyboards)) |
| **Camera behavior** | brand | Punch-ins allowed? Strength, frequency, trigger | Scale/transform on the master layer. The repo already caps push-ins at 1.00→1.04 and punches at ≤1.12 ([guias/5](../../../guias/5-direcao-editorial.md)) |
| **Framing** | brand + per-setup | Face-safe rule; fixed or moving presenter | Face zone measured from **real frames across the whole clip**, not one sample |
| **Frames** | per-video | How often to sample | Sample densely whenever the presenter moves (the demo's lesson, [video 18:00](https://youtu.be/0I5AWAuPFj0?t=1080)) |
| **Screenshots** | per-video | Which spoken claims need a visual proof | Prints kept intact, highlighter exactly on the quoted phrase (rules 5 and 3) |
| **Image interaction** | brand | Zoom/pan on prints, Ken Burns direction and speed ([Umbrella Creators](https://umbrellacreators.com/resources/youtube-series-style-guide-template)) | Pan limit formula already in guide 5 |
| **Animations** | brand | Easing, entrance/exit style, intro/outro ≤2–3 s, one transition style ([Zelios](https://zelios.agency/brand-video-style-guide/)) | Motion tokens in the kit |
| **Pacing** | brand | Visual changes per minute, maximum hold, intensity | Becomes **overlay density**, measured from the creator's own past uploads ([Umbrella Creators](https://umbrellacreators.com/resources/youtube-series-style-guide-template)) |
| **Captions** | brand | Burned-in vs SRT, font, size, lines, highlight color, position | Stored spec; burned-in for social ([Haikai](https://www.haikai.media/post/corporate-video-delivery-specs-a-cheat-sheet-for-clients-who-commission-video)) |
| **Color** | brand | Palette in hex, LUT or reference grade, Rec 709 | Applied to overlays only; grading the master is out of scope |
| **Sound** | brand | Music genre/BPM, level under dialogue, ducking, SFX policy, sonic logo | Rule 1 plays the original audio once, so music and SFX are *added* layers, and loudness is **measured and reported**, not normalized |
| **Deliverables** | per-video | Formats, codec, file naming, overlays vs full MP4 | 9:16 MP4 primary; ProRes 4444 alpha overlays already supported |
| Rights, budget, deadline, approver | per-video | Music/stock licensing, credit budget, who signs off | Credit cap per video (the demo tip, [video 35:00](https://youtu.be/0I5AWAuPFj0?t=2100)) |

Two findings shape how this interview should feel. First, "offering three directions at once causes analysis paralysis" in motion-design practice ([School of Motion](https://schoolofmotion.com/blog/mood-board-tools-motion-graphics), a search summary). So the director should show at most two or three labeled options and order the interview as **tone → look → timeline**: mood, then style still, then `plano.md`. Second, the demo shows what a real creator actually does. He wrote one loose paragraph ending in "you have creative freedom", deliberately avoided a detailed per-second prompt, and approved with one word ([video 13:00–16:59](https://youtu.be/0I5AWAuPFj0?t=780)). The grilling must therefore be short by default. Once a kit exists, most per-video questions reduce to **"use the kit as is, or override X?"**

## A brand kit per front is the missing file the demo paid for twice

Practitioners describe a video style guide as the static brand book extended with motion, audio and pacing rules. It should **"lead with assets, not prose"**: LUTs, editable lower-thirds, and approved playlists do more work than written description ([Zelios](https://zelios.agency/brand-video-style-guide/)). Tools store the reusable part as a kit. Descript's Brand Studio holds fonts, colors, logos, layout packs, up to 500 media items, and a **glossary of transcription terms** ([Descript](https://help.descript.com/hc/en-us/articles/38106088202765-Brand-Studio)). Clipchamp copies kit assets into each project, so they survive even if the kit is disconnected later ([Microsoft Support](https://support.microsoft.com/en-us/topic/how-to-use-the-brand-kit-tool-in-clipchamp-e56bf921-7821-418d-9e8c-2e411a6a27ef)). Adobe distributes MOGRTs through libraries so "everyone always has access to the newest version… and only the newest ones" ([Frame.io Insider](https://blog.frame.io/2023/05/15/smooth-mogrt-workflows/)). OpusClip Brand Templates and FireRed-OpenStoryline's saved "Style Skill" do the same for agentic editors ([OpusClip](https://www.opus.pro/brand-templates), [FireRed-OpenStoryline](https://github.com/FireRedTeam/FireRed-OpenStoryline)). Descript users also complain that its AI does not default to their stored layout pack ([Descript Canny](https://descript.canny.io/feature-requests/p/problems-with-new-underlord-ai-features)). **Loading the kit has to be enforced, not merely available.**

The repo already has the right concept but no file for it. Guide 5 separates "identidade permanente" from a per-video "dialeto", yet stores neither outside each video's plan ([guias/5-direcao-editorial.md](../../../guias/5-direcao-editorial.md)). The example plan notes that an end screen and like animation "não existem no canal como asset" ([projetos/000. exemplo/plano.md](../../../projetos/000.%20exemplo/plano.md)). The demo shows the cost twice. The reference-image step was supplied anew for each project ([video 21:00](https://youtu.be/0I5AWAuPFj0?t=1260)), and captions came out paper-style in one run and typewriter-style in the other, with the author preferring the first ([video 29:00–30:59](https://youtu.be/0I5AWAuPFj0?t=1740)). The recommended layout is one `marcas/<front>/` folder per creator front, for example the company account and the personal Instagram. Each holds files (logos, fonts, LUT, end card, sonic logo) and a machine-readable spec: color tokens, type scale, motion tokens, caption style, pacing target, default format, face-zone defaults per recording setup, credit budget, a do/don't list, and a transcription glossary for `transcrever.py`. Projects reference their front, and the director loads the kit before every plan.

Multi-project management follows the same principle. The repo's flat `projetos/NNN. slug/` numbering has no level above the video, and the demo had to copy the same video and prints into project `002` to try Level 2 ([video 24:00](https://youtu.be/0I5AWAuPFj0?t=1440)). Studio practice has three parts. The first is strict, unique file naming with ISO dates ([Frame.io file naming](https://workflow.frame.io/guide/file-naming)). The second is organization by client "with clear access boundaries" ([iconik](https://www.iconik.io/solution/agencies), a vendor claim). The third is metadata views instead of rigid folders ([Frame.io V4 Collections](https://blog.frame.io/2024/04/23/frame-io-v4-beta-metadata-collections/)). Frame.io's own status field has only three values: Needs Review, In Progress, Approved ([Frame.io Help](https://help.frame.io/en/articles/9101037-metadata-overview)). A synthesized status set for the plugin would be **Briefing → Planning → Building → Internal QC → Review (round N) → Changes requested → Approved → Delivered → Archived**, stored in each project's front matter so the director can list what is stuck across all fronts.

QC splits cleanly into two parts. **Technical QC** is automatable with the repo's existing toolchain:

- `ffprobe` for codec, resolution, fps, and duration against the master (±1 frame)
- `blackdetect` and `freezedetect`
- `ebur128` to measure integrated loudness and true peak

Photosensitivity is the most important duty-of-care check: a harmful flash is one above 3 Hz covering more than 25% of the screen ([Fora Soft on ITU-R BT.1702](https://www.forasoft.com/learn/ott/articles-ott/encoding-qc-mezzanine-workflow)). It has no ffmpeg equivalent and needs a dedicated tool or a flagged manual check. **Editorial QC** is where an independent critic earns its keep. It checks:

- on-screen spelling
- captions against the audio
- nothing appearing before it is said
- the face never covered
- text inside the platform safe zone
- brand tokens and logo applied correctly

Caption craft has published baselines: FCC accuracy, synchronicity, completeness and placement ([3Play Media](https://www.3playmedia.com/blog/fccs-new-quality-standards-closed-captioning-video-programming/)); 2×32-character frames at 99% spelling accuracy ([3Play on DCMP](https://www.3playmedia.com/blog/dcmp-closed-captioning-standards/)); and Netflix's 42 characters per line ([Netflix TTSG](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements)). Community-built coding-agent editors converge on a **render → inspect frames → fix** loop ([OpenEdit](https://github.com/veedstudio/open-edit), [premiere-agent](https://github.com/Kemerd/premiere-agent)). The plugin should run that loop as separate technical-QC, brand-guardian and platform critics that cannot approve their own maker's output. No existing tool found in the research does multi-persona review of video edits.

## Short-form rules are 9:16 first, hook in 3 seconds, safe box of roughly 900×1400

All three vertical surfaces converge on **9:16 at 1080×1920**. YouTube officially classifies vertical or square uploads of **up to 3 minutes** as Shorts, and those are monetizable from Dec 8, 2025 ([YouTube Help](https://support.google.com/youtube/answer/15424877?hl=en)). Instagram allows 3-minute Reels while saying it remains "focused on short form" ([dataslayer.ai](https://www.dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers), secondary reporting). The profile grid crops Reels to 3:4, so cover text belongs in the central 1080×1440 ([Hopper HQ](https://www.hopperhq.com/blog/instagram-reel-size/)). The repo's cardápio lists horizontal 16:9 first ([CLAUDE.md](../../../CLAUDE.md)). For this audience, **9:16 should be the default and 16:9 the secondary composition**, with split screens stacked top/bottom as guide 5 already prescribes.

The evidence behind the conventions varies, and the plugin should label each rule by its tier.

**Platform-backed rules:**
- introduce the proposition in the **first 3 seconds** (the first 6 s carry 90% of ad-recall impact)
- design for sound-on and sound-off with on-screen text
- keep motion and pace

These come from TikTok's ad guidance ([TikTok Ads Help](https://ads.tiktok.com/help/article/creative-best-practices)). Instagram ranks on watch time, sends per reach and likes per reach, and demands originality ([dataslayer.ai](https://www.dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers)). **Trial Reels** let a creator test a hook on non-followers before sharing it to followers ([Instagram Creators](https://creators.instagram.com/blog/instagram-trial-reels)), which makes them a natural post-delivery A/B step.

**Community-measured and conflicting:**
- **Safe-zone pixels.** No platform publishes official pixel specs for organic posts ([Postplanify](https://postplanify.com/blog/social-media-safe-zones-2026-complete-guide)), and the Reels figures range from a 310 px to a 430 px bottom margin. The pragmatic answer is a **universal ~900×1400 centered box** ([syllaby](https://syllaby.io/blog/aspect-ratios-safe-zones-shorts-reels-tiktok/)) with a right-side margin for the action icons. Guide 5's 9:16 row leaves ~250 px at the top and ~420 px at the bottom but specifies **no right margin**, so a TikTok or Reels icon column (84–120 px) can still cover text.
- **Loudness.** Only YouTube's ~−14 LUFS turn-down is well documented. Figures for Instagram and TikTok are vendor folklore ([Production Advice](https://productionadvice.co.uk/stats-for-nerds/), [OpusClip](https://www.opus.pro/blog/best-loudness-normalizers)).

**Folklore:**
- jump-cut cadence every 2–3 s
- punch-ins on every emphasis
- word-by-word "Hormozi" captions

These rest on the sourced principle that on-screen text helps, but no platform figure supports them. Pacing heuristics such as "a visual change every 15–25 s" come from long-form YouTube blogs and should not be applied to Shorts.

The pain points explain why the director has to *reduce* decisions, not add them. Burnout is well documented:

| Survey | Burnout rate | Caveat |
|---|---|---|
| Creators 4 Mental Health (North America) | **62%** | Sponsored partly by OpusClip ([Tubefilter](https://www.tubefilter.com/2025/11/12/creators-4-mental-health-burnout-study-results/)) |
| Billion Dollar Boy | **52%** | Creative fatigue is the top cause at 40% ([Billion Dollar Boy](https://www.billiondollarboy.com/news/over-half-of-creators-face-burnout)) |
| Vibely | 90% | Sample size undisclosed; treat as an upper bound ([ION](https://www.ion.co/90-percent-of-content-creators-report-experiencing-burnout-vibely)) |
| YouPix "Creators & Negócios" 2025 (Brazil) | **~53%** | Worst among creators earning up to R$2k/month, who act as "screenwriters, editors, presenters… and performance analysts" without support ([SEGS](https://www.segs.com.br/seguros/435618-mais-da-metade-dos-influenciadores-ja-sofreu-burnout-aponta-pesquisa)) |

An editor retainer averages **$1,206/month** ([CutJamm](https://www.cutjamm.com/blog/2025-video-editor-salary-survey-report)), which is out of reach for that low-income Brazilian segment. That justifies the free local Level 1. CapCut dominates this audience, and auto-captions are its most-used AI feature ([Net Influencer](https://www.netinfluencer.com/capcut-sees-surge-in-everyday-creator-use-in-2025-as-ai-tools-drive-editing-adoption/)), so burned-in captions are table stakes. The repo fork names the dominant risk itself: whether a gated pipeline adds steps a tired, non-technical creator will not tolerate ([PROJETO.md](../../../PROJETO.md)).

## Package it as a director skill that owns every gate, with subagents in between

The platform constraints decide the architecture:

- **`AskUserQuestion` is unavailable to subagents "in any configuration"** ([Subagents](https://code.claude.com/docs/en/sub-agents)).
- **Workflows have "no mid-run user input"**, so each stage between sign-offs has to be its own workflow ([Workflows](https://code.claude.com/docs/en/workflows.md)).
- **A plugin-root `CLAUDE.md` is not loaded as context** ([Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)).

So the repo's `CLAUDE.md` director persona has to become the **entry skill**, for example `/studio:dirigir`. It runs every gate on the main thread: brief, plan, stills, credit spend, final. It dispatches read-and-compute subagents that return results and never ask. The Higgsfield spend gate can be made deterministic with a `PreToolUse` hook on the MCP tools. The mapping from today's assets:

| Today | Plugin component |
|---|---|
| `CLAUDE.md` director + cardápio | Entry skill `dirigir` (portable frontmatter only if claude.ai upload is wanted) |
| New intake | Skill `briefing` (grilling; writes `briefing.md`) and skill `marca` (creates/edits `marcas/<front>/`) |
| `guias/1–5` | `references/` files inside the director and specialist skills (progressive disclosure) |
| `tools/transcrever.py`, `tools/hf_api.py` | `skills/<x>/scripts/`, called via inline `${CLAUDE_SKILL_DIR}` paths |
| Implicit roles | `agents/`: assistant-editor (watch + transcribe + frames), strategist, motion-builder, generative-artist, and **critics**: qc-tecnico, guardiao-da-marca, revisor-de-plataforma |
| `estilos/`, `src/_shared/`, `src/Root.tsx` | Workspace template the plugin scaffolds on first run |
| `npm run instalar`, faster-whisper, model weights | `SessionStart` hook installing into `${CLAUDE_PLUGIN_DATA}` |
| Level 2 MCP | Remote `https://mcp.higgsfield.ai/mcp` in `.mcp.json`; API key as `userConfig` `sensitive` |

Four mechanics can bite. **`${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are not in the Bash tool's environment.** Skill bodies must write them inline so Claude Code substitutes the path. For the same reason, a sensitive `userConfig` key reaches hooks and MCP servers but **not** a Python script Claude runs through Bash, so path B's `HF_KEY` needs a hook or MCP shim, or it stays an environment variable ([Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)). **User data must not live in the plugin.** The root directory is replaced on every update, and `${CLAUDE_PLUGIN_DATA}` is deleted on the last uninstall, so brand kits, projects and deliverables belong in the user's workspace folder ([Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)). A top-level `bin/` makes claude.ai and Cowork refuse the plugin. Remotion's `node_modules` cannot ship inside a plugin capped at 200 MB and 5,000 files ([Platform support](https://claude.com/docs/plugins/platform-support)).

The target surface is **Claude Code**: the CLI, or the Desktop Code tab in a *local* session. The demo used exactly this, and Remotion, ffmpeg and faster-whisper need the host toolchain. Cowork loads skills, agents, hooks and local MCP servers, but it runs code in an isolated VM whose preinstalled runtimes are undocumented, so rendering there is unverified. claude.ai chat loads only skills and remote MCP servers ([Platform support](https://claude.com/docs/plugins/platform-support)). One caveat applies to this maintainer's environment specifically: **plugins are not available in Desktop sessions running in WSL** ([Desktop](https://code.claude.com/docs/en/desktop.md)). Development in WSL2 should use the CLI; Windows- and Mac-native end users are unaffected. Distribution to non-technical creators is easiest through a GitHub marketplace added via **Customize → Plugins → Add marketplace**, which also syncs the plugin into Claude Code ([Cowork plugins](https://claude.com/docs/cowork/guide/plugins)). That replaces the demo's "clone the repo and read the README first" install ritual ([video 05:00](https://youtu.be/0I5AWAuPFj0?t=300)).

The demo itself is one Higgsfield-sponsored run on a single ~1:50 clip. Level 1 took ~20 minutes and ~230k tokens. Level 2 took ~50 minutes, ~420k tokens and 97 credits ([video 23:00–32:59](https://youtu.be/0I5AWAuPFj0?t=1380)). That makes it one data point, not a benchmark. It does show that cost and latency differ enough to state them in the plan before approval.

## Conclusion

The studio model tells you where *not* to add ceremony as much as where to add it. Because this repo starts from a locked master, the whole pre-lock editorial loop, the most expensive part of real post-production, simply does not exist here. The gates worth adding are the cheap ones studios use to prevent rework: a brief captured once, a brand kit that is enforced rather than merely offered, and a critic that is not the author. These gates cost the creator almost nothing when the kit answers most questions and the critic runs before the creator ever sees a still. The demo's two visible failures, a cropped face and caption drift, are precisely the class of error each one prevents.

The open question is behavioral, not technical. The evidence says creators are exhausted and approve plans with one word. So the plugin's success metric should be **how few questions it asks per video once a front's kit exists**, not how many personas it runs. A reasonable target is that the second video for a front needs only an override question and two approvals. That is also the hypothesis to test first with a real creator, before building every critic.
