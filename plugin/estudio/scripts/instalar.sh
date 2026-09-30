#!/bin/sh
# WHAT  Prepares a macOS or Linux computer to edit videos without any admin password or
#       system window: portable Node, a static ffmpeg/ffprobe, Python (through uv) with
#       faster-whisper and the speech model (~1.6 GB, from our GitHub Release), all inside the
#       plugin data folder; then the Remotion dependencies inside the Estúdio folder.
#       Windows uses instalar.ps1.
# WHY   The Criadora cannot type a password or answer an OS prompt from the Claude Desktop
#       Code tab, and must never be sent to a package manager. Claude Code deletes the plugin
#       data folder on uninstall, so the computer is left clean.
# WHEN  Only after the Criadora says yes to the Diretor's preparation question. Safe to
#       re-run: every step that is already done is skipped without downloading anything.
# HOW   sh instalar.sh <node|ffmpeg|python|modelo|remotion|tudo> "<plugin data folder>" ["<Estúdio folder>"]
#       Prints progress in plain Portuguese (the Diretor relays it). Exit 0 when the step is
#       ready, 1 when it failed (nothing half-installed stays behind), 2 on a usage error.
#       `modelo` downloads the speech model's files listed in ../vendor.json into
#       <plugin data folder>/modelos/large-v3-turbo/, verifies each sha256, deletes and reports
#       any file that fails, and skips files already verified. ESTUDIO_MODELO_MANIFESTO points
#       it at another manifest (tests serve local file:// URLs); real downloads need the network.

PASSO=$1
DADOS=$2
ESTUDIO=${3:-.}
AQUI=$(dirname "$0")

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    exec powershell -NoProfile -ExecutionPolicy Bypass -File "$AQUI/instalar.ps1" -Passo "$PASSO" -Dados "$DADOS" -Estudio "$ESTUDIO"
    ;;
esac

case "$PASSO" in
  node | ffmpeg | python | modelo | remotion | tudo) ;;
  *) echo "uso: instalar.sh <node|ffmpeg|python|modelo|remotion|tudo> \"<pasta de dados>\" [\"<pasta do Estúdio>\"]" >&2; exit 2 ;;
esac
if [ -z "$DADOS" ]; then echo "uso: falta a pasta de dados do plugin" >&2; exit 2; fi
# Absolute, so the paths still resolve after the Remotion step changes folder.
mkdir -p "$DADOS" && DADOS=$(cd "$DADOS" && pwd) || { echo "uso: pasta de dados inválida" >&2; exit 2; }

. "$AQUI/lib/ferramentas.sh"

# Every host this script reaches (and the ones uv and npm reach for it) is in ../hosts.json,
# the list the Diretor hands the Criadora when her cloud workspace blocks a download; a test
# fails when a URL here uses a host that list lacks.
# Node, uv and Python are pinned: a re-run months later installs the same, tested programs.
# ffmpeg follows its 9.0 release branch (BtbN rebuilds it; martin-riedl on macOS serves its
# latest release), because neither host keeps a fixed per-version download link.
NODE_VERSAO=v22.23.3
UV_VERSAO=0.12.21
PYTHON_VERSAO=3.12
FFMPEG_RAMO=9.0 # BtbN release branch n9.0 (Linux)

case "$(uname -m)" in
  arm64 | aarch64) ARM=1 ;;
  *) ARM= ;;
esac

TMP="$DADOS/tmp"
trap 'rm -rf "$TMP"' EXIT

falha() {
  echo "Não consegui $1. Confira a internet e tente de novo: o que já estava pronto continua pronto."
  exit 1
}

baixa() { # baixa <url> <file>
  command -v curl >/dev/null 2>&1 || return 1
  curl -fL --retry 3 --silent --show-error -o "$2" "$1"
}

novo_tmp() {
  rm -rf "$TMP/$1" && mkdir -p "$TMP/$1"
}

# guarda <finished folder> <name>: moves it into runtime/, replacing a broken earlier attempt.
guarda() {
  rm -rf "$RUNTIME/$2" && mkdir -p "$RUNTIME" && mv "$1" "$RUNTIME/$2"
}

