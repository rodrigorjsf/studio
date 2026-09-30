# Estúdio

A Claude plugin that behaves like a professional video-editing studio for a small, part-time creator: a cast of personas moves each video through a pipeline of gated stages, guided by what the studio has stored about the creator and each of her projects. Canonical terms are the Portuguese words the creator sees; definitions are in English.

## Language

### People and roles

**Criadora**:
The person who records the videos and approves the studio's work; a small creator who edits alone while holding another job. The studio's only client.
_Avoid_: user, client, influencer, cliente

**Persona**:
One professional role of the studio, played by an agent with a fixed responsibility and a fixed model and effort.
_Avoid_: agent (when the role is meant), bot, worker

**Diretor**:
The persona that talks to the Criadora, runs every Gate, counts Rodadas and consolidates notes into one list. Also plays the producer.
_Avoid_: orchestrator, producer, manager

**Entrevistador**:
The persona that runs the Grilling for the Perfil, a Projeto or a Vídeo.
_Avoid_: interviewer bot, onboarding wizard

**Crítico**:
A persona that approves or rejects another persona's output and never edits it; there are three — QC técnico, Guardião da marca, Revisor de plataforma.
_Avoid_: reviewer (when the Criadora's review is meant), checker

**Autor**:
The persona that produced the artifact a Crítico judges. A Crítico is never the Autor of what it judges.
_Avoid_: maker, creator

### What the studio stores

**Estúdio (pasta)**:
The folder the Criadora opens in Claude that holds her Perfil, her Projetos and all their Vídeos. One folder is one studio.
_Avoid_: workspace, repo, project folder

**Perfil**:
Who the Criadora is: what she does, her routine and time to approve, technical level, preferred conversation tone and Autonomia. One per Estúdio.
_Avoid_: account, user profile, persona

**Autonomia**:
How much the Criadora delegates to the Diretor (baixa, média, alta); it decides which Gates become automatic, recorded approvals.
_Avoid_: trust level, automation level

**Projeto**:
One domain the Criadora edits for — e.g. her company account or her personal Instagram — holding its own briefing, Kit de marca and default technical choices. A Criadora has several.
_Avoid_: front, frente, brand, channel, client

**Kit de marca**:
The Projeto's persisted visual and sonic identity: colors, fonts, caption style, motion style, default Formato, music policy, credit budget and assets. Loaded before every Plano.
_Avoid_: brand kit (in chat), style guide, template

**Vídeo**:
One editing job inside a Projeto, from its short briefing to its Entrega, with its own Status, Rodadas and cost record.
_Avoid_: job, edit, episode, task

**Status**:
Where a Vídeo stands: Briefing, Planejamento, Construção, QC interno, Revisão (rodada N), Ajustes, Aprovado, Entregue, Arquivado.
_Avoid_: stage (for status), state

### The material

**Original**:
The file the Criadora recorded, kept untouched forever.
_Avoid_: raw, source video

**Master**:
The locked video the studio composes on top of: the Original itself, or the approved result of the Pré-corte. Never cut, reordered, sped up, recompressed or re-voiced.
_Avoid_: final cut, base video

**Pré-corte**:
The optional stage that removes silences and fumbles from the Original to produce a new Master, approved by the Criadora before it locks.
_Avoid_: rough cut, trim, pre-edit

**Página Notion**:
A page in the Criadora's own Notion that she links to a Projeto or a Vídeo as extra context (brand notes, calendar, script). Read only, never written.
_Avoid_: Notion integration, source, doc, fonte

**Resumo Notion**:
The dated summary of what the studio took from the linked Páginas Notion, stored with the Projeto or Vídeo; the only form in which Notion content reaches the personas.
_Avoid_: snapshot, export, cache

**Print**:
A screenshot the Criadora supplies as visual proof of what she mentions; always shown intact, highlighted exactly on the quoted phrase.
_Avoid_: image, capture, screenshot (in chat)

**Palavra-gatilho**:
The spoken word, with its exact start time, that makes an insert appear. Nothing appears before it is said.
_Avoid_: cue, keyword, trigger point

**Zona do rosto**:
The area of the frame where the face moves across the whole Vídeo, measured from real frames; nothing may cover it.
_Avoid_: face box, safe area (for the face)

**Área livre**:
The region of a vertical frame not covered by the platform's interface, where all text must sit.
_Avoid_: safe zone (in chat), margins

**Formato**:
The frame shape of a delivery: vertical 9:16 by default; horizontal 16:9 when asked.
_Avoid_: aspect, layout, ratio (in chat)

### The pipeline

**Esteira**:
The fixed sequence of stages every Vídeo passes through, from briefing to Entrega.
_Avoid_: workflow, pipeline (in chat), flow

**Grilling**:
The structured interview that settles what the studio needs to decide: in full once for the Perfil and each Projeto, briefly for each Vídeo ("use the Kit as is, or change X?").
_Avoid_: questionnaire, onboarding form, briefing call

**Gate**:
A point in the Esteira where work stops until the Criadora (or Autonomia) approves.
_Avoid_: checkpoint, milestone, approval step

**Plano**:
The Vídeo's approved edit plan: which scene appears when, triggered by which Palavra-gatilho, with expected time and cost.
_Avoid_: storyboard, script, edit decision list

**Quadro de estilo**:
One still frame showing the look proposed for a Vídeo, shown before building.
_Avoid_: mockup, style frame (in chat), preview

**Prévia do Kit**:
One frame drawing a Projeto's Kit de marca (colors, fonts, caption style) with sample copy, not with her footage. It shows the brand, not a Vídeo's look; for that, see Quadro de estilo.
_Avoid_: brand preview, style frame

**Rodada**:
One round of the Criadora's consolidated notes followed by a new version.
_Avoid_: iteration, revision (for the round itself), pass

**Nível**:
How the studio produces visuals: Nível 1 draws everything locally at no cost; Nível 2 adds AI-generated images and video paid with Higgsfield credits.
_Avoid_: tier, plan, mode

**Entrega**:
The finished file handed to the Criadora, in the requested Formato, inside the Vídeo's folder.
_Avoid_: export, output, render (for the delivered file)

**Preparação**:
The one-time download, after the Criadora agrees, of everything editing needs on her computer, including the speech model; afterwards, editing never reaches the network for tools or models.
_Avoid_: setup, install (for the whole step), onboarding

## Relationships

- An **Estúdio** holds one **Perfil** and many **Projetos**; a **Projeto** has one **Kit de marca** and many **Vídeos**.
- A **Vídeo** has one **Original** and one **Master**; the **Master** is the **Original** unless a **Pré-corte** was approved.
- The **Diretor** runs every **Gate**; every other **Persona** works between Gates and never asks the **Criadora** anything.
- Every artifact passes a **Crítico** that is not its **Autor** before it reaches the **Criadora**.
- A **Vídeo**'s briefing **Grilling** only asks what its **Projeto**'s **Kit de marca** does not already answer.
- A **Projeto** or **Vídeo** may link any number of **Páginas Notion**; the **Diretor** turns them into a **Resumo Notion**; the **Kit de marca** wins when they disagree.
