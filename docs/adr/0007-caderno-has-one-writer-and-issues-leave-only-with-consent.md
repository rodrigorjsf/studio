# The Caderno has one writer, and a Rascunho de issue leaves her computer only with her consent

The studio now remembers how to work with the Criadora in a **Caderno** (Elogios, Queixas, Soluções), kept in two layers: one for the Estúdio and one per Projeto. It also turns plugin defects and recurring trouble into issues on `rodrigorjsf/studio`. Any persona may *originate* a Caderno entry or an issue within its scope. Two rules shape how that happens.

- **Only the Diretor writes.** Each persona returns proposed entries in the report it already hands back, and the Diretor appends them through an `estudio.mjs` command, one entry at a time, stamped with persona, Vídeo and date. The three Críticos run in parallel, so letting each one write the same markdown file would lose lines. Elogios and Queixas come from her words, and only the Diretor talks to her ([0001](0001-director-owns-every-gate.md)). The Diretor tells her in one line what it wrote down. When a new Elogio or Queixa contradicts an existing one, she chooses which stays. When a Queixa contradicts the Kit de marca, the Diretor offers a Kit learning, because the Caderno never changes the Kit.
- **A Rascunho de issue is published only after her approval.** It is a Gate at the close, in the same moment as the Kit learnings, and it is never automatic, whatever her Autonomia. Before she sees a draft, the Diretor strips her speech, names, brand and paths out of it. With her yes, the Diretor opens the issue with `gh` when it is authenticated, or hands her a pre-filled GitHub link (the repo is public). Drafts she declines stay in the Estúdio's `issues/` folder, where the maintainer can collect them. An issue on a public repo is indexed even after it is deleted, and the person running the plugin is the Criadora, not the maintainer.

What counts:

- **Potential bug:** a defect in the plugin itself — a script that fails or refuses wrongly, the installer, a wrong skill instruction, a check that lets through or blocks the wrong thing. A problem in her environment is only a Solução. A Solução that works around plugin behaviour also produces a Rascunho de issue.
- **Self-evolution:** the internal Crítico loop reaches its 3-turn cap on the same rejection code, or the same Solução or Queixa shows up in 2 or more Vídeos. The affected persona writes what process or skill it would need; the Diretor drafts the issue.

Considered and rejected:

- Personas writing to the Caderno directly, or one file per persona. The first races; the second scatters what the Diretor must read.
- The Diretor opening issues on its own with `gh`. It is public and irreversible, and it could leak her content.
- Local drafts only. They would rarely reach the maintainer.
