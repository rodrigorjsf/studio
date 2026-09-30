# Review/approval workflows, QC, and multi-client/multi-project management in professional video post-production

Research date: 2026-09-29. Around 20 tool calls. Each claim below cites a source inline. Where a spec comes from the platform itself, it is marked **[platform-reported]**. Where the community measured or reverse-engineered it, it is marked **[community-measured]**. Where a vendor makes a marketing claim, it is marked **[vendor claim]**.

## 1. How review tools structure review (Frame.io, Filestage, Ziflow, Vimeo, Wipster)

### Takeaway
All the major review tools share one core model. A **version stack** holds successive cuts of the same deliverable. **Time-coded comments** are anchored to a single frame or a frame range, with on-frame annotations. A **status or decision** is set per asset, or per reviewer per stage. **Reviewer groups/stages** can run in sequence (for example internal, then brand, then legal, then client), and a stage can open automatically when the previous one is approved. Frame.io's statuses are the simplest (3 default values). Proofing tools (Filestage, Ziflow) add per-reviewer decisions with an "approved with changes" middle state, plus audit/e-signature features.

### Cited Findings
- **Frame.io V4 comments.** Comments can be "single-frame", "range-based" and "anchored". Users can attach files and draw annotations. Share Links have configurable "Settings, Layout, Security, and Permissions" and custom branding (images/banners). There is also a "Comparison Viewer" for comparing uploads. — [Frame.io Help: Welcome to Frame.io](https://help.frame.io/en/articles/9090632-welcome-to-frame-io)
- **Frame.io V4 Status field.** The values are "Needs Review", "In Progress" and "Approved". Setting a status notifies project users. — [Frame.io Help (Legacy review links article, surfaced via search)](https://help.frame.io/en/articles/1161479-review-links-explained-for-clients-legacy); also [Frame.io Metadata Overview](https://help.frame.io/en/articles/9101037-metadata-overview)
- **Frame.io V4 metadata.** V4 ships about 32–33 out-of-the-box metadata Fields (e.g. Status, Date Uploaded). Custom Fields support text, select dropdowns, date pickers and toggles. "Collections" save a metadata filter configuration, so assets can be organized by metadata instead of a rigid folder tree. — [Frame.io blog: V4 Beta Feature Focus—Metadata & Collections (2024-04-23)](https://blog.frame.io/2024/04/23/frame-io-v4-beta-metadata-collections/)
- **Frame.io version stacks.** Every revision is logged in a version stack. Reviewers can toggle between versions for frame-accurate comparison. — [Frame.io V4 page](https://frame.io/v4) (via search summary; [vendor claim])
- **Frame.io inside the NLE.** In the Premiere Pro Frame.io panel, comments from Share-link reviewers populate in real time. Clicking a comment card jumps the playhead to that timeline moment. — [Frame.io Help: Premiere Frame.io V4 Comments Panel](https://help.frame.io/en/articles/9859849-adobe-premiere-frame-io-v4-comments-panel-overview)
- **Filestage decisions and statuses.**
  - Per-reviewer decisions are approve, approve with changes, request changes, or reject.
  - File statuses include "in review", "need changes" and "approved".
  - Reviewer groups form sequential approval steps (e.g. internal → brand → legal → client). Automations move a file to the next group when a step is approved.
  - Source: [Filestage blog: Document approval workflow](https://filestage.io/blog/document-review-and-approval/); [Filestage: Project workflow management](https://filestage.io/project-workflow-management/) ([vendor claim])
- **Filestage reviewer-group permissions.** These can be set per group:
  - download (separately per status "in review / need changes / approved")
  - commenting on/off (read-only mode)
  - email notifications
  - file upload by external contributors
  - anonymize reviewers from each other
  - password protection
  - limit access to invited reviewers (SSO/OTP)
  - "Require Verified Approval" (digital signatures meant to comply with FDA 21 CFR Part 11 / EU Annex 11)

  A "Request review decision" toggle controls whether reviewers see "Request changes"/"Approve" buttons (Business/Enterprise plans). — [Filestage Help: Manage reviewer permissions](https://help.filestage.io/en/articles/2787865-manage-reviewer-permissions-and-how-to-request-review-decisions)
- **Ziflow decisions and stages.**
  - Decisions include "Approved", "Approved with Changes" and "Changes Required".
  - A next stage can be triggered on Approved / Approved with Changes, on Changes Required, or when the stage deadline passes.
  - "Approved with changes" is meant for minor fixes that don't need a new version to be reviewed.
  - "Zibots" can check the status of multiple stages before starting the next one.
  - Sources: [Ziflow Help: flow starting a stage when multiple stages reach a decision](https://help.ziflow.com/hc/en-us/articles/30721932087828-Build-a-flow-that-starts-a-stage-when-multiple-stages-reach-a-decision-status); [Ziflow Help: Legacy viewer decisions](https://help.ziflow.com/en/articles/5809937-finishing-a-review-understanding-decisions-in-the-legacy-ziflow-viewer); [Ziflow blog: Content approval workflow: stages, roles & audit trails](https://www.ziflow.com/blog/content-approval-workflow) (search summaries; the "decision calculation" help page returned HTTP 403)
- **Frame.io Workflow Guide scope.** The guide runs to more than 100,000 words and covers every step of post (VFX, color, sound, delivery). It describes how files and information flow between roles. — [No Film School on the launch](https://nofilmschool.com/2018/12/frameio-launches-ultimate-post-workflow-guide-dec-11-1030eastern-embargo) (2018; older than the preferred window, but it is the canonical reference)

### Inferences
- A minimal status vocabulary used across tools is: *Needs review → In progress/Changes requested → Approved*. "Approved with changes" is a useful fourth state: it closes the round without a new review cycle, which helps contain revision creep.
- The **stage order** (internal QC → internal creative review → client → legal/brand) is a recurring pattern. Internal review happens *before* anything reaches the client.
- For a local/CLI tool, the Frame.io "Collections" idea means you can organize by metadata (client, status, format), not only by folders.

### Gaps
- Ziflow's decision-calculation rules (e.g. whether all reviewers or one decision-maker decides the stage) could not be read (HTTP 403).
- Vimeo Review and Wipster were **not researched** within the tool budget. No sourced details on their statuses or roles.
- Frame.io V4's exact reviewer permission levels (Reviewer/Commenter/Viewer etc.) were not confirmed from a primary page.

## 2. Standard QC checklists (technical vs editorial) and platform specs

### Takeaway
**Technical QC** is measurable and largely automatable:
- loudness and true peak
- legal video range and gamut
- black, flash, freeze and dead-pixel frames
- photosensitivity (PSE)
- codec, container, resolution, frame rate and duration
- caption format and timing

**Editorial QC** is human review of content: typos in on-screen text, correct names and logos, captions matching the dialogue, safe zones, and brand compliance. Broadcast/streaming specs (Netflix, EBU, ITU) are precise and published. Social-platform "specs" (LUFS targets, safe zones) are mostly **community-measured**, and sources disagree.

### Cited Findings — technical QC (reference rigor: broadcast/streaming)
- **Netflix sound mix.** The spec is **-27 LKFS ±2 LU, dialog-gated** (measured per ITU BS.1770-1), with **true peak ≤ -2 dBFS**. Netflix recommends setting true-peak limiters at -2.3 or lower. Titles within tolerance get no platform limiting. [platform-reported, via trade press] — [Production Expert: optimising a mix for Netflix](https://www.production-expert.com/production-expert-1/how-to-optimise-an-audio-mix-for-delivery-to-netflix); [Netflix Sound Mix Specifications v1.6 (partnerhelp)](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360001794307-Netflix-Sound-Mix-Specifications-Best-Practices-v1-6)
- **Netflix delivery validation.** IMF packages must pass **Photon**, Netflix's open-source IMF validator (SMPTE ST 2067), at upload. Netflix then runs internal Asset QC with QC operators worldwide. — [Medium/Venera: Netflix QC requirements](https://medium.com/@marketing.veneratech/delivering-to-netflix-qc-requirements-in-a-nutshell-and-how-to-comply-with-them-721b656a0662); [Netflix Partner Help: Secondary Video IMF Asset QC](https://partnerhelp.netflixstudios.com/hc/en-us/articles/4863295555219-Single-Package-Model-Secondary-Video-IMF-Asset-QC-Requests)
- **Automated video QC check categories.** These include Black Frames, Blockiness, Brightness, Cadence, Chroma Hits, Clipping, Colored Frames, Color Bars, Color Gamut, Combing, Credit Roll, Dead Pixels, Digital Hits, Field Dominance, **Flash Frames**, **Freeze Frames**, and more. — [Venera Pulsar automated file QC](https://www.veneratech.com/pulsar-automated-file-qc/) ([vendor claim])
- **Photosensitive epilepsy (PSE).** A harmful flash is a ≥20 cd/m² opposing luminance change covering >25% of the screen at a frequency above 3 Hz (ITU-R BT.1702). PSE is called the most important duty-of-care video check. — [Fora Soft: Encoding QC & mezzanine workflow](https://www.forasoft.com/learn/ott/articles-ott/encoding-qc-mezzanine-workflow); Netflix also publishes a branded-content guideline: [Netflix Photosensitivity Prevention Best Practice](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360058732874-Photosensitivity-Prevention-Best-Practice-Guideline-For-Branded-Productions)
- **Legal range (EBU R103).** The tolerance is ±5% of the expected range.
  - 8-bit: expected range 16–235, allowed 5–246.
  - 10-bit: expected range 64–940, tolerance ±44 (luma allowed about 20–984).
  - Out-of-range pixels are generally tolerated if they cover ≤1% of the frame.
  - Sources: [EBU R103 PDF](https://tech.ebu.ch/docs/r/r103.pdf); [EBU QC item 0051B Video Signal Levels](https://qc.ebu.io/items/0051B/); [Clearcast: Vidchecker chroma/luma failure](https://help.clearcast.co.uk/en/article/vidchecker-qc-failure-chroma-luma-levels)
- **Captions (Netflix Timed Text Style Guide).** Maximum **42 characters per line**. There is a minimum event duration of about 20 frames. — [Netflix Partner Help: TTSG General Requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements); [TTSG Subtitle Timing Guidelines](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines). **Conflict:** one search summary gave the minimum as "20 frames (4/5 s)". Netflix's timing guideline is commonly quoted as 5/6 s (20 frames at 24 fps). I did not open the primary page to confirm which fraction is correct.

### Cited Findings — platform loudness (social)
- **YouTube.** YouTube turns loud uploads **down** to its reference level but does **not** turn quiet ones up. "Stats for nerds" shows "content loudness" in dB relative to the reference. **[community-measured]**: the analysis comes from reading Stats for Nerds, not from a YouTube spec. The author calls normalization "inconsistent" and warns *against* simply aiming at -14 LUFS. — [Production Advice: YouTube Stats for Nerds (2017-09-29)](https://productionadvice.co.uk/stats-for-nerds/)
- **YouTube ≈ -14 LUFS.** This is widely repeated (e.g. -10 LUFS input turned down by 4 dB). **[community-measured]** — [Wikipedia: Audio normalization](https://en.wikipedia.org/wiki/Audio_normalization); [vidpros: Stats for Nerds](https://vidpros.com/youtube-stats-for-nerds/)
- **Instagram/TikTok.** Sources **conflict**. Some say these platforms "favor" louder -10 to -12 LUFS. Others say everything converges on -14 LUFS integrated, true peak -1 dBTP, LRA 6–12 LU. All are creator blogs or tool vendors; I found no official Meta/TikTok loudness spec. **[community-measured / vendor claim]** — [OpusClip blog](https://www.opus.pro/blog/best-loudness-normalizers); [humanize.app.br: LUFS-14 for Reels/TikTok/Shorts](https://www.humanize.app.br/blog/en/mastering-for-reels-tiktok-youtube-lufs-14); [ClickyApps: LUFS targets 2025](https://clickyapps.com/creator/video/guides/lufs-targets-2025)

### Cited Findings — safe zones (vertical 1080×1920)
- **Instagram Reels.** Sources give different numbers:
  - one: keep clear of top 14%, bottom 35%, sides 6%
  - another: a 1010×1280 box, 220 px from the top and 420 px from the bottom
  - another: 996×1400 (bottom UI about 310 px, right-side buttons about 84 px)

  Sources: [campaignswift](https://campaignswift.com/blog/instagram-safe-zone-sizes); [pod2reels](https://www.pod2reels.com/blog/instagram-reels-safe-zone-guide); [postplanify](https://postplanify.com/blog/social-media-safe-zones-2026-complete-guide)
- **TikTok.** Margins of top 108 px, bottom 320 px, left 60 px, right 120 px; another source gives a 900×1492 centred box. A "universal" safe zone across TikTok, Reels and Shorts is 900×1400 centred. — [houseofmarketers](https://houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories-reels/); [syllaby](https://syllaby.io/blog/aspect-ratios-safe-zones-shorts-reels-tiktok/)
- **Explicit caveat.** Instagram, TikTok and YouTube don't publish official pixel safe-zone specs for organic posts. The numbers come from measuring platform layouts. **[community-measured]** — [postplanify 2026 guide](https://postplanify.com/blog/social-media-safe-zones-2026-complete-guide)

### Inferences
- A practical QC gate for a creator/agency tool splits into two parts.
  - **Technical (automatable):**
    - integrated loudness and true peak (ffmpeg `ebur128`/`loudnorm`)
    - black/freeze detection (ffmpeg `blackdetect`, `freezedetect`)
    - duration match with the master
    - codec, resolution, fps and pixel-format check (ffprobe)
    - out-of-range luma
    - PSE (dedicated tools like Harding FPA; there is no ffmpeg equivalent)
  - **Editorial (human or AI-assisted):**
    - spelling of on-screen text
    - caption-to-audio sync and line length
    - graphics inside the safe zone
    - no text or face overlap
    - brand colors and logos correct
    - content appears no earlier than it is said
- Because social targets are unofficial, a sensible default is about -14 LUFS integrated / -1 dBTP. The deliverable spec should state that this is a convention, not a platform requirement.
- The universal 900×1400 box is the simplest safe zone that covers all three vertical platforms.

### Gaps
- No official, current (2023–2026) Meta/TikTok loudness documents were found. YouTube's own help pages don't publish a LUFS figure (not found in this pass).
- The exact Netflix caption reading speed (characters per second) and minimum-duration fraction were not confirmed from the primary page.
- ATSC A/85 (-24 LKFS) and EBU R128 (-23 LUFS) broadcast loudness values were not fetched in this pass (well known, but unsourced here).
- No sourced, published *editorial* QC checklist from an agency was retrieved.

## 3. Revision rounds, scope creep, and sign-off

### Takeaway
The typical contract includes **2 rounds of revisions**; video post often delivers 2–3 cuts. Extra rounds are billed hourly or through a written **change order**. The contract should define what counts as a revision versus a new deliverable, how feedback is submitted (consolidated, in the review tool), and the turnaround per round. Sign-off is an explicit approval decision, which review tools record as a status or audit trail, sometimes with a verified e-signature.

### Cited Findings
- Two revision rounds is standard for most projects; video post commonly includes 2–3 cuts. An example policy offers two free rounds within 10 days, then an hourly rate. A contract should specify: the number of rounds; revision versus new deliverable; how feedback is submitted; and turnaround per round. — [LinkedIn Advice: revisions in video production contracts](https://www.linkedin.com/advice/3/how-can-you-incorporate-revisions-your-video-production) (low-authority, collaborative article)
- Sample clause: "Revisions are limited to [2] rounds of reasonable changes to deliverables that meet specifications. Changes that materially alter scope, add features, or exceed revision limits require a written change order and additional compensation. Provider may suspend work if Client requests exceed scope or revision limits without approved change order." The source also gives a scope-creep example: an SOW with 2 rounds where the client asks for a 7th round, each taking 5–10 h. — [Terms.law: Scope creep contract protection](https://terms.law/forum/thread/scope-creep-contract-protection.html); [Terms.law: Scope creep / endless revisions demand letters (2025-12-04)](https://www.terms.law/2025/12/04/scope-creep-endless-revisions-demand-letters/)
- Revision overruns mostly trace back to contracts that didn't define revisions before work began. — [Mediabistro: When does a revision become billable](https://www.mediabistro.com/be-inspired/advice-from-the-pros/when-does-a-revision-become-billable-the-question-every-agency-answers-too-late/) (search summary; the full page returned HTTP 405)
- Formal sign-off can be captured as a verified approval (digital signature aligned with FDA 21 CFR Part 11 / EU Annex 11) in Filestage. Ziflow emphasizes audit trails for compliance. — [Filestage Help](https://help.filestage.io/en/articles/2787865-manage-reviewer-permissions-and-how-to-request-review-decisions); [Ziflow: creative approval audit trail](https://www.ziflow.com/blog/creative-approval-audit-trail-compliance?hs_amp=true)

### Inferences
- Tool mechanics that help contain creep:
  - count rounds per deliverable (a version-stack index)
  - require one consolidated feedback submission per round
  - offer "approved with changes" to close a round without another review
  - lock the approved version
  - log who approved what and when
- For a single-creator tool, the equivalent is explicit approval checkpoints (plan → review stills → final) recorded in the project folder.

### Gaps
- No survey data (e.g. industry-wide averages of rounds per project) was found. The "2 rounds" figure is practitioner convention, not measured.
- No 2023–2026 agency process write-ups with named studios were retrieved.

## 4. Project and asset organization (folders, naming, proxies, brand libraries, archive)

### Takeaway
The canonical guidance (Frame.io Workflow Guide) is a strict, team-wide **file naming convention** and a **folder structure** that "logically guides users to existing files, and indicates where new files should be put". The date format is YYYYMMDD / ISO 8601, and file names carry the project ID, camera/source, shot/take or season/episode, and technical specs. At studio scale, MAM/DAM platforms (iconik, Frame.io V4 Collections) add metadata, per-client access boundaries, and hybrid/cloud archive tiers.

### Cited Findings
- Naming rules: unique names (avoid overwrites); consistency across all teams; YYYYMMDD date; include project ID, camera, shot/take and specs. — [Frame.io Workflow Guide: File naming](https://workflow.frame.io/guide/file-naming). Verbatim examples:
  - `20181004-wfg-filenaming-camA-01-001-4k30.mov` (generic)
  - `20180606-wfg-camB-roll03-shot05-take002-4k30.mov` (narrative)
  - `20180215-wfg-s02-ep04-bts-1080p60.mov` (broadcast)
- The folder structure should be "robust enough to meet the needs of every team, but simple enough", and should scale from ingest to final deliverables. A typical hierarchy is act/scene → sequence/subclips → shots → takes. — [Frame.io Workflow Guide: File naming](https://workflow.frame.io/guide/file-naming); [Frame.io blog: VFX workflow best practices](https://blog.frame.io/2020/02/17/vfx-workflow-best-practices/)
- Frame.io V4 moves toward metadata-driven organization. "Collections" are saved metadata views, "instead of relying solely on a rigid folder structure". — [Frame.io blog (2024-04-23)](https://blog.frame.io/2024/04/23/frame-io-v4-beta-metadata-collections/)
- iconik supports multi-client workflows. Work is organized "by client, campaign, or region with clear access boundaries", with secure sharing, approvals and permissions. It is cloud-native, with "bring your own cloud" storage and hybrid on-prem + multi-cloud. **[vendor claim]** — [iconik for agencies](https://www.iconik.io/solution/agencies); [iconik MAM](https://www.iconik.io/media-asset-management)
- Archive tiers: footage on LTO tape or "cold" cloud tiers can take hours or days to retrieve. — [iconik blog: media workflow glossary](https://www.iconik.io/blog/the-media-workflow-glossary-you-actually-need) (search summary); archive migration case: [iconik: Ginkgo migrates archive to cloud](https://www.iconik.io/case-study/south-african-agency-ginkgo-migrates-archive-to-the-cloud)

### Inferences
- A multi-client local layout that fits these principles:
  - `clients/<client>/brand/` for the reusable brand kit: logos, fonts, colors, LUTs, intro/outro, lower-third templates.
  - `clients/<client>/projects/<YYYYMMDD>-<slug>/` with fixed subfolders: source, proxies, graphics, audio, review versions `vNN`, deliverables, and archive metadata.
  - Brand assets are referenced across projects, not copied.
- Versioned review exports should carry `_vNN` plus the round number, so the version stack and the revision-round count are the same thing.

### Gaps
- **Versioning notation** (v01/v02) and **proxy workflows** are not covered on the Frame.io file-naming page. Other Frame.io Workflow Guide chapters (proxies, archive) were not fetched.
- Air.inc was not found in results. No sourced details on Air's brand-library features.
- No sourced agency write-up on per-client brand kits in NLE templates (Premiere/Resolve project templates, Essential Graphics/MOGRTs) was retrieved.

## 5. Workflow/project-management tooling and statuses

### Takeaway
Studios track production in general PM tools (monday.com, ClickUp, Asana) with pipeline statuses, and keep frame-level review in a review tool (Frame.io etc.), often integrated. The vendor templates found use stage-based custom statuses. I found no single industry-standard status list.

### Cited Findings
- **ClickUp's Video Production Template** has **nine custom statuses** mapping production milestones from concept to publication. Named examples are *Concept, Editing, Final Editing, Live, Publish*. It includes comment threads for stakeholder feedback on the final cut. — [ClickUp: Video production templates blog](https://clickup.com/blog/video-production-template/); [ClickUp template page](https://clickup.com/templates/video-production-template-t-240072804) ([vendor claim])
- **monday.com's video production management template** uses forms for requests, boards for contacts, and dashboards to see "the status of all client projects in one place… what's stuck and why". — [monday.com template 44239](https://monday.com/templates/template/44239/video-production-management) ([vendor claim])
- Frame.io's own Status field is 3 values (Needs Review / In Progress / Approved) and can be extended with custom select fields. — [Frame.io Metadata Overview](https://help.frame.io/en/articles/9101037-metadata-overview)

### Inferences
- A synthesized pipeline status set (my inference, not a sourced standard): *Briefing → Planning (plan awaiting approval) → Editing → Internal QC → Client review (round N) → Changes requested → Approved → Delivered → Archived.* It combines the PM-template stages with the review-tool decisions from section 1.

### Gaps
- Asana, Air and iconik status vocabularies were not researched.
- The full list of ClickUp's nine statuses was not retrieved (only examples).
- No 2023–2026 survey of which PM tools post houses actually use.
