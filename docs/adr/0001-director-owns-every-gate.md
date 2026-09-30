# The Diretor owns every Gate; personas are subagents that never ask

The studio is a cast of personas, but only the Diretor (and the Entrevistador) talk to the Criadora: they run on the main thread as skills, and every Gate — briefing, Pré-corte, Plano, Quadros de estilo, cost, Rodadas, Entrega — happens there. All other personas are subagents that compute and return. We chose this because subagents cannot call `AskUserQuestion` and workflows accept no input mid-run, so a gate inside a subagent is impossible, not merely awkward.

## Consequences

- Every artifact passes a Crítico that is not its Autor before the Criadora sees it; the three Críticos (QC técnico, Guardião da marca, Revisor de plataforma) only approve or reject. The internal critic loop is capped at 3 turns before the Diretor escalates to the Criadora in one sentence with two options.
- Each persona pins its own `model` and `effort` (Opus 5.5 at `medium` for judgment-heavy personas, Sonnet 5.5 at `high`/`xhigh` for tool-heavy ones — research in `raw/research/modelos-opus-sonnet-5-5/`), because an omitted `effort` inherits the session's.