instala_node() {
  if [ -n "$(acha_node)" ]; then echo "Node: já estava pronto."; return; fi
  echo "Node (o programa que monta as animações): baixando cerca de 50 MB…"
  if [ "$SISTEMA" = Darwin ]; then so=darwin; else so=linux; fi
  if [ -n "$ARM" ]; then arq=arm64; else arq=x64; fi
  novo_tmp node || falha "preparar o Node"
  baixa "https://nodejs.org/dist/$NODE_VERSAO/node-$NODE_VERSAO-$so-$arq.tar.gz" "$TMP/node.tar.gz" || falha "baixar o Node"
  tar -xzf "$TMP/node.tar.gz" -C "$TMP/node" --strip-components=1 || falha "abrir o Node"
  guarda "$TMP/node" node || falha "guardar o Node"
  funciona "$NODE_PORTATIL" --version || falha "fazer o Node funcionar"
  echo "Node: pronto."
}

instala_ffmpeg() {
  if [ -n "$(acha_ffmpeg)" ] && [ -n "$(acha_ffprobe)" ]; then echo "ffmpeg: já estava pronto."; return; fi
  echo "ffmpeg (o programa que lê e grava vídeo): baixando cerca de 100 MB…"
  novo_tmp ffmpeg || falha "preparar o ffmpeg"
  if [ "$SISTEMA" = Darwin ]; then
    if [ -n "$ARM" ]; then arq=arm64; else arq=amd64; fi
    for programa in ffmpeg ffprobe; do
      baixa "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$arq/release/$programa.zip" "$TMP/$programa.zip" || falha "baixar o ffmpeg"
      unzip -oq "$TMP/$programa.zip" -d "$TMP/ffmpeg" || falha "abrir o ffmpeg"
    done
  else
    if [ -n "$ARM" ]; then arq=linuxarm64; else arq=linux64; fi
    baixa "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n$FFMPEG_RAMO-latest-$arq-gpl-$FFMPEG_RAMO.tar.xz" "$TMP/ffmpeg.tar.xz" \
      || falha "baixar o ffmpeg"
    novo_tmp ffmpeg-pacote || falha "preparar o ffmpeg"
    tar -xJf "$TMP/ffmpeg.tar.xz" -C "$TMP/ffmpeg-pacote" --strip-components=2 --wildcards '*/bin/ffmpeg' '*/bin/ffprobe' \
      || falha "abrir o ffmpeg"
    mv "$TMP/ffmpeg-pacote/ffmpeg" "$TMP/ffmpeg-pacote/ffprobe" "$TMP/ffmpeg/" || falha "abrir o ffmpeg"
  fi
  chmod +x "$TMP/ffmpeg/ffmpeg" "$TMP/ffmpeg/ffprobe" || falha "abrir o ffmpeg"
  guarda "$TMP/ffmpeg" ffmpeg || falha "guardar o ffmpeg"
  funciona "$FFMPEG_PORTATIL" -version && funciona "$FFPROBE_PORTATIL" -version || falha "fazer o ffmpeg funcionar"
  echo "ffmpeg: pronto."
}

instala_python() {
  if [ -n "$(acha_python)" ]; then echo "Python com faster-whisper: já estava pronto."; return; fi
  echo "Python com faster-whisper (a transcrição das suas falas): baixando cerca de 150 MB…"
  UV="$RUNTIME/uv/uv"
  if ! funciona "$UV" --version; then
    if [ "$SISTEMA" = Darwin ]; then so=apple-darwin; else so=unknown-linux-gnu; fi
    if [ -n "$ARM" ]; then arq=aarch64; else arq=x86_64; fi
    novo_tmp uv || falha "preparar o Python"
    baixa "https://github.com/astral-sh/uv/releases/download/$UV_VERSAO/uv-$arq-$so.tar.gz" "$TMP/uv.tar.gz" || falha "baixar o Python"
    tar -xzf "$TMP/uv.tar.gz" -C "$TMP/uv" --strip-components=1 || falha "abrir o Python"
    guarda "$TMP/uv" uv || falha "guardar o Python"
  fi
  # Everything uv downloads or caches stays in the plugin data folder.
  export UV_CACHE_DIR="$DADOS/cache/uv"
  export UV_PYTHON_INSTALL_DIR="$RUNTIME/uv-python"
  export UV_PYTHON_BIN_DIR="$RUNTIME/uv-python/bin"
  export UV_PYTHON_PREFERENCE=only-managed
  export UV_NO_CONFIG=1
  export UV_NO_PROGRESS=1
  rm -rf "$RUNTIME/python"
  "$UV" venv --quiet --python "$PYTHON_VERSAO" "$RUNTIME/python" || { rm -rf "$RUNTIME/python"; falha "baixar o Python"; }
  # PyAV 19 dropped an argument faster-whisper 1.2.1 still passes: every transcription fails.
  "$UV" pip install --quiet --python "$PYTHON_PORTATIL" "faster-whisper==1.2.1" "av<19" || { rm -rf "$RUNTIME/python"; falha "baixar o faster-whisper"; }
  [ -n "$(acha_python)" ] || { rm -rf "$RUNTIME/python"; falha "fazer a transcrição funcionar"; }
  echo "Python com faster-whisper: pronto."
}

