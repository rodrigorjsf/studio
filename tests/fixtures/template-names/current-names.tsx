// The same Vídeo composition as legacy-names.tsx, written against the template's English helper
// names. Copied into `src/videos/<slug>/` by tests/template-names.test.mjs.
import React from 'react';
import {Composition} from 'remotion';
import {
  calculateKitMetadata, DEFAULT_KIT, DIMENSIONS, Font, Kit, KitProps, loadKit, projectFile, scaleToFrame,
} from '../../_shared/kit';
import {fontStyle, KitCaptions, useKitEntrance, useKitFonts, Word} from '../../_shared/marca';
import {
  calculateEdicaoMetadata, Edicao, EDICAO_FPS, EdicaoProps, MutedMaster, videoFile,
} from '../../_shared/edicao';

const title: Font = DEFAULT_KIT.tipografia.titulo;
const words: Word[] = [{texto: 'olá', inicio: 0.1}];
const kitProps = {projeto: '', formato: null} satisfies KitProps;
const load: (projeto: string) => Promise<Kit> = (projeto) => loadKit(projeto);
const kitMetadata: Parameters<typeof calculateKitMetadata<KitProps>>[0] | null = null;

export const CurrentNames: React.FC<EdicaoProps> = (props) => {
  const kit = props.kit ?? DEFAULT_KIT;
  useKitFonts(kit, props.projeto);
  const entrance = useKitEntrance(kit, 0);
  return (
    <Edicao {...props}>
      <div style={{...fontStyle(title), opacity: entrance, fontSize: scaleToFrame(48, 1080, 1920)}}>
        <img src={projectFile(props.projeto, 'kit/logo.png')} alt="" />
        <img src={videoFile(props.projeto, props.video, 'prints/a.png')} alt="" />
      </div>
      <MutedMaster projeto={props.projeto} video={props.video} master={props.master} />
      <KitCaptions kit={kit} palavras={words} />
    </Edicao>
  );
};

export const RegisterCurrent: React.FC = () => (
  <Composition
    id="CurrentNames"
    component={CurrentNames}
    {...DIMENSIONS['9:16']}
    fps={EDICAO_FPS}
    durationInFrames={EDICAO_FPS}
    defaultProps={{...kitProps, video: '', master: '', duracao: 1}}
    calculateMetadata={calculateEdicaoMetadata}
  />
);

export const unused = {load, kitMetadata, calculateKitMetadata};
