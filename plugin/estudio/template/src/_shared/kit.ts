// The Kit de marca inside Remotion. Every composition of a Vídeo takes its colors, fonts,
// caption style, motion and Formato from the Projeto's `projetos/<projeto>/kit.json` (the
// same file the Guardião da marca reads), never from values written in the code.
//
// How a composition gets its Kit: register it with `calculateMetadata={calcularMetadadosDoKit}`
// and the props `{projeto, formato}`. Before rendering, Remotion loads the Kit, sets the frame
// size from the Formato and hands the Kit to the component as the `kit` prop.
//   projeto: the Projeto folder name, e.g. "Minha Empresa". Empty = the default Kit.
//   formato: null = the Kit's default Formato (9:16 unless she chose otherwise);
//            "16:9" or "1:1" = a variant she asked for.
import {CalculateMetadataFunction, staticFile} from 'remotion';
import kitPadrao from './kit-padrao.json';

export type Formato = '9:16' | '16:9' | '1:1';

export type Fonte = {familia: string; peso: number; arquivo: string | null};

// The part of kit.json a composition reads. The full schema is validated by `estado`.
export type Kit = {
  formato: Formato;
  cores: {primaria: string; destaque: string; fundo: string; texto: string} & Record<string, string>;
  tipografia: {
    titulo: Fonte;
    texto: Fonte;
    // Sizes in px at 1080 px width; use `tamanhoNoQuadro` to scale them to the frame.
    escala: {titulo: number; corpo: number} & Record<string, number>;
  };
  legendas: {
    ativas: boolean;
    estilo: string;
    fonte: 'titulo' | 'texto';
    tamanho: number;
    cor: string;
    destaque: string | null;
    posicao: 'superior' | 'centro' | 'inferior';
    caixaAlta: boolean;
    palavrasPorVez: number;
  };
  movimento: {
    intensidade: 'sutil' | 'equilibrada' | 'dominante';
    ritmo: 'calmo' | 'equilibrado' | 'acelerado';
    entradaMs: number;
    transicao: string;
    recursos: string[];
  };
  ativos: {logos: string[]; fontes: string[]; cartaoFinal: string | null; outros: string[]};
};

export const KIT_PADRAO = kitPadrao as Kit;

export const DIMENSOES: Record<Formato, {width: number; height: number}> = {
  '9:16': {width: 1080, height: 1920},
  '16:9': {width: 1920, height: 1080},
  '1:1': {width: 1080, height: 1080},
};

export type PropsDoKit = {
  projeto: string;
  formato: Formato | null;
  // Filled by calcularMetadadosDoKit; never set it by hand.
  kit?: Kit;
};

// A file of the Projeto (an asset such as "kit/logo.png"), served from the public folder.
export const arquivoDoProjeto = (projeto: string, caminho: string) => staticFile(`${projeto}/${caminho}`);

export const carregarKit = async (projeto: string, signal?: AbortSignal): Promise<Kit> => {
  if (!projeto) return KIT_PADRAO;
  const resposta = await fetch(arquivoDoProjeto(projeto, 'kit.json'), {signal});
  if (!resposta.ok) throw new Error(`Kit de marca não encontrado: projetos/${projeto}/kit.json`);
  return (await resposta.json()) as Kit;
};

export const calcularMetadadosDoKit = async <P extends PropsDoKit>({
  props,
  abortSignal,
}: Parameters<CalculateMetadataFunction<P>>[0]) => {
  const kit = await carregarKit(props.projeto, abortSignal);
  return {...DIMENSOES[props.formato ?? kit.formato], props: {...props, kit}};
};

// A Kit size (px at 1080 px width) scaled to the frame, so 9:16 and 16:9 keep proportions.
export const tamanhoNoQuadro = (px: number, larguraDoQuadro: number, alturaDoQuadro: number) =>
  (px * Math.min(larguraDoQuadro, alturaDoQuadro)) / 1080;