# The speech model comes from our own GitHub Release, never from Hugging Face. Each file lands in
# the model folder only after its sha256 matches the manifest, so an interrupted run leaves only
# verified files and the next run fetches the rest.
instala_modelo() {
  lista=$(modelo_arquivos "$MODELO_MANIFESTO")
  [ -n "$lista" ] || falha "ler a lista de arquivos do modelo de fala"
  pendentes=
  while read -r nome sha url; do
    if [ -f "$MODELO_PASTA/$nome" ] && [ "$(sha256_de "$MODELO_PASTA/$nome")" = "$sha" ]; then continue; fi
    pendentes="$pendentes$nome $sha $url
"
  done <<FIM
$lista
FIM
  if [ -z "$pendentes" ]; then echo "Modelo de fala: já estava pronto."; return; fi
  echo "Modelo de fala (o que entende as suas falas, baixado uma só vez): baixando cerca de 1,6 GB, pode levar alguns minutos…"
  total=$(printf '%s' "$pendentes" | sed -n '$=')
  novo_tmp modelo || falha "preparar o modelo de fala"
  mkdir -p "$MODELO_PASTA" || falha "preparar o modelo de fala"
  n=0
  while read -r nome sha url; do
    [ -n "$nome" ] || continue # the here-document ends with an empty line
    n=$((n + 1))
    echo "  ($n de $total) baixando $nome…"
    rm -f "$MODELO_PASTA/$nome"
    baixa "$url" "$TMP/modelo/$nome" || falha "baixar o arquivo $nome do modelo de fala"
    if [ "$(sha256_de "$TMP/modelo/$nome")" != "$sha" ]; then
      rm -f "$TMP/modelo/$nome"
      echo "O arquivo $nome do modelo de fala chegou corrompido e foi apagado. Tente de novo: o que já estava pronto continua pronto."
      exit 1
    fi
    mv "$TMP/modelo/$nome" "$MODELO_PASTA/$nome" || falha "guardar o arquivo $nome do modelo de fala"
  done <<FIM
$pendentes
FIM
  echo "Modelo de fala: pronto."
}

instala_remotion() {
  case "$(estado_remotion "$ESTUDIO")" in
    ok) echo "Remotion: já estava pronto."; return ;;
    not-an-estudio)
      if [ "$PASSO" = tudo ]; then echo "Remotion: fica para quando esta pasta virar o seu Estúdio."; return; fi
      echo "Remotion: esta pasta ainda não é um Estúdio." >&2; exit 2 ;;
  esac
  NODE=$(acha_node)
  [ -n "$NODE" ] || falha "preparar o Remotion, porque o Node ainda não está pronto"
  echo "Remotion (o editor de animações), dentro da pasta do Estúdio: baixando cerca de 250 MB…"
  NODE_DIR=$(dirname "$NODE")
  NPM_CLI="$NODE_DIR/../lib/node_modules/npm/bin/npm-cli.js"
  (
    cd "$ESTUDIO" || exit 1
    export PATH="$NODE_DIR:$PATH"
    export npm_config_cache="$DADOS/cache/npm"
    export npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false
    if [ -f "$NPM_CLI" ]; then "$NODE" "$NPM_CLI" install --loglevel=error >/dev/null
    else npm install --loglevel=error >/dev/null
    fi
  ) || falha "baixar o Remotion"
  [ "$(estado_remotion "$ESTUDIO")" = ok ] || falha "fazer o Remotion funcionar"
  echo "Remotion: pronto."
}

case "$PASSO" in
  tudo)
    instala_node
    instala_ffmpeg
    instala_python
    instala_modelo
    instala_remotion
    echo "Computador preparado para editar vídeos."
    ;;
  *) "instala_$PASSO" ;;
esac
