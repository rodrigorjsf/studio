# Kit de marca schema (`kit.json`)

The Kit de marca is the Projeto's machine-readable identity: `projetos/<projeto>/kit.json` in the Estúdio. The Remotion compositions and the brand Crítico read the same values, so every field has a fixed type. `estado` checks the schema and reports every problem as `field problem` under `errors`. `aprovar-kit` refuses a Kit with any problem.

In the Estúdio's Remotion template, `src/_shared/kit.ts` loads this file for every composition and `src/kit/PreviaDoKit.tsx` draws it on one frame (the "Prévia do Kit"); the defaults below live in `src/_shared/kit-padrao.json`, the one file both `novo-projeto` and the template read.

`novo-projeto` writes a complete, valid Kit with the defaults below. Those defaults are also what "decide você" means when the Criadora has no preference. Change only the fields her answers settle, and keep the rest. Keys are pt-BR, like every document in the Estúdio. Unknown extra keys are allowed but are not read by anything yet, so do not invent new ones.

## Fields

| Field | Type | Default | Grilling topic that fills it |
|---|---|---|---|
| `schemaVersion` | always `1` | `1` | none |
| `aprovadoEm` | ISO date or `null` | `null` | Set only by `aprovar-kit`. Never write it yourself. |
| `formato` | `"9:16"`, `"16:9"` or `"1:1"`; it must also be listed in `entregaveis.formatos` | `"9:16"` | Entregáveis |
| `cores` | map of name to `"#RRGGBB"`. It must have `primaria`, `destaque`, `fundo` and `texto`. More names are allowed (e.g. `secundaria`). | `#111111` / `#FFD400` / `#FFFFFF` / `#111111` | Cores, Referências |
| `tipografia.titulo`, `tipografia.texto` | `{familia, peso (100–900), arquivo (asset or null)}` | Inter 800 / Inter 500, no file | Referências, Legendas |
| `tipografia.escala` | map of role to size in px at 1080 px width. It must have `titulo` and `corpo`. | `96` / `48` | Animações |
| `legendas` | `{ativas, estilo, fonte ("titulo"/"texto"), tamanho, cor, destaque (color or null), posicao ("superior"/"centro"/"inferior"), caixaAlta, palavrasPorVez}` | on, `"palavra-destacada"`, `"texto"`, 56, white, yellow, `"inferior"`, false, 3 | Legendas |
| `movimento` | `{intensidade ("sutil"/"equilibrada"/"dominante"), ritmo ("calmo"/"equilibrado"/"acelerado"), entradaMs, transicao, recursos: text[]}` | equilibrada, equilibrado, 300, `"corte"`, `[]` | Animações, Ritmo |
| `camera` | `{comportamento, enquadramento}` (text) | empty | Comportamento de câmera, Enquadramento |
| `zonaDoRosto` | map of recording setup name to `{x, y, largura, altura}`, as fractions 0–1 of the frame | `{}` | Enquadramento. The values are only a starting guess; each Vídeo measures the real face zone from its frames. |
| `imagens` | `{prints, interacao}` (text) | Prints shown whole, with the highlighter on the quoted phrase | Prints, Interação com imagens |
| `som` | `{efeitos}` (text) | `"sutis"` | Som |
| `musica.politica` | `"no-app"` (she adds music in Instagram/TikTok), `"arquivo-dela"` (she supplies a file), `"sem-musica"` | `"no-app"` | Música |
| `entregaveis` | `{formatos: non-empty list of Formato, overlays: bool}` | `["9:16"]`, false | Entregáveis |
| `creditos` | `{porVideo, porMes}`: Higgsfield credits (0 or more), or `null` when not set | both `null` | Orçamento de créditos |
| `fazer`, `evitar` | text[] | `[]` | any topic ("sempre…", "nunca…") |
| `glossario` | text[]: names, brands and jargon the transcription must spell right | `[]` | Negócio, Público |
| `referencias` | `[{arquivo (asset), nota}]` | `[]` | Referências |
| `ativos` | `{logos: asset[], fontes: asset[], cartaoFinal: asset or null, outros: asset[]}` | all empty | Referências, Entregáveis |

An **asset** is a path from the Projeto folder into its `kit/` folder, with `/` separators. Examples: `"kit/logo.png"`, `"kit/referencias/estilo.jpg"`. The file must exist; `estado` reports a missing one as `file not found`.

## Changing an approved Kit, and each Vídeo's own Kit

Once approved, the Kit changes only through `editar-kit` (the `editar-projeto` skill). The command re-validates the changed Kit, refuses a change that would break it, and stamps the new Kit approved. Before the Projeto's `kit.json` changes, every existing Vídeo without a Kit of its own gets a copy of the current one at `videos/<vídeo>/kit.json` (its Kit snapshot). Re-running `aprovar-kit` on an approved Kit does the same. `estado` validates each Vídeo's own Kit against this schema too.

**A Vídeo reads its own `kit.json` when it has one, and the Projeto's `kit.json` otherwise.** A Vídeo moves to the Projeto's current Kit only when the Criadora opts in (`atualizar-kit-video`); a delivered or archived Vídeo never does. Asset paths in a Vídeo's Kit still point into the Projeto's `kit/` folder, so a file there is never overwritten or deleted.

## When the Kit defines the style

A Kit **defines the style** when none of its text fields is empty (`""`): the fields she left as "sem preferência" in the Projeto interview, such as `camera.comportamento`, `camera.enquadramento` or `imagens.interacao`. The `plano` command lists them as `lacunasDoKit`. With none, one Gate approves a Vídeo's Plano and its Quadros de estilo together; with any, the look is still open and the Quadros get a Gate of their own after the Plano's. Filling those fields (`editar-kit`) makes the next Vídeos take one Gate.

## What stays in the briefing, not the Kit

Business, audience and tone of voice are prose. They live in the pt-BR briefing `projeto.md` under their sections. The Kit holds only what a composition or a Crítico can apply mechanically.
