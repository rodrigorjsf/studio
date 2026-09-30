// The base of every Vídeo's edit (`locked-final-cut`): her Master as ONE continuous layer, with
// its original audio, from the first frame to the last; everything the Plano adds is drawn on
// top of it as children. The composition lasts exactly as long as the Master, so the Entrega
// keeps its duration (±1 frame) and her voice plays once, untouched.
//
// Rules for a Vídeo composition built on it (src/videos/<slug>/):
//   - never add another unmuted <Video> or <Audio> of the Master: a second copy doubles her voice;
//     a split screen or a camera card that shows the Master again uses <MutedMaster>;
//   - never trim, loop, speed up or re-time the Master (no Sequence around it, no playbackRate);
//   - register it with calculateMetadata={calculateEdicaoMetadata} and the props of EdicaoProps,
//     `duracao` being the Master's duration in seconds as ffprobe reads it.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Video} from '@remotion/media';
import {calculateKitMetadata, DEFAULT_KIT, KitProps} from './kit';
import {KitCaptions, Word, useKitFonts} from './marca';

export const EDICAO_FPS = 30;

export type EdicaoProps = KitProps & {
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

export const calculateEdicaoMetadata = async <P extends EdicaoProps>(
  parametros: Parameters<typeof calculateKitMetadata<P>>[0],
) => ({
  ...(await calculateKitMetadata<P>(parametros)),
  fps: EDICAO_FPS,
  durationInFrames: Math.max(1, Math.round(parametros.props.duracao * EDICAO_FPS)),
});

// A file of the Vídeo folder (projetos/<projeto>/videos/<video>/<arquivo>), as the template serves it.
export const videoFile = (projeto: string, video: string, arquivo: string) => staticFile(`${projeto}/videos/${video}/${arquivo}`);

// Her Master again, silent: for a split screen or a camera card drawn over the edit.
export const MutedMaster: React.FC<{projeto: string; video: string; master: string; style?: React.CSSProperties}> = ({
  projeto, video, master, style,
}) => <Video src={videoFile(projeto, video, master)} muted objectFit="cover" style={{width: '100%', height: '100%', ...style}} />;

// A Nível 2 asset generated on Higgsfield, from the Vídeo's gerados/ folder (`arquivo` as gerados.json
// records it, e.g. "gerados/03_broll_ampulheta.mp4"), or a stretch Higgsedit montaged on her request,
// from its higgsedit/ folder: an image, or a clip that is always muted, so her original audio stays
// the edit's only sound. It fills the frame over the Master; place it inside a <Sequence>.
const CLIPE = /\.(mp4|mov|webm)$/i;
export const Gerado: React.FC<{projeto: string; video: string; arquivo: string; style?: React.CSSProperties}> = ({
  projeto, video, arquivo, style,
}) => {
  const src = videoFile(projeto, video, arquivo);
  const estilo: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', ...style};
  return <AbsoluteFill>{CLIPE.test(arquivo) ? <Video src={src} muted objectFit="cover" style={estilo} /> : <Img src={src} style={estilo} />}</AbsoluteFill>;
};

export const Edicao: React.FC<EdicaoProps & {children?: React.ReactNode}> = ({
  projeto, video, master, sobreposicao = false, kit = DEFAULT_KIT, children,
}) => (
  <AbsoluteFill style={{background: sobreposicao ? 'transparent' : kit.cores.fundo}}>
    {sobreposicao ? null : (
      <Video src={videoFile(projeto, video, master)} objectFit="cover" style={{width: '100%', height: '100%'}} />
    )}
    {children}
  </AbsoluteFill>
);

// The simplest edit: her Master with the Kit's captions. Registered as `EdicaoComLegendas`;
// a starting point, and the proof the base keeps the Master's duration and voice.
export type PropsDaEdicaoComLegendas = EdicaoProps & {
  // The words she says, from palavras.json, as {texto: w, inicio: s}.
  legenda?: Word[];
};

export const EdicaoComLegendas: React.FC<PropsDaEdicaoComLegendas> = (props) => {
  const kit = props.kit ?? DEFAULT_KIT;
  useKitFonts(kit, props.projeto);
  return (
    <Edicao {...props}>
      <KitCaptions kit={kit} palavras={props.legenda ?? []} />
    </Edicao>
  );
};

// Deprecated aliases: the helpers were Portuguese before they were renamed to English. They keep
// a Vídeo composition written against the old names compiling; new code uses the names above.
// Removed in a later breaking release, once every Estúdio has refreshed its shared code.
/** @deprecated Use `EDICAO_FPS`. */
export const FPS_DA_EDICAO = EDICAO_FPS;
/** @deprecated Use `EdicaoProps`. */
export type PropsDaEdicao = EdicaoProps;
/** @deprecated Use `calculateEdicaoMetadata`. */
export const calcularMetadadosDaEdicao = calculateEdicaoMetadata;
/** @deprecated Use `videoFile`. */
export const arquivoDoVideo = videoFile;
/** @deprecated Use `MutedMaster`. */
export const MasterMudo = MutedMaster;
