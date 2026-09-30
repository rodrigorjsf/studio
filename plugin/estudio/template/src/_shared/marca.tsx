// Pieces every Vídeo composition builds from, all driven by the Kit de marca: fonts, the
// entrance motion and the caption style. A composition that uses them never writes a color,
// a font or a caption rule of its own, so every Vídeo of a Projeto looks like the same brand.
import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {arquivoDoProjeto, Fonte, Kit, tamanhoNoQuadro} from './kit';

export const estiloDaFonte = (fonte: Fonte): React.CSSProperties => ({
  fontFamily: `"${fonte.familia}", system-ui, sans-serif`,
  fontWeight: fonte.peso,
});

// Loads the font files the Kit carries (`tipografia.*.arquivo`) before any frame is drawn.
// A font without a file is used by its family name, as installed on the computer.
export const useFontesDoKit = (kit: Kit, projeto: string) => {
  const [espera] = useState(() => delayRender('Carregando as fontes do Kit de marca'));
  useEffect(() => {
    const comArquivo = [kit.tipografia.titulo, kit.tipografia.texto].filter((fonte) => projeto && fonte.arquivo);
    Promise.all(
      comArquivo.map(async (fonte) => {
        const url = arquivoDoProjeto(projeto, fonte.arquivo as string);
        const face = new FontFace(fonte.familia, `url("${url}")`, {weight: String(fonte.peso)});
        document.fonts.add(await face.load());
      }),
    )
      .then(() => continueRender(espera))
      .catch((erro) => cancelRender(erro));
  }, [espera, kit, projeto]);
};

// Entrance progress 0 → 1 starting at `inicio` seconds and lasting the Kit's `movimento.entradaMs`.
export const useEntradaDoKit = (kit: Kit, inicio: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fim = inicio + kit.movimento.entradaMs / 1000;
  return interpolate(frame, [inicio * fps, fim * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
};

// A spoken word with its time in seconds, as in the transcription's palavras.json.
export type Palavra = {texto: string; inicio: number};

// Where each caption position sits, as a fraction of the frame height.
const POSICAO_DA_LEGENDA = {superior: {top: '14%'}, centro: {top: '50%', transform: 'translateY(-50%)'}, inferior: {bottom: '22%'}} as const;

// The Projeto's caption style: groups of `palavrasPorVez` words. With the style
// "palavra-destacada" (the default) the word being spoken takes the highlight color; any
// other style shows the group in one color. No word appears before it is said.
export const LegendaDoKit: React.FC<{kit: Kit; palavras: Palavra[]}> = ({kit, palavras}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {legendas, tipografia} = kit;
  const agora = frame / fps;
  const faladas = palavras.filter((palavra) => palavra.inicio <= agora);
  if (!legendas.ativas || faladas.length === 0) return null;

  const atual = faladas.length - 1;
  const inicioDoGrupo = atual - (atual % legendas.palavrasPorVez);
  const grupo = faladas.slice(inicioDoGrupo);
  const destacar = legendas.estilo === 'palavra-destacada' && legendas.destaque !== null;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute', left: '8%', right: '8%', ...POSICAO_DA_LEGENDA[legendas.posicao],
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.25em',
          ...estiloDaFonte(tipografia[legendas.fonte]),
          fontSize: tamanhoNoQuadro(legendas.tamanho, width, height),
          color: legendas.cor,
          textTransform: legendas.caixaAlta ? 'uppercase' : 'none',
          lineHeight: 1.2,
        }}
      >
        {grupo.map((palavra, i) => (
          <span
            key={`${palavra.inicio}-${i}`}
            style={{color: destacar && inicioDoGrupo + i === atual ? legendas.destaque ?? legendas.cor : legendas.cor}}
          >
            {palavra.texto}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
