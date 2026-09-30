// A Vídeo composition written before the template's helpers were renamed to English: it imports
// ONLY the old (deprecated) names. It must keep compiling, so every Estúdio the Criadora already
// has keeps working when its shared code is refreshed. Copied into `src/videos/<slug>/` by
// tests/template-names.test.mjs; never edit it to use a new name.
import React from 'react';
import {Composition} from 'remotion';
import {
  arquivoDoProjeto, calcularMetadadosDoKit, carregarKit, DIMENSOES, Fonte, Kit, KIT_PADRAO, PropsDoKit, tamanhoNoQuadro,
} from '../../_shared/kit';
import {estiloDaFonte, LegendaDoKit, Palavra, useEntradaDoKit, useFontesDoKit} from '../../_shared/marca';
import {
  arquivoDoVideo, calcularMetadadosDaEdicao, Edicao, FPS_DA_EDICAO, MasterMudo, PropsDaEdicao,
} from '../../_shared/edicao';

const titulo: Fonte = KIT_PADRAO.tipografia.titulo;
const falas: Palavra[] = [{texto: 'olá', inicio: 0.1}];
const kitProps = {projeto: '', formato: null} satisfies PropsDoKit;
const carregar: (projeto: string) => Promise<Kit> = (projeto) => carregarKit(projeto);
const metadadosDoKit: Parameters<typeof calcularMetadadosDoKit<PropsDoKit>>[0] | null = null;

export const LegacyNames: React.FC<PropsDaEdicao> = (props) => {
  const kit = props.kit ?? KIT_PADRAO;
  useFontesDoKit(kit, props.projeto);
  const entrada = useEntradaDoKit(kit, 0);
  return (
    <Edicao {...props}>
      <div style={{...estiloDaFonte(titulo), opacity: entrada, fontSize: tamanhoNoQuadro(48, 1080, 1920)}}>
        <img src={arquivoDoProjeto(props.projeto, 'kit/logo.png')} alt="" />
        <img src={arquivoDoVideo(props.projeto, props.video, 'prints/a.png')} alt="" />
      </div>
      <MasterMudo projeto={props.projeto} video={props.video} master={props.master} />
      <LegendaDoKit kit={kit} palavras={falas} />
    </Edicao>
  );
};

export const RegisterLegacy: React.FC = () => (
  <Composition
    id="LegacyNames"
    component={LegacyNames}
    {...DIMENSOES['9:16']}
    fps={FPS_DA_EDICAO}
    durationInFrames={FPS_DA_EDICAO}
    defaultProps={{...kitProps, video: '', master: '', duracao: 1}}
    calculateMetadata={calcularMetadadosDaEdicao}
  />
);

export const unused = {carregar, metadadosDoKit, calcularMetadadosDoKit};
