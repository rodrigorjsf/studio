# Claude Code plugin format, capabilities, and cross-surface support (Claude Code CLI, Desktop Code tab, Cowork, claude.ai chat)

All sources fetched on 2026-09-29 unless noted. Version gates (e.g. "requires v2.1.273") are quoted as the docs print them. Sources marked "(summarized)" were read through the WebFetch summarizer, not as verbatim page text. Where a verbatim page covers the same point, it is preferred.

Primary pages used:
- Plugin manifest reference: https://code.claude.com/docs/en/plugins-reference (resolves to the "Plugin manifest reference" page)
- Plugin components: https://code.claude.com/docs/en/plugins/components.md
- Plugin loading reference: https://code.claude.com/docs/en/plugins/loading.md
- Marketplace create / reference: https://code.claude.com/docs/en/plugin-marketplaces, https://code.claude.com/docs/en/plugins/marketplace-reference.md
- Skills: https://code.claude.com/docs/en/skills.md
- Subagents (summarized): https://code.claude.com/docs/en/sub-agents
- Hooks (summarized): https://code.claude.com/docs/en/hooks.md
- Workflows: https://code.claude.com/docs/en/workflows.md
- Tools reference: https://code.claude.com/docs/en/tools-reference.md
- Desktop (Code tab): https://code.claude.com/docs/en/desktop.md, https://code.claude.com/docs/en/desktop-wsl.md
- claude.com plugin docs: https://claude.com/docs/plugins/platform-support, https://claude.com/docs/plugins/build, https://claude.com/docs/cowork/guide/plugins
- Cowork architecture (summarized): https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview

---

## 1. Plugin directory structure, `plugin.json` / `marketplace.json` schema, and env vars for plugin scripts

### Takeaway
A plugin is a folder. The only thing that goes inside `.claude-plugin/` is `plugin.json`, and that file is optional. Everything else sits at the plugin root in default folders: `skills/`, `commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `output-styles/`, `workflows/`, `themes/`, `monitors/`, `bin/` and `settings.json`. Only `name` is required in `plugin.json`. A marketplace is a repository with `.claude-plugin/marketplace.json`, which needs `name`, `owner` and `plugins[]`.

Plugins get three path variables:
- `${CLAUDE_PLUGIN_ROOT}`: the installed version. It changes on every update.
- `${CLAUDE_PLUGIN_DATA}`: `~/.claude/plugins/data/<id>/`. It survives updates.
- `${CLAUDE_PROJECT_DIR}`: the project root.

These variables are **not** in the Bash tool's environment.

### Cited Findings

**Manifest basics**
- "The manifest is optional. Without it, Claude Code loads the components it finds in the standard layout." — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- "Save the manifest at `.claude-plugin/plugin.json` under the plugin root. Put every other plugin file at the plugin root, not inside `.claude-plugin/`." — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- "`name` is the only required key." It must be kebab-case, and "Claude Code namespaces every component under it, so an agent `reviewer` in plugin `deploy-tools` appears as `deploy-tools:reviewer`." — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Top-level manifest fields**

The fields are: `$schema`, `name`, `displayName`, `version`, `description`, `author` (`name` required, plus `email` and `url`), `homepage`, `repository`, `license`, `keywords`, `metadata`, `defaultEnabled`, `dependencies`, `settings`, `userConfig`, `channels`, `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`, `outputStyles`, `workflows`, and `experimental` (`themes`, `monitors`, `evals`). — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**How each key combines with its default folder**
- **Replaces the default:** `commands`, `agents`, `outputStyles`, `workflows`, `experimental.themes`, `experimental.monitors`.
- **Adds to the default:** `skills`.
- **Merges with the default file:** `hooks`, `mcpServers`, `lspServers`.
- Every path "must start with `./`" and must stay inside the plugin root. A `..` path fails validation.

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Validation and unknown fields**
- An unrecognized top-level key is stripped with a warning.
- Unknown keys inside `userConfig`, `channels`, `lspServers` or `monitors` entries are errors, and the plugin doesn't load.
- `claude plugin validate ./my-plugin` is "the authoritative check". Add `--strict` for CI.

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Standard layout table (verbatim rows)**
- Skills in `skills/` with "One `<name>/SKILL.md` per skill".
- Commands in `commands/`: "Prefer `skills/` for new plugins".
- Agents in `agents/`: "Subfolders are part of the agent name".
- Hooks in `hooks/hooks.json`.
- MCP in `.mcp.json`.
- Output styles in `output-styles/`.
- Workflows in `workflows/`.
- Monitors in `monitors/monitors.json`.
- Executables in `bin/`: "claude.ai and Cowork don't install a plugin that has this directory".
- Settings in `settings.json`: "`agent` and `subagentStatusLine` defaults applied while the plugin is enabled".

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**A root `CLAUDE.md` is not loaded**
- "A `CLAUDE.md` at the plugin root isn't loaded as context, and `claude plugin validate` warns when it finds one. To include instructions that load into Claude's context, put them in a skill." — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Environment variables**
- `${CLAUDE_PLUGIN_ROOT}` = "Absolute path of the plugin's installed version".
- `${CLAUDE_PLUGIN_DATA}` = "`~/.claude/plugins/data/<id>/`, created on first reference and kept across plugin updates".
- `${CLAUDE_PROJECT_DIR}` = "The project root".
- "`${CLAUDE_PLUGIN_ROOT}` changes when the plugin updates, so don't write state there."

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Where each variable resolves**

| Component | Inline substitution | Exported to the process |
|---|---|---|
| Hook commands | Yes | `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_OPTION_<KEY>` |
| MCP stdio servers | Yes | `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` |
| Skill, command and agent content | "Anywhere in the Markdown body" | Not applicable |

- The critical line: "The variables aren't present in the environment of commands Claude runs through the Bash tool, in the main session or in a subagent. In skill, command, and agent content, write the `${...}` reference in the Markdown body instead, and Claude Code substitutes the path inline."

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Skill-level substitutions**
- Skills also get `${CLAUDE_SKILL_DIR}`, which is "the skill's subdirectory within the plugin, not the plugin root".
- They also get `$ARGUMENTS`, `$N`, `$name`, `${CLAUDE_SESSION_ID}` and `${CLAUDE_EFFORT}`.
- `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted in plugin skill bodies and in `allowed-tools` Bash rules. That lets a bundled script run without a permission prompt, for example `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)`.

