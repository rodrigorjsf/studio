# Opus 5.5 vs Sonnet 5.5: model and effort per persona

Research notes, accessed 2026-09-29. Goal: pick `model` + `effort` for each subagent persona of the
video-editing plugin, under the user's constraint: **Opus only at `medium`; Sonnet up to `xhigh`
(never `max`)**.

Source reliability, highest first:

1. **[PDF]**: text extracted locally from the system card PDFs, with page numbers. Verbatim.
2. **[doc]**: official docs pages fetched via WebFetch. Quotes are verbatim where marked with
   quotation marks.
3. **[3p]**: third-party sites. Treat as secondary.
4. **[unverified]**: search-snippet or blog claim not confirmed against a primary source.

Primary sources:

- Claude Opus 5.5 System Card, Sep 22 2026, 230 pp:
  https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf
- Claude Sonnet 5.5 System Card, Sep 28 2026, 148 pp:
  https://www-cdn.anthropic.com/870c8f525702625d2c62fc6dd04c857e3250bec1/Claude%20Sonnet%205.5%20System%20Card.pdf
  (via https://www.anthropic.com/claude-sonnet-5-5-system-card)
- Announcements: https://www.anthropic.com/claude-opus-5-5 (Sep 22 2026) and
  https://www.anthropic.com/claude-sonnet-5-5 (Sep 28 2026)
- Effort docs: https://platform.claude.com/docs/en/build-with-claude/effort
- Prompting guides:
  - https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
  - https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5
- What's new in Sonnet 5.5: https://platform.claude.com/docs/en/models/sonnet-5-5/whats-new-sonnet-5-5
- Claude Code docs: https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/model-config
- Artificial Analysis:
  - https://artificialanalysis.ai/models/releases/claude-opus-5-5
  - https://artificialanalysis.ai/models/releases/claude-sonnet-5-5
  - https://artificialanalysis.ai/articles/claude-sonnet-5-5
  - https://artificialanalysis.ai/articles/claude-opus-5-5

---

## Findings (cited)

### 1. The headline benchmarks are at `max` effort, a setting this plugin will never run

Both system cards state that the summary tables use max effort:

- **Opus card, Table 8.1.A (p.174) [PDF]:** "all Claude Opus 5.5 results use the following standard
  configuration: adaptive thinking at max effort ... Terminal-Bench 4.0 score is reported at xhigh
  effort."
- **Sonnet card, Table 8.1.A (p.109) [PDF]:** "all results use the following standard configuration:
  adaptive thinking at max effort."

Headline table, all at max unless noted [PDF, Sonnet card p.109 and Opus card p.174-175]:

| Benchmark | Sonnet 5.5 | Opus 5.5 | What it measures |
|---|---|---|---|
| SWE-bench Pro | 81.3 | 89.9 | real repo coding, multi-file diffs |
| SWE-bench Multilingual | 90.3 | 93.9 | coding across 9 languages |
| SWE-bench Multimodal | 54.3 | 61.4 | coding with screenshots/mockups (vision + code) |
| FrontierCode v1.1 Main | 46.2 (max) / 52.1 (xhigh) | 54.4 (max) / 54.6 (medium, its best) | mergeable diffs; out-of-scope changes penalized |
| DeepSWE v1.1 (long-horizon) | 71.0 | 74.2 | long-horizon SWE |
| Terminal-Bench 4.0 | 70.6 | 66.4 (xhigh) | terminal/CLI work (the only row Sonnet leads) |
| Terminal-Bench-Science 0.1 | 59.9 | 58.7 | scientific CLI workflows |
| FrontierSWE v2 | 61.9 | 62.3 | ~20h ultra-long-horizon tasks |
| OSWorld 2.1 partial/strict | 80.1 / 43.5 | 81.8 / 48.7 | computer use from screenshots |
| Toolathlon-Verified Pass@1 | 77.8 | 77.8 | 600+ tools, multi-step tool use |
| HLE no tools / with tools | 56.9 / 64.5 | 64.4 / 67.7 | hard reasoning / knowledge |
| GDPval-AA v2.1 (Elo) | 1844 | 1846 | professional deliverables |
| AA-Briefcase v1.1 (Elo) | 1811 | 1822 | long-horizon knowledge work |
| AutomationBench | 44.7 | 42.5 (Sonnet card) / 40.0 (Opus card) | Zapier workflow automation |

Notes:

- AutomationBench shows two different Opus values in the two cards (42.5 vs 40.0). Both are
  reported by Zapier, so the run conditions probably differ. Unresolved.
- Terminal-Bench, Opus card p.178 [PDF]: Opus "at max effort scores 64.8%, within noise of xhigh".
- Artificial Analysis reports Terminal-Bench 4.0 as Sonnet 64% vs Opus 60%
  (https://artificialanalysis.ai/articles/claude-sonnet-5-5) [3p]. That conflicts with Anthropic's
  70.6 / 66.4, probably because of a different harness. Use Anthropic's numbers and treat AA's as a
  cross-check only.

**Takeaway.** At max, Opus leads almost everywhere, with the largest gaps on SWE-bench Pro (+8.6)
and SWE-bench Multimodal (+7.1). Sonnet leads only on the Terminal-Bench family. **These numbers
do not describe the configurations the user can run.**

### 2. The only apples-to-apples data at the allowed settings

There are two sources with per-effort sweeps for both models.

**CursorBench 4.0** (agentic coding, measured independently by Cursor) [PDF, Sonnet card p.115;
Opus card p.179-180]:

| Setting | Score | Cost/task |
|---|---|---|
| Opus 5.5 `medium` | 52.5 | "about $3" |
| Opus 5.5 `high` / `xhigh` | 56.0 / 56.0 | ~$4 (high) |
| Opus 5.5 `max` | 57.8 | n/a |
| Sonnet 5.5 `medium` | 39.2 | not published |
| Sonnet 5.5 `high` | 47.8 | not published |
| Sonnet 5.5 `xhigh` | 53.1 | not published |
| Sonnet 5.5 `max` | 55.5 | not published |

**Artificial Analysis Intelligence Index** [3p]
(https://artificialanalysis.ai/models/releases/claude-opus-5-5 and `.../claude-sonnet-5-5`):

| Effort | Opus 5.5 | Sonnet 5.5 |
|---|---|---|
| low | 42 | not published |
| medium | 51 | 41 |
| high | 54 | 47 |
| xhigh | 56 | 52 |
| max | 58 | 56 |

Output speed (AA) [3p]:

- Opus: 73-92 tok/s.
- Sonnet: 84-138 tok/s.

The "$2.9" / "$1.5" figures on those AA pages are blended per-token prices, not cost per task.

**Conclusion that drives the table.** On quality, **Opus `medium` ≈ Sonnet `xhigh`**:

- CursorBench: 52.5 vs 53.1.
- AA index: 51 vs 52.

Sonnet at `medium` or `high` is clearly below Opus `medium`, by 5-13 points on both measures.

On cost, there is no published cost per task for Sonnet at `xhigh`, so Sonnet-xhigh cannot be
claimed to be cheaper than Opus-medium. What is known:

- Opus medium on CursorBench costs about $3 per task.
- Sonnet max uses about 193k output tokens per AA index task, about $7.60 per task
  (https://artificialanalysis.ai/articles/claude-sonnet-5-5) [3p].
- Sonnet xhigh uses "about 67% fewer output tokens than at max" on GDPval-AA and "about 61% fewer"
  on AA-Briefcase [PDF, Sonnet card p.133-134].

**Unit prices** (announcements [doc]):

| | Input / Output per 1M tokens | Cache read | Speed claim |
|---|---|---|---|
| Opus 5.5 | $4 / $20 | $0.20 | "more than 30 percent faster than Claude Opus 5" (prompting guide) |
| Sonnet 5.5 | $2 / $10 | $0.20 | "30%+ faster than Sonnet 5" |

### 3. Does Sonnet degrade at `max`? Only on one scope-sensitive benchmark

- **FrontierCode:** Sonnet scores **46.2 at max vs 52.1 at xhigh** (Main) and 59.1 vs 64.4
  (Extended) [PDF, Sonnet card p.111]. The launch page gives the cause: "code-review skill timeouts
  causing scope creep" (https://www.anthropic.com/claude-sonnet-5-5 [doc]). The benchmark "penalizes
  out-of-scope changes, even if they are high quality or helpful" [PDF p.111].
- **Everywhere else, Sonnet max ≥ xhigh:**
  - CursorBench: 55.5 vs 53.1.
  - GDPval-AA: 1844 vs 1725.
  - AA-Briefcase: 1811 vs 1746.
  - AA index: 56 vs 52.
- **Opus shows the same pattern.** FrontierCode peaks at **medium (54.6)**: "Scores decline above
  medium effort but mostly recover at max" [PDF, Opus card p.176]. CursorBench keeps climbing with
  effort instead.
- **The prompting guide explains why.** "At these levels [xhigh and max] the model is especially
  thorough. After it finishes a task, it can start its own rounds of review and verification,
  sometimes with subagents ... It can also make related fixes it noticed along the way." A
  stop-and-report instruction "cut session cost by about a third, with no change in quality" at max
  (Sonnet prompting guide, "Steer initiative and scope" [doc]).

**Verdict on the user's constraint.** "Sonnet degrades at max" is not a general fact. It holds on
scope-sensitive coding evaluations, and a plugin persona with a narrow brief is exactly that
setting. Likewise, "Opus only at medium" matches Opus's best FrontierCode setting and the official
Opus default. **The constraint is defensible for this plugin, so the table below respects it.**

### 4. Official effort guidance [doc, effort page + prompting guides]

**Defaults:**

- Opus 5.5 defaults to **`medium`** on the API, "Claude Opus 5.5 defaults to medium".
- Sonnet 5.5 defaults to `high` on the API.
- In **Claude Code, both Opus 5.5 and Sonnet 5.5 default to `medium`**: "Opus 5.5 and Sonnet 5.5
  default to `medium`" (code.claude.com/docs/en/model-config).

**Opus 5.5:**

- "in Anthropic's testing, Claude Opus 5.5 at `medium` matches or exceeds Claude Opus 5 at `high` on
  coding and knowledge-work evaluations, and on several coding evaluations `low` comes close to it
  at much lower cost."
- "Reserve `xhigh` and `max` for work where you've measured a quality gain."
- Adaptive thinking is always on and can't be disabled.

**Sonnet 5.5:**

- "For agentic coding and multistep tool use, start with `medium` for well-specified tasks and move
  to `high` for harder or longer ones ... Use `xhigh` or `max` only where your evals show a quality
  gain."
- The levels are recalibrated versus Sonnet 5.
- "For the hardest long-horizon work, an Opus model is the better choice."

**Positioning**, from the Sonnet launch page: "Where Opus 5.5 is built for complex work requiring
careful judgment, Sonnet 5.5 is strongest at well-scoped everyday tasks, fixing bugs, and creating
polished documents ... fast iteration on less complex tasks."

**Sonnet behavior at specific levels** that matters for unattended subagents (Sonnet prompting
guide [doc]):

- **At `low`, verification can be skipped.** "At `low`, it keeps its thinking short and can skip
  verifying a change." It "sometimes reports a change as done without running a check that
  exercises it." So QC, finisher, and measurement personas must not run at `low`.
- **At `low` and `medium`, it may stop early to check in.** "on long agentic tasks, it's more likely
  to stop and check in with the user before it finishes." A subagent that checks in simply returns
  early. The fix is `high`, or the guide's snippet: "Keep working until everything the user asked
  for is done, and only stop to ask when you can't go on without the user or before a risky step.
  ..."
- **At `xhigh`, it starts its own review rounds and may spawn reviewer subagents.** Add the
  stop-and-report snippet: "When the work the user asked for is done and its checks pass, stop and
  report. Don't start extra rounds of review or hardening on your own, and don't launch reviewer
  sub-agents unless the user asked for a review. ..."
- **For JSON output that needs reasoning** (for example, a pre-cut list), at `low`/`medium` it
  "often answers without thinking first". Add "Think the problem through before you answer." At
  `high` this "brings accuracy close to what the model reaches at `xhigh`".

**Opus 5.5 behavior** (Opus prompting guide [doc]): "some of those updates end the turn with text
rather than a tool call". The director should treat a text-only subagent return as possibly
incomplete and check it against a checklist.

### 5. Vision: tool access matters more than model choice

With a container plus crop tool, the two models are statistically tied:

- **Chartography** (max): Sonnet 61.6 no-tools / **90.2 with tools**; Opus 64.4 / **89.0**
  [PDF, Sonnet card p.125; Opus card p.200]. "With tools, Sonnet 5.5 is competitive with Claude
  Opus 5.5."
- **BenchCAD Vision2Code** (image → code, max): Sonnet 0.747 / **0.963**; Opus 0.730 / **0.962**
  [PDF, Sonnet card p.128].

Without tools, Opus leads:

- Chartography 64.4 vs 61.6.
- SWE-bench Multimodal (screenshots/mockups → code) 61.4 vs 54.3.
- The Opus guide [doc]: "even at its lowest effort setting it read values off dense charts more
  accurately than Claude Opus 5 did at its highest", and it is better at positional meaning
  ("which boxes an arrow connects ... what changed between two versions of a diagram").

**Sonnet guide [doc]:** "For charts, adding tools helps more than raising effort: in testing, with
tools at `high` effort, the model read charts more accurately than without tools at `max` effort,
at a fraction of the cost." For technical drawings, tools help "only from `high` effort up".

**Implication for this plugin:**

- The assistant editor (face zone) and brand guardian can use Sonnet if they have `Bash` plus
  Python/PIL/OpenCV (or ffmpeg) to crop, zoom, and measure frames.
- If they only "look" at images, Opus `medium` is the safer choice.

### 6. Claude Code frontmatter mechanics [doc, code.claude.com/docs/en/sub-agents]

**`model` field.** Quoted from the table: "`sonnet`, `opus`, `haiku`, `fable`, a full model ID such
as `claude-opus-5-5`, or `inherit`. When you omit it, Claude Code picks the model in the subagent
model order."

**`effort` field.** Quoted from the table: "Effort level when this subagent is active. Overrides
the session effort level. Default: inherits from session. Options: `low`, `medium`, `high`,
`xhigh`, `max`; available levels depend on the model."

**Plugin agents honor `effort` and `model`.** In the frontmatter table, four rows carry the note
"Ignored for plugin subagents": `permissionMode`, `mcpServers`, `hooks`, and `initialPrompt`. The
`effort` and `model` rows carry no such note. The separate Note block lists only three ignored
fields: "plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter
fields". The table adds `initialPrompt`.

**Consequence for the generative artist.** It cannot declare the Higgsfield MCP server in its own
frontmatter (`mcpServers` is ignored for plugin agents). It must rely on the session-level MCP
connection and list those tools in `tools`, or omit `tools` to inherit them.

**Model resolution order** ("Choose a model" section):

1. The per-invocation `model` parameter.
2. The frontmatter `model`.
3. The `CLAUDE_CODE_SUBAGENT_MODEL` environment variable.
4. The main conversation's model.

So **the director can silently override the table** by passing `model` when it spawns a persona.
Before v2.1.251, the environment variable took precedence.

**Family alias quirk.** "The main conversation's model belongs to that family: the subagent runs on
the main conversation's exact model." So `model: opus` under an Opus director inherits the
director's exact Opus version and suffix.

**Effort fallback** (model-config): "If you set a level the active model does not support, Claude
Code falls back to the highest supported level at or below the one you set."

**Aliases depend on the provider** (model-config table):

| Provider | `opus` | `sonnet` |
|---|---|---|
| Anthropic API | Opus 5.5 | Sonnet 5.5 |
| Claude Platform on AWS | Opus 5.5 | Sonnet 4.6 |
| Bedrock / Google Cloud | Opus 5.5 | **Sonnet 4.5** |
| Foundry | **Opus 4.6** | Sonnet 4.5 |

On Sonnet 4.6, `xhigh` falls back to `high`. Sonnet 4.5 is not in the effort table at all.
**Use full IDs (`claude-opus-5-5`, `claude-sonnet-5-5`) to pin the versions.** The cost is lower
portability: on Bedrock the ID is `anthropic.claude-sonnet-5-5`.

**Thinking can't be set per subagent.** "subagents also inherit the main conversation's extended
thinking configuration ... There is no per-subagent thinking setting."

**Always set `effort` explicitly**, including `effort: medium` on Opus personas. If it's omitted,
the persona inherits whatever the user set for the session, for example `/effort max`.

**Verify at runtime** with `/tasks`, which shows the model and effort per subagent
(v2.1.242+) [doc].

**Main thread (director).** Its effort is not set by agent frontmatter unless the director runs as
the session agent via `--agent`. It follows `/effort`, `CLAUDE_CODE_EFFORT_LEVEL`, settings
(`modelSettings`), or the model default. Opus 5.5 in Claude Code starts at `medium`, and a
top-level `effortLevel` in user settings "doesn't count for Opus 5.5" [doc, model-config].

---

## Per-persona recommendation table

How to read this table:

- "Opus" = `claude-opus-5-5` at `effort: medium`, always.
- "Sonnet" = `claude-sonnet-5-5` at `effort: high` or `xhigh`.
- The decision rule: Opus-medium ≈ Sonnet-xhigh on quality (Finding 2), and Sonnet
  `medium`/`high` is clearly below both. So each persona is either:
  - **routine and verifiable** → Sonnet `high` (cheap, fast, and `high` avoids the early check-ins
    and skipped verification seen at `low`/`medium`); or
  - **judgment/creative, or non-trivial code** → Opus `medium`.
- Sonnet `xhigh` is the stated alternative where Opus is recommended. It needs the stop-and-report
  snippet from Finding 4 in the persona prompt.

| # | Persona | Model | Effort | Rationale |
|---|---|---|---|---|
| 0 | Director (main thread) | Opus 5.5 | `medium` (set via `/effort` or `modelSettings`, not frontmatter) | Orchestration, plan approval, long-horizon judgment. The Sonnet guide says "For the hardest long-horizon work, an Opus model is the better choice." Opus medium is the official default and matches Opus 5 at high. Must treat a text-only subagent return as possibly incomplete (Opus guide). |
| 1 | Assistant editor (ffprobe, transcription, frame extraction, face zone) | Sonnet 5.5 | `high` | Mostly deterministic CLI work, and Sonnet leads Terminal-Bench 4.0 (70.6 vs 66.4). The face zone is vision, but with Bash + Python/OpenCV to crop and measure frames, Sonnet ≈ Opus (Chartography with tools 90.2 vs 89.0; BenchCAD 0.963 vs 0.962). `high` rather than `medium` avoids early check-ins and skipped verification. **Condition:** if the persona has no image-processing tools, use Opus `medium` (no-tools vision gap). |
| 2 | Pre-cut editor (silences, repeats from transcript) | Sonnet 5.5 | `high` | Well-scoped text analysis over `palavras.json`, the "well-scoped everyday tasks" profile. Output is a structured list, so add "Think the problem through before you answer." (at `high` this nears `xhigh` accuracy). Silences can be computed deterministically (ffmpeg silencedetect); the model judges repeats. |
| 3 | Scriptwriter-strategist (hooks, CTA, draft `plano.md`) | Opus 5.5 | `medium` | Creative judgment on the user-facing plan; one of the approval gates. The official positioning puts "complex work requiring careful judgment" on Opus. HLE with no tools, 64.4 vs 56.9 at max, suggests a reasoning/knowledge gap. Low volume (one plan per video), so the Opus cost is small. Alternative: Sonnet `xhigh`, which matches on GDPval-type work only at max, a setting that is excluded. |
| 4 | Art director (brand kit, 2-3 style stills, Remotion code) | Opus 5.5 | `medium` | Visual design + code from visual references is SWE-bench Multimodal territory, where Opus leads 61.4 vs 54.3 at max. Opus is better at positional/visual meaning. The Opus guide has explicit frontend-design steering, and the stills are a user approval gate. |
| 5 | Motion designer (non-trivial Remotion/React/TS) | Opus 5.5 | `medium` | The hardest code in the plugin. Opus medium: CursorBench 52.5 (vs Sonnet high 47.8). FrontierCode peaks at Opus **medium** (54.6), and that benchmark penalizes scope creep, which is exactly the risk in a locked-final-cut composition. SWE-bench Pro 89.9 vs 81.3 at max. Alternative: Sonnet `xhigh` (CursorBench 53.1, same quality band) plus the stop-and-report snippet. |
| 6 | Generative artist (image/video prompts, Higgsfield MCP calls) | Sonnet 5.5 | `high` | Prompt writing + tool calls. Toolathlon is a tie (77.8 vs 77.8). Spend is gated by the plan approved upstream. **Caveat:** credit-spending actions need a hard confirmation rule in the prompt. `mcpServers` in plugin-agent frontmatter is ignored, so the Higgsfield tools must come from the session. |
| 7 | Finisher (render, captions, ffprobe validation) | Sonnet 5.5 | `high` | Mechanical and verifiable. **Never `low`**, because Sonnet at low "can skip verifying a change". Add the guide's verification paragraph ("run a real check that exercises the change before reporting it done"). |
| 8 | Critic: technical QC (ffmpeg measurements) | Sonnet 5.5 | `high` | Measurement-driven (duration ±1 frame, loudness, codecs). Terminal-style work where Sonnet is strong. A critic must not skip checks, so `high`, not `medium`/`low`. |
| 9 | Critic: brand guardian (frames vs kit) | Sonnet 5.5 | `xhigh` | Subtle visual comparison. With crop/measure tools, Sonnet matches Opus on vision benchmarks. The Sonnet guide says tools on technical visuals help most "at `xhigh` and `max`". Add the stop-and-report snippet. **Condition:** without image tools, use Opus `medium`. |
| 10 | Critic: platform reviewer (safe zones, hook) | Sonnet 5.5 | `high` | Safe zones are geometric rules checkable against frames and specs. Judging the hook is lighter, with a checklist. If the user wants the hook critique to carry weight equal to the scriptwriter's, move it to Opus `medium`. |

**The user's all-Opus fallback.** "If every persona does complex work, all should be Opus medium."
That is a valid, simpler configuration: one model, one effort, and Opus medium is at least as good
as any allowed Sonnet setting on every published sweep.

The costs of going all-Opus:

- 2x the unit price ($4/$20 vs $2/$10).
- Slower output (AA: 73-92 vs 84-138 tok/s).
- A lead for Opus on the Terminal-Bench-style personas (1, 7, 8) that isn't there: Sonnet
  actually scores higher on Terminal-Bench 4.0.

**Recommended split:**

- Opus `medium` for 0, 3, 4, 5.
- Sonnet `high` for 1, 2, 6, 7, 8, 10.
- Sonnet `xhigh` for 9.

**Frontmatter shape**, for example `agents/motion-designer.md`:

```yaml
---
name: motion-designer
description: ...
model: claude-opus-5-5      # full ID pins the version; alias `opus` varies by provider
effort: medium              # always explicit; omitted = inherits session effort (could be max)
---
```

---

## Gaps

- **No cost per task for Sonnet 5.5 at `xhigh` or `high`** on any benchmark (Cursor's table and
  Cognition's files give tokens, not published costs). So "Sonnet-xhigh is cheaper than
  Opus-medium" is **unverified**. Sonnet xhigh uses 61-67% fewer output tokens than Sonnet max
  (GDPval/AA-Briefcase), but no direct comparison with Opus medium exists.
- **Almost no Opus `medium` numbers beyond CursorBench (52.5), FrontierCode (54.6), and the AA
  index (51).** SWE-bench Pro, Multimodal, OSWorld, and the vision evaluations are published only
  at max, or only as effort-sweep figures whose per-point values were not extracted as text.
  Figures 8.13.1.B/C in the Opus card and 8.13.1.B in the Sonnet card plot Chartography per effort,
  but the numbers are in images.
- **No video-specific benchmark.** Nothing measures frame-sequence understanding, face-zone
  detection, or Remotion/animation code. The persona mapping extrapolates from the SWE-bench
  Multimodal, Chartography, BenchCAD, OSWorld, and CursorBench proxies.
- **Sonnet `low` is missing from the AA Intelligence Index** (shown as "−").
- **AA Terminal-Bench figures (Sonnet 64 / Opus 60) conflict with Anthropic's (70.6 / 66.4).**
  Probably a harness difference. Not reconciled.
- **AutomationBench Opus value differs between the two system cards** (42.5 in the Sonnet card, 40.0
  in the Opus card).
- **The claim that "Sonnet max degrades" rests on one benchmark** (FrontierCode) and the launch-page
  footnote. Other evaluations show max ≥ xhigh. The user's cap is still reasonable for
  scope-sensitive persona work.
- **Plugin agents honoring `effort` is inferred from the docs table**, which marks four other
  fields as ignored and not `effort`. It has not been tested at runtime here. Verify with `/tasks`
  after installing the plugin.
- **Full-ID portability:** `claude-sonnet-5-5` works on the Anthropic API. On Bedrock the ID is
  `anthropic.claude-sonnet-5-5`, and it is not confirmed whether Claude Code maps the plain ID
  there.
- **The claude.com blog on model/effort** (https://claude.com/blog/claude-model-and-effort-level-in-claude-code,
  Jul 7 2026) covers Opus 4.8, not 5.5. It is not used as 5.5 guidance.
- **LMArena and the official SWE-bench leaderboard were not consulted.** Only the system cards'
  SWE-bench numbers are used.
- **Not in the primary sources, [unverified]:** third-party claims such as "Sonnet 5.5 costs up to
  30% less per task than its predecessor" are Anthropic's own claim versus Sonnet 5, not versus
  Opus 5.5.
