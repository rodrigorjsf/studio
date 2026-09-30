// The Projeto briefing (`projeto.md`): one pt-BR section per topic of the Projeto Grilling.
// Each section starts as a placeholder; a section still holding it has not been answered,
// which is how `estado` tells an interrupted Grilling from one ready for the Kit approval Gate.

// The Grilling's catalogue, in the order the Entrevistador asks it. The Criadora reads this
// file, so the headings are pt-BR.
export const BRIEFING_SECTIONS = [
  'Negócio',
  'Público',
  'Tom de voz',
  'Referências',
  'Comportamento de câmera',
  'Enquadramento',
  'Prints',
  'Interação com imagens',
  'Animações',
  'Ritmo',
  'Legendas',
  'Cores',
  'Som',
  'Música',
  'Entregáveis',
  'Orçamento de créditos',
];

const PLACEHOLDER = '_A preencher na entrevista._';

export function briefingTemplate(nome, createdAt) {
  const sections = BRIEFING_SECTIONS.map((title) => `## ${title}\n\n${PLACEHOLDER}\n`).join('\n');
  return `---\nnome: "${nome}"\ncriadoEm: ${createdAt}\n---\n# ${nome}\n\n${sections}`;
}

// How many sections still wait for her answer.
export const unansweredSections = (text) => text.split(PLACEHOLDER).length - 1;