— [Skills](https://code.claude.com/docs/en/skills.md)

**`marketplace.json`**
- Required fields: `name`, `owner` (`name` required, plus `email` and `url`), `plugins`.
- Optional fields: `$schema`, `description`, `version`, `metadata.pluginRoot` (v2.1.239+), `forceRemoveDeletedPlugins`, `allowCrossMarketplaceDependenciesOn`, `renames` (v2.1.193+).
- Each plugin entry needs `name` and `source`. Optional entry fields: `description`, `version`, `category`, `tags`, `strict` (default true), `relevance`, `dependencies`, `defaultEnabled`, `displayName`, `metadata`, `headers`, `headersHelper`. An entry also accepts any `plugin.json` field.

— [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md)

**Plugin source types**
- Relative path (`./plugins/x`)
- `github` (`repo`, `ref`, `sha`)
- `url` (`url`, `ref`, `sha`)
- `git-subdir` (`url`, `path`, `ref`, `sha`)
- `npm` (`package`, `version`, `registry`)
- `archive` (`url`, `sha256`; v2.1.224+)
- `command` (`command`, `timeout`, `mode`; v2.1.229+)

— [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md)

**Marketplace naming**
- Reserved names include `claude-plugins-official`, `anthropic-plugins`, `knowledge-work-plugins`, `inline`, `skills-dir`, `synced`, and names starting with `claudeai-`.
- Claude Desktop is stricter. It accepts "letters, digits, ".", "_", "-"; must start alphanumeric; max 128 chars", and `org`, `org-provisioned` and `unknown` are reserved there.

— [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md)

**Keep entry name and manifest name the same**
- The entry name is the install id (`<entry>@<marketplace>`). The manifest name is the skill prefix. — [Create a marketplace](https://code.claude.com/docs/en/plugin-marketplaces)

### Inferences
- For the studio, scripts such as `transcrever.py` and `hf_api.py` should live inside the skill folders (`skills/<x>/scripts/`) or under a plugin-level `scripts/` folder. The SKILL.md body should call them through an inline-substituted path, e.g. `python "${CLAUDE_SKILL_DIR}/scripts/transcrever.py"`. A shell-session env var won't work, because the Bash tool doesn't see `CLAUDE_PLUGIN_ROOT`.
- The current repo-root `CLAUDE.md` "director" persona can't ship as a plugin `CLAUDE.md`. It has to become a skill, which could be the entry-point skill, or a `settings.json` `agent`, which works in Claude Code only (see §5).
- Do not ship a top-level `bin/` if Cowork or claude.ai support is wanted.

### Gaps
- The published JSON Schema URL for `plugin.json` / `marketplace.json` (`$schema`) was not captured.
- The anthropics/claude-plugins-official repository was not inspected for real-world examples.

---

## 2. Skills, subagents, commands, hooks, MCP bundling, output styles, and `userConfig`

### Takeaway

**Skills** are the core unit. They are `SKILL.md` files with rich frontmatter in Claude Code, and they load on every surface. Only the body loads on demand; name and description are always listed.

**Commands** have been "merged into skills".

**Plugin subagents** support most frontmatter fields, but ignore `hooks`, `mcpServers`, `permissionMode` and `initialPrompt`.

**Hooks** cover about 33 events and have 5 handler types.

**MCP servers** go in `.mcp.json` or inline. Bundles (`.mcpb`) are also supported.

**Output styles** go in `output-styles/`. They are Claude Code only.

**`userConfig`** prompts the user for values. It has limited Cowork support.

### Cited Findings

**Skills: frontmatter fields**
- `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context` (`fork`), `agent`, `background`, `hooks`, `paths`, `shell`, `metadata`, `license`, `compatibility`.
- "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing".

— [Skills](https://code.claude.com/docs/en/skills.md)

**Skills: portable subset**
- "claude.ai skill uploads, the Skills API, and packaging with `package_skill.py`" accept only `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`. Any other field is a hard error: "Unexpected key(s) in SKILL.md frontmatter".
- "Claude Code-only body features, such as dynamic context injection, don't function in claude.ai chat or through the API."

— [Skills](https://code.claude.com/docs/en/skills.md)

**Skills: progressive disclosure**
- "Unlike CLAUDE.md content, a skill's body loads only when it's used."
- Supporting files (`reference.md`, `examples.md`, `scripts/helper.py` — "executed, not loaded") should be referenced from SKILL.md "so Claude knows what each file contains and when to load it".
- After compaction, "keeping the first 5,000 tokens of each. Re-attached skills share a combined budget of 25,000 tokens."

— [Skills](https://code.claude.com/docs/en/skills.md)

**Skills: `context: fork`**
- It "starts a new subagent of the type set in the `agent` field and gives it the skill content as its prompt. The subagent doesn't see your conversation history".
- It runs in the background by default. `background: false` waits for the result (v2.1.218+).

— [Skills](https://code.claude.com/docs/en/skills.md)

**Skills in plugins**
- `skills/review/SKILL.md` in `my-plugin` runs as `/my-plugin:review`. — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Commands**
- "Custom commands have been merged into skills." A command file accepts the same frontmatter except `name` and `paths`. — [Skills](https://code.claude.com/docs/en/skills.md)
- The manifest `commands` key can also map a name to `{source|content, description, argumentHint, model, allowedTools}`. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Subagents (plugin agents)**
- **Supported fields:** `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `omitClaudeMd`, `isolation` (only `"worktree"`), `color`, `experimental.cacheTtl`.
- **Ignored fields:** "`permissionMode`, `hooks`, `mcpServers`, and `initialPrompt`. An agent file can't add hooks or MCP servers on its own".
- **Naming:** agents are named `<plugin>:<name>`, and subfolders add segments (`my-plugin:review:security`).

— [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Subagents: general fields (summarized)**
- `model` accepts `sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit`.
- `memory` accepts `user`, `project` or `local`. These map to `~/.claude/agent-memory/<agent>/`, `.claude/agent-memory/<agent>/` and `.claude/agent-memory-local/<agent>/`.

— [Subagents (summarized)](https://code.claude.com/docs/en/sub-agents)

**Hooks (summarized)**

Events:
- `SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`
- `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`
- `PreCompact`, `PostCompact`, `Stop`, `StopFailure`
- `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`
- `PreModelSwitch`, `PostModelSwitch`, `Notification`, `MessageDisplay`
- `ConfigChange`, `CwdChanged`, `DirectoryAdded`, `FileChanged`
- `WorktreeCreate`, `WorktreeRemove`, `InstructionsLoaded`
- `Elicitation`, `ElicitationResult`, `SessionEnd`

Handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent`.

— [Hooks (summarized)](https://code.claude.com/docs/en/hooks.md)

**Hooks: exec form vs shell form**
- Exec form (`command` plus `args`) runs with no shell. It is preferred for paths with spaces. — [Hooks (summarized)](https://code.claude.com/docs/en/hooks.md)
- Shell form: "wrap the `${CLAUDE_PLUGIN_ROOT}` path in double quotes". — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Plugin hooks: when they fire**
- "A plugin's hooks don't wait for one of the plugin's skills or commands to be used. Claude Code registers them when a session loads the plugin". — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**MCP servers**
- `mcpServers` accepts a `.json` path, a `.mcpb`/`.dxt` bundle path or URL, an inline map, or an array of these. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- Tool names follow `mcp__plugin_<plugin>_<server>__<tool>`. — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)
- "A local stdio server ... runs in Claude Code and in a Cowork session that runs on your machine in the Claude Desktop app, but not on claude.ai. To reach users there too, reference a remote server by its `https://` URL". — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Output styles**
- Saved as `output-styles/<name>.md` with `name` and `description` frontmatter. They appear in `/output-style` as `<plugin>:<name>`. — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)
- Output styles are "Ignored" in chat and Cowork. — [Platform support](https://claude.com/docs/plugins/platform-support)

**`userConfig`: schema**
- Each option has these fields: `type` (`string`, `number`, `boolean`, `directory` or `file`), `title`, `description`, `required`, `default`, `options` (v2.1.271+), `multiple`, `sensitive`, `min`, `max`.
- Sensitive values go to secure storage. Others go to `pluginConfigs` in `settings.json`.

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**`userConfig`: how components read values**
- `${user_config.KEY}` is substituted in MCP/LSP configs, exec-form hook args, and skill/agent content. For skill and agent content, only non-sensitive values are substituted.
- Hooks also get `CLAUDE_PLUGIN_OPTION_<KEY>`.
- Shell-form hooks and monitors reject `${user_config.*}`.

— [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**`userConfig`: when the dialog appears**
- It "appears only in the interactive `/plugin` interface".
- `claude plugin install` never prompts; use `--config KEY=VALUE` instead.

— [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**`userConfig` outside Claude Code**
- An MCP server that references `${user_config.*}` is "Ignored when a referenced option has no default; Cowork doesn't prompt for values". — [Platform support](https://claude.com/docs/plugins/platform-support)

**Plugin default settings**
- `settings.json` at the plugin root can set `agent`, which runs "one of the plugin's own agents as the main thread", and `subagentStatusLine`. Every other key is dropped. — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Other components**
- Also available: dependencies between plugins, LSP servers, monitors (experimental, interactive only), themes, channels, and workflows. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

### Inferences
- A Higgsfield API key belongs in `userConfig` with `sensitive: true`.
  - It reaches hooks as `CLAUDE_PLUGIN_OPTION_HF_KEY`, and MCP servers through `${user_config.hf_key}` in `env`.
  - It won't reach a Python script called through the Bash tool unless a hook or MCP server passes it on.
  - Cowork won't prompt for it.
- Keep studio SKILL.md frontmatter to the 6 portable fields if the skills must also be enabled on a claude.ai account. Otherwise the upload fails.

### Gaps
- It is unconfirmed whether plugin skills installed through Cowork's **Customize → Plugins** are validated against the 6-field Agent Skills subset. The doc states the limit only for claude.ai skill uploads, the Skills API and `package_skill.py`.
- The dedicated output-styles page (keep-coding-instructions and similar frontmatter) was not fetched.

---

## 3. Orchestrating subagent pipelines: nesting, approval gates, AskUserQuestion, background agents, workflows

### Takeaway
Subagents can nest up to 3 levels deep by default, and they run in the background by default. **`AskUserQuestion` is unavailable to every subagent**, and **workflows allow no mid-run user input**. So human approval gates (plan, stills, credit spend) must be driven by the **main thread**, which can be a skill or the main-thread agent. That thread calls subagents or workflows one stage at a time and asks the user between stages.

Agent teams are CLI-only. Dynamic workflows run in the CLI, Desktop, IDE and `-p`.

### Cited Findings

**Nesting**
- "By default, a subagent can spawn subagents of its own, up to three layers below the main conversation."
- The depth is controlled by `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`. Setting it to `1` disables nesting.

— [Subagents (summarized)](https://code.claude.com/docs/en/sub-agents)

**Tools blocked for all subagents**
- `AskUserQuestion`, `EnterPlanMode`, `Workflow`, `ScheduleWakeup`, and others.
- "`AskUserQuestion` is not available to subagents in any configuration."

— [Subagents (summarized)](https://code.claude.com/docs/en/sub-agents)

**Background subagents**
- A background subagent keeps every MCP tool, but only a restricted built-in set: Read, Grep, Glob, Bash, Edit, Write, WebFetch, WebSearch, Skill, SendMessage and similar. — [Subagents (summarized)](https://code.claude.com/docs/en/sub-agents)
- "Claude Code runs subagents in the background by default". Background subagents "surface permission prompts in your main session as of v2.1.186". — [Tools reference](https://code.claude.com/docs/en/tools-reference.md)

**Chaining**
- "For multi-step workflows, ask Claude to use subagents in sequence. Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent." — [Subagents (summarized)](https://code.claude.com/docs/en/sub-agents)

**AskUserQuestion**
- It "Asks multiple-choice questions ... Questions stay open until you answer them by default". Users can also type free text through `Other`.
- An optional `askUserQuestionTimeout` (`60s`, `5m` or `10m`) auto-continues an unanswered question.

— [Tools reference](https://code.claude.com/docs/en/tools-reference.md)

**Workflows: what they are**
- A workflow is a JavaScript script that uses `agent()`, `pipeline()`, `parallel()`, `phase()`, `log()` and the `args` global. `agent()` can take a JSON `schema` for structured output.
- Limits: up to 16 concurrent agents by default, and 1,000 agents per run.
- No `import()` is allowed. The script has no direct filesystem or shell access; only its agents do.

— [Workflows](https://code.claude.com/docs/en/workflows.md)

**Workflows: no mid-run input**
- "No mid-run user input | A run pauses on its own only for agent permission prompts and a usage-limit wait. For sign-off between stages, run each stage as its own workflow". — [Workflows](https://code.claude.com/docs/en/workflows.md)

**Workflows in plugins**
- "Place the script in a `workflows/` directory at the plugin root ... A plugin called `acme-tools` containing a script whose `meta.name` is `release-audit` runs as `/acme-tools:release-audit`." — [Workflows](https://code.claude.com/docs/en/workflows.md)

**Workflows on each surface**
- "Workflows are available in the CLI, the Desktop app, the IDE extensions, non-interactive mode with `claude -p`, and the Agent SDK."
- "In the Desktop app, an approval card shows the workflow name, the phase list, and a token-usage caution, with **Once**, **Always**, and **Deny** actions."
- On Pro, workflows must be turned on in `/config`.

— [Workflows](https://code.claude.com/docs/en/workflows.md)

**Workflows: resuming**
- A run can be resumed within the same session. A relaunch replays completed agents from their saved results.
- `Date.now()` and `Math.random()` throw inside scripts, to keep replays deterministic.

— [Workflows](https://code.claude.com/docs/en/workflows.md)

**Agent teams**
- "Agent teams ... are available in the CLI, not in Desktop. For multi-agent work inside one session, use dynamic workflows, which run in Desktop". — [Desktop](https://code.claude.com/docs/en/desktop.md)

**Skill-level gating tools**
- `disallowed-tools` can remove `AskUserQuestion` for background loops.
- `disable-model-invocation: true` makes a skill manual-only (`/name`).

— [Skills](https://code.claude.com/docs/en/skills.md)

### Inferences
- A workable studio pattern runs from the main thread, driven by a "director" skill:
  1. The skill calls `AskUserQuestion` for level, project and style.
  2. It dispatches a subagent (or a workflow) for "watch + transcribe", which is read and compute only.
  3. It writes `plano.md`, then calls `AskUserQuestion` for approval.
  4. It dispatches the coding and render stage.
  5. It shows the stills, then calls `AskUserQuestion` again.
  6. It runs the final render.
- Each approval point is a main-thread turn boundary. Subagents must be told to return results, never to ask.
- Credit-spend gates (Higgsfield) must also be on the main thread. A `PreToolUse` hook on the Higgsfield MCP tools with `permissionDecision: "ask"` could add a deterministic guard.

### Gaps
- Whether `AskUserQuestion` renders in **Cowork** sessions, and how it looks there, was not confirmed.
- No official doc was found describing a built-in "approval gate" primitive beyond `AskUserQuestion`, permission prompts, and workflow launch approval.

---

## 4. Claude Desktop: Code tab vs Cowork vs claude.ai chat, installation for non-technical users, limitations

### Takeaway
The same plugin folder can be installed everywhere, but each surface loads a different subset.

- **Desktop Code tab** is Claude Code with a GUI. It shares `~/.claude` with the CLI and has a plugin browser in its **+** menu. **Plugins are not available in WSL, cloud, or (for the browser) remote sessions.**
- **Cowork** installs plugins at the account level through **Customize → Plugins**, from a marketplace, a Git repository, or an uploaded zip. It loads skills, commands, agents, hooks, and local MCP servers (in local sessions). It ignores output styles, LSP, `settings`, and themes.
- **claude.ai chat** loads only skills, commands (as skills), and remote MCP servers.
- A top-level `bin/` makes chat and Cowork refuse the whole plugin.

### Cited Findings

**Component support matrix**

| Component | Chat | Cowork | Claude Code |
|---|---|---|---|
| Skills | Loads | Loads | Loads |
| Commands | "Loads as a skill" | Loads | Loads |
| Agents | Ignored | Loads | Loads |
| Hooks | Ignored | Loads | Loads |
| Local MCP | Ignored | "Loads when the Cowork session runs on your computer" | Loads |
| `bin/` | "Can't be installed" | "Can't be installed" | Loads |
| LSP servers, output styles, themes, `settings` | Ignored | Ignored | Loads |

— [Platform support](https://claude.com/docs/plugins/platform-support)

**Where installs live, and how they sync**
- "Chat and Cowork read plugins from your claude.ai account, and Claude Code reads them from the machine it runs on."
- "A plugin you install on your account also appears in Claude Code as a synced plugin at the next session start". The reverse is not true: CLI installs stay on the machine.

— [Platform support](https://claude.com/docs/plugins/platform-support)

**Limits for claude.ai and Cowork**
- 200 MB and 5,000 files per plugin, 25 marketplaces per user, 500 plugins per marketplace, and a 512 MB marketplace repository archive.
- For self-added marketplaces, only GitHub or GitHub Enterprise repositories, plus public GitLab and Bitbucket, are supported.

— [Platform support](https://claude.com/docs/plugins/platform-support); [Cowork install plugins](https://claude.com/docs/cowork/guide/plugins)

**Installing in Cowork**
- "Open **Customize** in the sidebar, then select **Plugins**." Pick **Discover** for the official catalog, or **Add marketplace** with a `https://github.com/owner/repo` URL or `owner/repo`.
- "To install from a file instead, select the upload option on the Plugins page and select the plugin package."
- Marketplaces have **Check for updates** and **Sync automatically** options.

— [Cowork install plugins](https://claude.com/docs/cowork/guide/plugins)

**Upload format**
- "Zip the plugin folder ... In claude.ai, go to **Customize > Plugins > Add > Upload plugin**". — [Plugin build](https://claude.com/docs/plugins/build)
- Third-party posts describe a `.plugin` file as "just a zip archive with a different extension". This is sourced but not confirmed on an official page; official pages say "zip" or "plugin package". — [Substack note (third-party)](https://substack.com/@ruben/note/c-218891371); [Medium (third-party)](https://medium.com/@Micheal-Lanham/developing-claude-cowork-plugins-is-easier-than-you-think-28d197e50677)

**Desktop Code tab: installing plugins**
- "You can install plugins from the desktop app without using the terminal ... click the **+** button next to the prompt box and select **Plugins** ... select **Add plugin** ... to open the plugin browser".
- Scopes are user, project and local.

— [Desktop](https://code.claude.com/docs/en/desktop.md)

**Desktop Code tab: where plugins don't work**
- "The plugin browser is not available in cloud sessions, and plugins you install from the desktop app aren't available for cloud sessions ... Plugins aren't available in WSL sessions." — [Desktop](https://code.claude.com/docs/en/desktop.md)
- In WSL sessions, "A few features aren't available ... yet: the integrated terminal, connectors and plugins, session forking, the file browser pane, and file suggestions when you type `@`". — [Desktop WSL](https://code.claude.com/docs/en/desktop-wsl.md)

**Desktop and CLI share configuration**
- "Desktop and CLI read the same configuration files": CLAUDE.md, `~/.claude.json` / `.mcp.json` MCP servers, hooks and skills, and `settings.json`.
- "The Cowork tab ... sources its skills, plugins, and connectors from this Customize configuration, which syncs through your claude.ai account, not from the CLI's `~/.claude` directory."

— [Desktop](https://code.claude.com/docs/en/desktop.md)

**Desktop feature gaps**
- Permission modes are limited to Manual, Accept edits, Plan and Auto (Bypass if enabled). There is no `--print`.
- Terminal-dialog commands such as `/permissions` reply "isn't available in this environment".

— [Desktop](https://code.claude.com/docs/en/desktop.md)

**Cowork execution environment (summarized)**
- In local sessions, "Code execution runs in an isolated virtual machine (VM)" (Apple Virtualization.framework or Hyper-V), and files are reachable "in connected folders".
- In cloud sessions, execution happens in "an isolated, temporary sandbox on Anthropic-managed infrastructure".

— [Cowork architecture (summarized)](https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview)

**Cowork skill behavior**
- Cowork sessions "don't read `~/.claude/skills/` on your machine" and "load the skills enabled for your claude.ai account".
- "In a Cowork session on your desktop ... Claude Code replaces every `!` command line with the `disableSkillShellExecution` placeholder", so dynamic context injection doesn't run there.

— [Skills](https://code.claude.com/docs/en/skills.md)

**Security (secondary source)**
- A July 2026 Cowork VM sandbox-escape vulnerability on macOS was reported by news outlets; reports say it was patched. This is secondary coverage, not an Anthropic doc. — [9to5Mac](https://9to5mac.com/2026/07/27/claude-cowork-escaped-sandbox-on-mac-gain-full-access-to-all-files/); [The Hacker News](https://thehackernews.com/2026/07/claude-cowork-flaw-could-let-ai-agent.html)

### Inferences
- **This user runs WSL2.** A Desktop Code-tab session in a WSL distribution **cannot use plugins**. Options:
  - Use the Claude Code CLI inside WSL, where plugins work.
  - Use a Windows-native **Local** Desktop session, pointed at a Windows folder or the `\\wsl.localhost` path.
  - Use Cowork.
- For non-technical users, the easiest path is a GitHub-hosted marketplace added through **Customize → Plugins → Add marketplace**. The plugin then syncs into Claude Code too.
- The studio's heavy local dependencies (ffmpeg, Node/Remotion, Python faster-whisper) are the real portability risk:
  - Claude Code on the user's machine can use the host toolchain.
  - Cowork runs code in a Linux VM whose tooling is undocumented, and it only sees connected folders.
- Remotion rendering in Cowork is therefore unverified. Level 1 (local Remotion) fits best in the Claude Code / Desktop Code tab (non-WSL).

### Gaps
- It is undocumented which runtimes are preinstalled or installable in the Cowork VM: Python, pip, Node/npm, ffmpeg, GPU access.
- It is unknown where Cowork plugin **hooks** execute (host or VM).
- It was not confirmed whether claude.ai chat skills can execute bundled scripts. Code execution in chat was not researched.
- The Cowork on-disk location and persistence of plugin data (`CLAUDE_PLUGIN_DATA` equivalent) was not documented in the pages found.

---

## 5. Where user data should live so it survives plugin updates; multi-project organization

### Takeaway
Never write state to `${CLAUDE_PLUGIN_ROOT}`. It is a per-version cache directory, and the old one is deleted 14 days after an update.

`${CLAUDE_PLUGIN_DATA}` (`~/.claude/plugins/data/<id>/`) survives updates but is **deleted on the last uninstall** unless `--keep-data` is used. It fits dependencies such as `node_modules`, venvs and caches. It does not fit user content.

User projects (videos, prints, transcripts, plans, renders) should live in the user's own project folder (`${CLAUDE_PROJECT_DIR}` / cwd). Subagent memory can use `memory: project`.

### Cited Findings

**Plugin cache and update cleanup**
- The plugin cache is at `cache/<marketplace>/<plugin>/<version>/`, and "`${CLAUDE_PLUGIN_ROOT}` points at this directory ... Because `${CLAUDE_PLUGIN_ROOT}` points at a version directory, a plugin's root path changes with every version. Keep a plugin's durable files in `${CLAUDE_PLUGIN_DATA}` instead."
- "When you update or uninstall a plugin, Claude Code writes an `.orphaned_at` marker into the previous version directory. It removes that directory in a background cleanup 14 days later".

— [Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)

**Data directory lifetime**
- "By default, Claude Code deletes the `${CLAUDE_PLUGIN_DATA}` directory when you uninstall the plugin from the last place it's installed." — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- The data directory holds "`node_modules`, virtual environments, and caches". — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Recommended dependency-install pattern**
- A `SessionStart` hook diffs `package.json` between `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`, then runs `npm install` into the data directory. An MCP server can then use `NODE_PATH=${CLAUDE_PLUGIN_DATA}/node_modules`. — [Plugin components](https://code.claude.com/docs/en/plugins/components.md)

**Automatic dependency install**
- It runs only with `package.json` plus an npm or bun lockfile, using `npm ci --ignore-scripts` or `bun install --frozen-lockfile --ignore-scripts`.
- It has a 60-second timeout, and "Yarn and pnpm" are skipped.
- "When the automatic install can't provide a dependency, install it from a hook into the persistent data directory. That includes packages that need their lifecycle scripts to build, Python dependencies".

— [Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)

**Files outside the plugin**
- "Files outside the plugin directory aren't copied, so when a script inside a copied plugin reads a path above the plugin root, such as `../shared`, it doesn't find them". — [Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)

**Plugin-scoped settings**
- `userConfig` values persist in `settings.json` `pluginConfigs`, or in the secure store for sensitive values. — [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)

**Subagent memory (summarized)**
- "`project` is the recommended default scope. It makes subagent knowledge shareable via version control". — [Subagents (summarized)](https://code.claude.com/docs/en/sub-agents)

**Local marketplaces for development**
- A marketplace added from a local directory loads relative-path plugins "in place". Edits apply on `/reload-plugins` with no version bump. — [Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)

**Versioning**
- Setting `version` pins users until you change it. Leaving it out makes the git SHA the version, so every commit is an update.
- Auto-update is off by default for third-party marketplaces.

— [Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)

### Inferences

**Recommended split for the studio plugin**

| What | Where |
|---|---|
| Skills, agents, scripts, style gallery, Remotion template source | Plugin root, read-only |
| `node_modules` for Remotion, the Python venv with faster-whisper, model weights cache | `${CLAUDE_PLUGIN_DATA}`, installed by a `SessionStart` hook or a first-run "setup" skill |
| Per-video work (`projetos/NNN. slug/…`, `edicoes/…`, `plano.md`, `edit.jsx`/Remotion sources) | The user's chosen workspace folder (cwd / `CLAUDE_PROJECT_DIR`) |

- Keeping per-video work in the workspace folder means it survives uninstall and can be backed up or versioned.
- Remotion needs a project with `src/Root.tsx` and a public dir. The plugin could scaffold a workspace (a "studio" folder) from a template stored in the plugin, on first run.
- A large Remotion `node_modules` tree cannot be committed into the plugin under the 200 MB / 5,000-file claude.ai limit. It must be installed at runtime.

### Gaps
- There is no official guidance on "multi-project organization" for plugin users beyond the scopes (user/project/local) and cwd-based project folders.
- It is unknown whether `${CLAUDE_PLUGIN_DATA}` exists or persists in Cowork sessions. Cowork downloads synced plugins "into the session's own environment when the session starts" ([Plugin loading](https://code.claude.com/docs/en/plugins/loading.md)), which suggests there is no durable per-user data directory there. This is an inference, not confirmed.
