import React from 'react';
import {Composition, Folder} from 'remotion';
import {MinimalSuico} from './estilos/MinimalSuico';
import {TerminalTecnico} from './estilos/TerminalTecnico';
import {VerticalDados} from './estilos/VerticalDados';
import {VerticalLegendas} from './estilos/VerticalLegendas';
import {VerticalPrint} from './estilos/VerticalPrint';
import {calculateKitMetadata, DIMENSIONS, KitProps} from './_shared/kit';
import {calculateEdicaoMetadata, EdicaoComLegendas, EDICAO_FPS, PropsDaEdicaoComLegendas} from './_shared/edicao';
import {PreviaDoKit} from './kit/PreviaDoKit';
import {calcularMetadadosDoQuadro, FPS_DO_QUADRO, PropsDoQuadro, QuadroDeEstilo} from './quadro/QuadroDeEstilo';

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
        {...DIMENSIONS['9:16']}
        fps={FPS}
        durationInFrames={SEIS_SEGUNDOS}
        defaultProps={{projeto: '', formato: null} satisfies KitProps}
        calculateMetadata={calculateKitMetadata}
      />
    </Folder>

    {/* Quadro de estilo de um Vídeo: o visual proposto sobre um quadro real da gravação dela. O Diretor de arte
        renderiza um still por rótulo do Plano: "video" = pasta do Vídeo, "master" = caminho do Master dentro dela,
        "duracao" = segundos do Master, --frame = tempo do quadro × 30. O Kit é o do Vídeo, se ele tiver o seu. */}
    <Folder name="Quadros">
      <Composition
        id="QuadroDeEstilo"
        component={QuadroDeEstilo}
        {...DIMENSIONS['9:16']}
        fps={FPS_DO_QUADRO}
        durationInFrames={FPS_DO_QUADRO}
        defaultProps={{projeto: '', formato: null, video: '', master: '', duracao: 1, titulo: ''} satisfies PropsDoQuadro}
        calculateMetadata={calcularMetadadosDoQuadro}
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

    {/* A edição mais simples de um Vídeo: o Master inteiro, com o áudio original uma única vez, e as legendas do Kit.
        "video" = pasta do Vídeo, "master" = o campo master do video.md, "duracao" = segundos do Master (ffprobe). */}
    <Folder name="Edicao">
      <Composition
        id="EdicaoComLegendas"
        component={EdicaoComLegendas}
        {...DIMENSIONS['9:16']}
        fps={EDICAO_FPS}
        durationInFrames={EDICAO_FPS}
        defaultProps={{projeto: '', formato: null, video: '', master: '', duracao: 1, legenda: []} satisfies PropsDaEdicaoComLegendas}
        calculateMetadata={calculateEdicaoMetadata}
      />
    </Folder>

    {/* Seus vídeos entram aqui: um <Folder name="projeto-slug"> por Projeto, com o código em src/videos/<slug>/.
        Cada composição de Vídeo é construída sobre <Edicao> de src/_shared/edicao.tsx (o Master contínuo, com o
        áudio original uma única vez), registrada com calculateMetadata={calculateEdicaoMetadata} e as props
        {projeto, formato, video, master, duracao}, e usa as peças de src/_shared/marca.tsx. Nenhuma cor, fonte ou
        estilo de legenda no código: tudo vem do Kit. No Nível 2, as imagens e clipes gerados (pasta gerados/ do
        Vídeo) entram com <Gerado> de src/_shared/edicao.tsx, sempre sem som. */}
  </>
);
