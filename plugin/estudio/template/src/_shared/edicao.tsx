// The base of every Vídeo's edit (`locked-final-cut`): her Master as ONE continuous layer, with
// its original audio, from the first frame to the last; everything the Plano adds is drawn on
// top of it as children. The composition lasts exactly as long as the Master, so the Entrega
// keeps its duration (±1 frame) and her voice plays once, untouched.
//
// Rules for a Vídeo composition built on it (src/videos/<slug>/):
//   - never add another unmuted <Video> or <Audio> of the Master: a second copy doubles her voice;
//     a split screen or a camera card that shows the Master again uses <MasterMudo>;
//   - never trim, loop, speed up or re-time the Master (no Sequence around it, no playbackRate);
//   - register it with calculateMetadata={calcularMetadadosDaEdicao} and the props of PropsDaEdicao,
//     `duracao` being the Master's duration in seconds as ffprobe reads it.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {calcularMetadadosDoKit, KIT_PADRAO, PropsDoKit} from './kit';
import {LegendaDoKit, Palavra, useFontesDoKit} from './marca';

export const FPS_DA_EDICAO = 30;

export type PropsDaEdicao = PropsDoKit & {
  // The Vídeo folder name (projetos/<projeto>/videos/<video>).
  video: string;
  // The Master, relative to the Vídeo folder: the `master` field of video.md.
  master: string;
  // The Master's duration in seconds, from ffprobe: the edit lasts exactly this long.
  duracao: number;
  // true = only what is drawn on top, over a transparent background, with no Master and no
  // audio: the overlay she asked for to finish in another editor (render it as ProRes 4444).
  sobreposicao?: boolean;
};

export const calcularMetadadosDaEdicao = async <P extends PropsDaEdicao>(
  parametros: Parameters<typeof calcularMetadadosDoKit<P>>[0],
) => ({
  ...(await calcularMetadadosDoKit<P>(parametros)),
  fps: FPS_DA_EDICAO,
  durationInFrames: Math.max(1, Math.round(parametros.props.duracao * FPS_DA_EDICAO)),
});

// A file of the Vídeo folder (projetos/<projeto>/videos/<video>/<arquivo>), as the template serves it.
export const arquivoDoVideo = (projeto: string, video: string, arquivo: string) => staticFile(`${projeto}/videos/${video}/${arquivo}`);

// Her Master again, silent: for a split screen or a camera card drawn over the edit.
export const MasterMudo: React.FC<{projeto: string; video: string; master: string; style?: React.CSSProperties}> = ({
  projeto, video, master, style,
}) => <Video src={arquivoDoVideo(projeto, video, master)} muted objectFit="cover" style={{width: '100%', height: '100%', ...style}} />;

// A Nível 2 asset generated on Higgsfield, from the Vídeo's gerados/ folder (`arquivo` as gerados.json
// records it, e.g. "gerados/03_broll_ampulheta.mp4"): an image, or a clip that is always muted, so her
// original audio stays the edit's only sound. It fills the frame over the Master; place it inside a <Sequence>.
const CLIPE = /\.(mp4|mov|webm)$/i;
export const Gerado: React.FC<{projeto: string; video: string; arquivo: string; style?: React.CSSProperties}> = ({
  projeto, video, arquivo, style,
}) => {
  const src = arquivoDoVideo(projeto, video, arquivo);
  const estilo: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', ...style};
  return <AbsoluteFill>{CLIPE.test(arquivo) ? <Video src={src} muted objectFit="cover" style={estilo} /> : <Img src={src} style={estilo} />}</AbsoluteFill>;
};

export const Edicao: React.FC<PropsDaEdicao & {children?: React.ReactNode}> = ({
  projeto, video, master, sobreposicao = false, kit = KIT_PADRAO, children,
}) => (
  <AbsoluteFill style={{background: sobreposicao ? 'transparent' : kit.cores.fundo}}>
    {sobreposicao ? null : (
      <Video src={arquivoDoVideo(projeto, video, master)} objectFit="cover" style={{width: '100%', height: '100%'}} />
    )}
    {children}
  </AbsoluteFill>
);

// The simplest edit: her Master with the Kit's captions. Registered as `EdicaoComLegendas`;
// a starting point, and the proof the base keeps the Master's duration and voice.
export type PropsDaEdicaoComLegendas = PropsDaEdicao & {
  // The words she says, from palavras.json, as {texto: w, inicio: s}.
  legenda?: Palavra[];
};

export const EdicaoComLegendas: React.FC<PropsDaEdicaoComLegendas> = (props) => {
  const kit = props.kit ?? KIT_PADRAO;
  useFontesDoKit(kit, props.projeto);
  return (
    <Edicao {...props}>
      <LegendaDoKit kit={kit} palavras={props.legenda ?? []} />
    </Edicao>
  );
};
