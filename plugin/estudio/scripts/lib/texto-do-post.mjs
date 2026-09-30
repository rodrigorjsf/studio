// `texto-do-post`: the mechanical check of a Vídeo's Texto do post, the words the Criadora pastes
// into each app (`entrega/texto-do-post.md`, written by the Social media). It enforces only the
// bright-line rules the platforms publish, so the Social media fixes what it reports before any
// Crítico sees the text. It enforces only what can be measured: the Kit's platforms, hashtag counts,
// the Shorts title's length and the filler tags (the official bright lines and YouTube's title
// limit); judging honesty, engagement bait and the keyword stays with the Revisor de plataforma.
//
// The file is pt-BR markdown with one `## ` section per platform of the Vídeo's Kit
// (`plataformas`: reels, tiktok, shorts), each headed by the platform's name:
//
//   # Texto do post
//
//   ## Reels
//   <first line with the main keyword>
//   <short text>
//   #hashtag #hashtag
//
//   ## Shorts
//   **Título:** <title, at most 100 characters, no hashtag>
//   <text, with two or three hashtags>
//
// It checks: each platform of the Kit has a section and no other section exists; a Shorts section
// has a title within 100 characters and free of hashtags; Instagram (Reels) has at most 5
// hashtags; no platform has more than 60; none is a generic filler tag (`#fyp`, `#viral`, …).
import fs from 'node:fs';
import path from 'node:path';
import { nfc } from './estado.mjs';
import { PLATAFORMAS, plataformasDoKit } from './kit.mjs';
import { ENTREGA, KIT, TEXTO_DO_POST, VIDEO_KIT } from './layout.mjs';
import { findVideo } from './video.mjs';
import { isObject, readJson } from './valores.mjs';

// Each platform of the Kit: the heading the Social media writes and the names a heading may carry
// (matched on its letters and digits alone, in lower case). One row per platform of `PLATAFORMAS`.
const PLATFORMS = {
  reels: { heading: 'Reels', names: ['reels', 'instagram', 'instagramreels'] },
  tiktok: { heading: 'TikTok', names: ['tiktok'] },
  shorts: { heading: 'Shorts', names: ['shorts', 'youtube', 'youtubeshorts'] },
};

const INSTAGRAM_MAX_HASHTAGS = 5; // since 2025-12-18, platform-rules.md
const MAX_HASHTAGS = 60; // YouTube ignores every hashtag past this; the check applies it to every platform
const SHORTS_TITLE_MAX = 100;
// Generic filler tags no platform says help (platform-rules.md, "Forbidden filler hashtags").
const FILLER_HASHTAGS = new Set(['fyp', 'fypage', 'foryou', 'foryoupage', 'viral', 'explore', 'explorepage', 'reels', 'trending']);

// A hashtag: `#` then letters, digits and underscores, with at least one letter. Two glued
// together ("#a#fyp") are two; an HTML entity ("&#39;") is none.
const HASHTAG = /(?<!&)#([\p{L}\p{N}_]*\p{L}[\p{L}\p{N}_]*)/gu;
const TITLE_LINE = /^\s*\*{0,2}T[íi]tulo\*{0,2}\s*:\s*\*{0,2}\s*(.*?)\s*$/iu;

const hashtagsOf = (text) => [...text.matchAll(HASHTAG)].map((m) => m[1].toLowerCase());
const slugOf = (heading) => heading.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const platformOf = (heading) => PLATAFORMAS.find((p) => PLATFORMS[p].names.includes(slugOf(heading))) ?? null;

// The `## ` sections of the text: [{heading, lines}], in order. Text before the first section (the
// file's own `# ` title) belongs to none.
function sectionsOf(markdown) {
  const sections = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line)) fenced = !fenced;
    const heading = fenced ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) sections.push({ heading: heading[1], lines: [] });
    else sections.at(-1)?.lines.push(line);
  }
  return sections;
}

// The problems of one platform's section, in reading order.
function sectionProblems(platform, lines) {
  const problems = [];
  const say = (message) => problems.push(`${platform}: ${message}`);
  const body = [];
  let title = null;
  for (const line of lines) {
    const match = platform === 'shorts' && title === null ? TITLE_LINE.exec(line) : null;
    if (match) title = match[1].replace(/\*+$/, '').trim(); // a title wrapped in bold loses its closing **
    else body.push(line);
  }

  if (body.join('').trim() === '') say('has no text');
  if (platform === 'shorts') {
    if (title === null || title === '') say('needs a title (a line "**Título:** …")');
    else {
      const length = [...title].length;
      if (length > SHORTS_TITLE_MAX) say(`title is ${length} characters, at most ${SHORTS_TITLE_MAX}`);
      if (hashtagsOf(title).length > 0) say('title must not hold hashtags (they go in the description)');
    }
  }

  const tags = hashtagsOf(`${title ?? ''}\n${body.join('\n')}`);
  if (platform === 'reels' && tags.length > INSTAGRAM_MAX_HASHTAGS) {
    say(`has ${tags.length} hashtags, Instagram allows at most ${INSTAGRAM_MAX_HASHTAGS}`);
  }
  if (tags.length > MAX_HASHTAGS) say(`has ${tags.length} hashtags, more than ${MAX_HASHTAGS} and they are all ignored`);
  const filler = [...new Set(tags.filter((tag) => FILLER_HASHTAGS.has(tag)))];
  if (filler.length > 0) say(`generic filler hashtags help no one, remove ${filler.map((tag) => `#${tag}`).join(', ')}`);
  return problems;
}

export function textoDoPost(folder, projetoNome, videoNome) {
  const { projeto, video, dir, refusal } = findVideo(folder, projetoNome, videoNome);
  if (refusal) return { checked: false, ...refusal };
  const file = path.join(dir, ENTREGA, TEXTO_DO_POST);
  if (!fs.existsSync(file)) return { checked: false, reason: 'no-texto', projeto, video };

  // The Vídeo follows its own Kit copy when it has one, else the Projeto's.
  const ownKit = path.join(dir, VIDEO_KIT);
  const kit = readJson(fs.existsSync(ownKit) ? ownKit : path.join(dir, '..', '..', KIT));
  // A Kit whose platform list is not a non-empty list of the platforms the studio writes for is the
  // Kit's to fix (`estado` reports it too).
  const listed = isObject(kit) ? kit.plataformas : null;
  if (!isObject(kit) || (listed !== undefined && (!Array.isArray(listed) || listed.length === 0 || !listed.every((p) => PLATAFORMAS.includes(p))))) {
    return { checked: false, reason: 'invalid-kit', projeto, video };
  }
  const plataformas = plataformasDoKit(kit);

  const problemas = [];
  const seen = new Set();
  for (const { heading, lines } of sectionsOf(nfc(fs.readFileSync(file, 'utf8')))) {
    const platform = platformOf(heading);
    if (!platform) {
      problemas.push(`section "${heading}" names no platform of the Kit (${plataformas.join(', ')}): remove it`);
    } else if (!plataformas.includes(platform)) {
      problemas.push(`${platform}: the Kit does not post there (${plataformas.join(', ')}), remove its section`);
    } else if (seen.has(platform)) {
      problemas.push(`${platform}: has more than one section`);
    } else {
      seen.add(platform);
      problemas.push(...sectionProblems(platform, lines));
    }
  }
  for (const platform of plataformas.filter((p) => !seen.has(p))) {
    problemas.push(`${platform}: has no section ("## ${PLATFORMS[platform].heading}"), the Kit posts there`);
  }
  return { checked: true, projeto, video, plataformas, problemas, pronto: problemas.length === 0 };
}
