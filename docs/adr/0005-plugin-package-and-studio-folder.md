# The plugin ships from `plugin/estudio/`; the Criadora's data lives in her Estúdio folder

This repo becomes a marketplace (`.claude-plugin/marketplace.json` at the root) that publishes one plugin, `estudio`, from `plugin/estudio/`. Development material — `wiki/`, `raw/`, `estado/`, `PROJETO.md`, tests — stays outside the package, keeping it under the 200 MB / 5,000-file plugin cap. The Criadora's Perfil, Projetos, Vídeos, Kits de marca and Entregas never live inside the plugin (its root is replaced on every update); they live in the Estúdio folder she opens in Claude, marked by `estudio.json` and scaffolded on first run with the Remotion template.

## Consequences

- The fork diverges freely from `mackswendhell/studio` (MIT, credited in the README); upstream fixes are ported by hand.
- Target surface is the Claude Desktop Code tab in a local session (Mac for the Criadora, native Windows for testing) and the CLI; plugins are unavailable in Desktop WSL sessions, and Cowork/chat are out of scope for v1.
