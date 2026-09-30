// The Perfil schema: who the Criadora is, written once by the Entrevistador (the Perfil
// Grilling) and edited with /estudio:perfil. The document is pt-BR; its frontmatter holds
// one key per Grilling question, so skills and `estado` read the same answers:
//
//   quem-sou             who she is (free text)
//   trabalho             what she makes, and for whom (free text)
//   rotina               when she records and edits (free text)
//   tempo-para-aprovar   how much time she has to approve things (free text)
//   nivel-tecnico        iniciante | intermediário | avançado
//   tom                  explicar mais | decidir mais
//   autonomia            baixa | média | alta
//   decide-voce          list of the keys above she left to the Diretor ("decide você"):
//                        their values are the Diretor's recommendation, an assumed default
//
// Choice values are matched ignoring accents and case ("media" is "média") and reported in
// their canonical pt-BR spelling.
const FREE_TEXT = ['quem-sou', 'trabalho', 'rotina', 'tempo-para-aprovar'];
const CHOICES = {
  'nivel-tecnico': ['iniciante', 'intermediário', 'avançado'],
  tom: ['explicar mais', 'decidir mais'],
  autonomia: ['baixa', 'média', 'alta'],
};
export const PERFIL_QUESTIONS = [...FREE_TEXT, ...Object.keys(CHOICES)];

const fold = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

function choice(key, value) {
  if (typeof value !== 'string') return null;
  return CHOICES[key].find((option) => fold(option) === fold(value)) ?? null;
}

// Returns the Perfil's reported fields and the validation messages (empty when valid).
// A choice that fails validation is reported as null; callers act only when `errors` is empty.
export function readPerfil(data) {
  const messages = [];
  const answered = (key) => data[key] != null && String(data[key]).trim() !== '';
  for (const key of PERFIL_QUESTIONS) {
    if (!answered(key)) messages.push(`missing answer "${key}"`);
  }
  const values = {};
  for (const [key, options] of Object.entries(CHOICES)) {
    values[key] = choice(key, data[key]);
    if (answered(key) && !values[key]) messages.push(`${key} ${JSON.stringify(data[key])} must be one of: ${options.join(', ')}`);
  }
  let decideVoce = data['decide-voce'] ?? [];
  if (!Array.isArray(decideVoce)) {
    messages.push('decide-voce must be a list of question keys');
    decideVoce = [];
  }
  for (const key of decideVoce) {
    if (!PERFIL_QUESTIONS.includes(key)) messages.push(`decide-voce names an unknown question ${JSON.stringify(key)}`);
  }
  return {
    messages,
    fields: { autonomia: values.autonomia, tom: values.tom, nivelTecnico: values['nivel-tecnico'], decideVoce },
  };
}
