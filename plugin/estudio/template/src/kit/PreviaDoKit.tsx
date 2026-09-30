// "Prévia do Kit": the Projeto's Kit de marca drawn on one frame — background, title,
// text, highlight, logo, caption style and entrance motion. It shows her the look before a
// Vídeo is built, and it is the reference for how a Vídeo composition reads the Kit: every
// value on screen comes from the `kit` prop, none is written here.
import React from 'react';
import {AbsoluteFill, Img, useVideoConfig} from 'remotion';
import {projectFile, DEFAULT_KIT, KitProps, scaleToFrame} from '../_shared/kit';
import {fontStyle, KitCaptions, Word, useKitEntrance, useKitFonts} from '../_shared/marca';

// Sample copy only (pt-BR, what she reads on the preview). Brand values come from the Kit.
const SAMPLE_TITLE = 'Seu título aqui';
const SAMPLE_TEXT = 'Assim fica o texto dos seus vídeos.';
const FALA: Word[] = ['Assim', 'ficam', 'as', 'legendas', 'do', 'seu', 'vídeo'].map((texto, i) => ({
  texto,
  inicio: 0.2 + i * 0.3,
}));

export const PreviaDoKit: React.FC<KitProps> = ({projeto, kit = DEFAULT_KIT}) => {
  const {width, height} = useVideoConfig();
  useKitFonts(kit, projeto);
  const entrada = useKitEntrance(kit, 0);
  const {cores, tipografia} = kit;
  const px = (tamanho: number) => scaleToFrame(tamanho, width, height);
  const logo = projeto ? kit.ativos.logos[0] : undefined;

  return (
    <AbsoluteFill style={{background: cores.fundo}}>
      <AbsoluteFill
        style={{
          justifyContent: 'center', padding: '0 10%', gap: px(28),
          opacity: entrada, transform: `translateY(${(1 - entrada) * px(40)}px)`,
        }}
      >
        {logo ? <Img src={projectFile(projeto, logo)} style={{height: px(120), objectFit: 'contain', alignSelf: 'flex-start'}} /> : null}
        <div style={{...fontStyle(tipografia.titulo), fontSize: px(tipografia.escala.titulo), color: cores.primaria, lineHeight: 1.05}}>
          {SAMPLE_TITLE}
        </div>
        <div style={{width: px(160), height: px(14), background: cores.destaque}} />
        <div style={{...fontStyle(tipografia.texto), fontSize: px(tipografia.escala.corpo), color: cores.texto, lineHeight: 1.3}}>
          {SAMPLE_TEXT}
        </div>
      </AbsoluteFill>
      <KitCaptions kit={kit} palavras={FALA} />
    </AbsoluteFill>
  );
};
