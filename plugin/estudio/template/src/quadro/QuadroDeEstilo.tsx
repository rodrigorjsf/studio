// "Quadro de estilo": one still of the look proposed for a Vídeo, drawn on a real frame of her
// recording (the Master) at the moment the Plano names. The Diretor de arte renders two or three,
// one per label, with `npx remotion still … QuadroDeEstilo --frame=<tempo × 30>`; she approves
// the look on them before anything is built. Every brand value comes from the Kit the Vídeo
// follows (its own Kit snapshot, else the Projeto's), none is written here.
import React from 'react';
import {AbsoluteFill, staticFile, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import {calculateKitMetadata, DEFAULT_KIT, KitProps, scaleToFrame} from '../_shared/kit';
import {fontStyle, KitCaptions, Word, useKitFonts} from '../_shared/marca';

// A box as fractions of the frame from its top-left corner, like the Plano's `area`.
// `largura`/`altura` stay Portuguese on purpose: they are a data contract, not a helper name. The
// Diretor de arte passes the Plano element's `area` straight through as this prop, and the same
// {x, y, largura, altura} box is what the plugin's `plano` check validates, what the Zona do rosto
// and the Kit store, and what the Planos already on her disk hold. Renaming the fields is a data
// migration across all of those, not a deprecated alias, so it is deferred.
export type Area = {x: number; y: number; largura: number; altura: number};

export type QuadroDeEstiloProps = KitProps & {
  video: string;
  // The Master, relative to the Vídeo folder: `original/<her file>` until a Pré-corte.
  master: string;
  // The Master's duration in seconds (zona-do-rosto.json `duracao`): the still is taken on its clock.
  duracao: number;
  // The text the direction shows at that moment, and where (the Plano element's `area`); it must
  // sit inside the Área livre and off the Zona do rosto, as the `plano` check requires.
  titulo: string;
  area?: Area;
  // The words she says around that moment, from palavras.json ({texto: w, inicio: s}), for the caption.
  legenda?: Word[];
};

export const QUADRO_DE_ESTILO_FPS = 30;
const DEFAULT_AREA: Area = {x: 0.08, y: 0.6, largura: 0.84, altura: 0.14};

export const calculateQuadroDeEstiloMetadata = async (
  parametros: Parameters<typeof calculateKitMetadata<QuadroDeEstiloProps>>[0],
) => ({
  ...(await calculateKitMetadata<QuadroDeEstiloProps>(parametros)),
  durationInFrames: Math.max(1, Math.round(parametros.props.duracao * QUADRO_DE_ESTILO_FPS)),
});

export const QuadroDeEstilo: React.FC<QuadroDeEstiloProps> = ({
  projeto, video, master, titulo, area = DEFAULT_AREA, legenda = [], kit = DEFAULT_KIT,
}) => {
  const {width, height} = useVideoConfig();
  useKitFonts(kit, projeto);
  const {cores, tipografia} = kit;
  const px = (tamanho: number) => scaleToFrame(tamanho, width, height);

  return (
    <AbsoluteFill style={{background: cores.fundo}}>
      <Video src={staticFile(`${projeto}/videos/${video}/${master}`)} objectFit="cover" muted style={{width: '100%', height: '100%'}} />
      {titulo ? (
        <div
          style={{
            position: 'absolute', left: `${area.x * 100}%`, top: `${area.y * 100}%`,
            width: `${area.largura * 100}%`, height: `${area.altura * 100}%`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: px(14),
          }}
        >
          <div style={{...fontStyle(tipografia.titulo), fontSize: px(tipografia.escala.titulo), color: cores.primaria, lineHeight: 1.05}}>
            {titulo}
          </div>
          <div style={{width: px(160), height: px(14), background: cores.destaque}} />
        </div>
      ) : null}
      <KitCaptions kit={kit} palavras={legenda} />
    </AbsoluteFill>
  );
};

// Deprecated aliases: the helpers were Portuguese before they were renamed to English. They keep
// a Vídeo composition written against the old names compiling; new code uses the names above.
// Removed in a later breaking release, once every Estúdio has refreshed its shared code.
/** @deprecated Use `QuadroDeEstiloProps`. */
export type PropsDoQuadro = QuadroDeEstiloProps;
/** @deprecated Use `QUADRO_DE_ESTILO_FPS`. */
export const FPS_DO_QUADRO = QUADRO_DE_ESTILO_FPS;
/** @deprecated Use `calculateQuadroDeEstiloMetadata`. */
export const calcularMetadadosDoQuadro = calculateQuadroDeEstiloMetadata;
