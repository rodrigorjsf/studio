import React from 'react';
import {Composition, Folder} from 'remotion';
import {MinimalSuico} from './estilos/MinimalSuico';
import {TerminalTecnico} from './estilos/TerminalTecnico';
import {VerticalDados} from './estilos/VerticalDados';
import {VerticalLegendas} from './estilos/VerticalLegendas';
import {VerticalPrint} from './estilos/VerticalPrint';
import {calcularMetadadosDoKit, DIMENSOES, PropsDoKit} from './_shared/kit';
import {PreviaDoKit} from './kit/PreviaDoKit';

const FPS = 30;
const SEIS_SEGUNDOS = 6 * FPS;

export const RemotionRoot: React.FC = () => (
  <>
    {/* Prévia do Kit de marca de um Projeto. Escolha o Projeto em "projeto" (nome da pasta em projetos/);
        vazio = Kit padrão. "formato": null = o Formato do Kit (9:16 por padrão); "16:9" ou "1:1" = variante. */}
    <Folder name="Kit">
      <Composition
        id="PreviaDoKit"
        component={PreviaDoKit}
        {...DIMENSOES['9:16']}
        fps={FPS}
        durationInFrames={SEIS_SEGUNDOS}
        defaultProps={{projeto: '', formato: null} satisfies PropsDoKit}
        calculateMetadata={calcularMetadadosDoKit}
      />
    </Folder>

    {/* Exemplos que rodam sem nenhum vídeo. Servem de referência de estilo, não de padrão fixo:
        mostram um estilo da galeria com cores próprias, não a marca de um Projeto. */}
    <Folder name="Estilos">
      <Composition id="MinimalSuico" component={MinimalSuico} width={1920} height={1080} fps={FPS} durationInFrames={SEIS_SEGUNDOS} />
      <Composition id="TerminalTecnico" component={TerminalTecnico} width={1920} height={1080} fps={FPS} durationInFrames={SEIS_SEGUNDOS} />
      <Composition id="VerticalLegendas" component={VerticalLegendas} width={1080} height={1920} fps={FPS} durationInFrames={SEIS_SEGUNDOS} />
      <Composition id="VerticalPrint" component={VerticalPrint} width={1080} height={1920} fps={FPS} durationInFrames={SEIS_SEGUNDOS} />
      <Composition id="VerticalDados" component={VerticalDados} width={1080} height={1920} fps={FPS} durationInFrames={SEIS_SEGUNDOS} />
    </Folder>

    {/* Seus vídeos entram aqui: um <Folder name="projeto-slug"> por Projeto, com o código em src/videos/<slug>/.
        Cada composição de Vídeo lê o Kit do Projeto como a PreviaDoKit: calculateMetadata={calcularMetadadosDoKit},
        props {projeto, formato} e as peças de src/_shared/marca.tsx. Nenhuma cor, fonte ou estilo de legenda no código. */}
  </>
);
