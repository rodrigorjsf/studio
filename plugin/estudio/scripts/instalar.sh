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
#       ready, 1 when it failed (nothing half-installed stays behind; only a model file cut
#       halfway waits in partial/ for the next run to continue it), 2 on a usage error.
#       `modelo` downloads the speech model's files listed in ../vendor.json into
#       <plugin data folder>/modelos/large-v3-turbo/, verifies each sha256, deletes and reports
#       any file that fails, and skips files already verified. While a file downloads it prints
#       how many MB arrived every 15 s (ESTUDIO_PROGRESS_SECONDS changes the interval), and a
#       file cut halfway is continued by the next run instead of starting again.
#       ESTUDIO_MODEL_MANIFEST points it at another manifest (tests serve local file:// URLs);
#       real downloads need the network.

STEP=$1
DATA_DIR=$2
ESTUDIO=${3:-.}
SCRIPT_DIR=$(dirname "$0")

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    exec powershell -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/instalar.ps1" -Step "$STEP" -DataDir "$DATA_DIR" -Estudio "$ESTUDIO"
    ;;
esac

case "$STEP" in
  node | ffmpeg | python | modelo | remotion | tudo) ;;
  *) echo "uso: instalar.sh <node|ffmpeg|python|modelo|remotion|tudo> \"<pasta de dados>\" [\"<pasta do Estúdio>\"]" >&2; exit 2 ;;
esac
if [ -z "$DATA_DIR" ]; then echo "uso: falta a pasta de dados do plugin" >&2; exit 2; fi
# Absolute, so the paths still resolve after the Remotion step changes folder.
mkdir -p "$DATA_DIR" && DATA_DIR=$(cd "$DATA_DIR" && pwd) || { echo "uso: pasta de dados inválida" >&2; exit 2; }

. "$SCRIPT_DIR/lib/ferramentas.sh"

# Every host this script reaches (and the ones uv and npm reach for it) is in ../hosts.json,
# the list the Diretor hands the Criadora when her cloud workspace blocks a download. Add a
# host there when a URL here gains one.
# Node, uv and Python are pinned: a re-run months later installs the same, tested programs.
# ffmpeg follows its 9.0 release branch (BtbN rebuilds it; martin-riedl on macOS serves its
# latest release), because neither host keeps a fixed per-version download link.
NODE_VERSION=v22.23.3
UV_VERSION=0.12.21
PYTHON_VERSION=3.12
FFMPEG_BRANCH=9.0 # BtbN release branch n9.0 (Linux)

case "$(uname -m)" in
  arm64 | aarch64) ARM=1 ;;
  *) ARM= ;;
esac

TMP="$DATA_DIR/tmp"
# A download runs in the background (so progress can be printed) and a background job ignores
# Ctrl-C: stop it with the script, or it would keep writing into a file the next run continues.
CURL_PID=
stop_download() { if [ -n "$CURL_PID" ]; then kill "$CURL_PID" 2>/dev/null; fi; }
trap 'stop_download; rm -rf "$TMP"' EXIT
trap 'exit 1' INT TERM HUP
PROGRESS_SECONDS=${ESTUDIO_PROGRESS_SECONDS:-15}

fail() {
  echo "Não consegui $1. Confira a internet e tente de novo: o que já estava pronto continua pronto."
  exit 1
}

download() { # download <url> <file>
  command -v curl >/dev/null 2>&1 || return 1
  curl -fL --retry 3 --silent --show-error -o "$2" "$1"
}

new_tmp() {
  rm -rf "$TMP/$1" && mkdir -p "$TMP/$1"
}

# store <finished folder> <name>: moves it into runtime/, replacing a broken earlier attempt.
store() {
  rm -rf "$RUNTIME/$2" && mkdir -p "$RUNTIME" && mv "$1" "$RUNTIME/$2"
}

install_node() {
  if [ -n "$(find_node)" ]; then echo "Node: já estava pronto."; return; fi
  echo "Node (o programa que monta as animações): baixando cerca de 50 MB…"
  if [ "$SYSTEM" = Darwin ]; then os_id=darwin; else os_id=linux; fi
  if [ -n "$ARM" ]; then arch=arm64; else arch=x64; fi
  new_tmp node || fail "preparar o Node"
  download "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-$os_id-$arch.tar.gz" "$TMP/node.tar.gz" || fail "baixar o Node"
  tar -xzf "$TMP/node.tar.gz" -C "$TMP/node" --strip-components=1 || fail "abrir o Node"
  store "$TMP/node" node || fail "guardar o Node"
  works "$PORTABLE_NODE" --version || fail "fazer o Node funcionar"
  echo "Node: pronto."
}

install_ffmpeg() {
  if [ -n "$(find_ffmpeg)" ] && [ -n "$(find_ffprobe)" ]; then echo "ffmpeg: já estava pronto."; return; fi
  echo "ffmpeg (o programa que lê e grava vídeo): baixando cerca de 100 MB…"
  new_tmp ffmpeg || fail "preparar o ffmpeg"
  if [ "$SYSTEM" = Darwin ]; then
    if [ -n "$ARM" ]; then arch=arm64; else arch=amd64; fi
    for program in ffmpeg ffprobe; do
      download "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$arch/release/$program.zip" "$TMP/$program.zip" || fail "baixar o ffmpeg"
      unzip -oq "$TMP/$program.zip" -d "$TMP/ffmpeg" || fail "abrir o ffmpeg"
    done
  else
    if [ -n "$ARM" ]; then arch=linuxarm64; else arch=linux64; fi
    download "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n$FFMPEG_BRANCH-latest-$arch-gpl-$FFMPEG_BRANCH.tar.xz" "$TMP/ffmpeg.tar.xz" \
      || fail "baixar o ffmpeg"
    new_tmp ffmpeg-package || fail "preparar o ffmpeg"
    tar -xJf "$TMP/ffmpeg.tar.xz" -C "$TMP/ffmpeg-package" --strip-components=2 --wildcards '*/bin/ffmpeg' '*/bin/ffprobe' \
      || fail "abrir o ffmpeg"
    mv "$TMP/ffmpeg-package/ffmpeg" "$TMP/ffmpeg-package/ffprobe" "$TMP/ffmpeg/" || fail "abrir o ffmpeg"
  fi
  chmod +x "$TMP/ffmpeg/ffmpeg" "$TMP/ffmpeg/ffprobe" || fail "abrir o ffmpeg"
  store "$TMP/ffmpeg" ffmpeg || fail "guardar o ffmpeg"
  works "$PORTABLE_FFMPEG" -version && works "$PORTABLE_FFPROBE" -version || fail "fazer o ffmpeg funcionar"
  echo "ffmpeg: pronto."
}

install_python() {
  if [ -n "$(find_python)" ]; then echo "Python com faster-whisper: já estava pronto."; return; fi
  echo "Python com faster-whisper (a transcrição das suas falas): baixando cerca de 150 MB…"
  UV="$RUNTIME/uv/uv"
  if ! works "$UV" --version; then
    if [ "$SYSTEM" = Darwin ]; then os_id=apple-darwin; else os_id=unknown-linux-gnu; fi
    if [ -n "$ARM" ]; then arch=aarch64; else arch=x86_64; fi
    new_tmp uv || fail "preparar o Python"
    download "https://github.com/astral-sh/uv/releases/download/$UV_VERSION/uv-$arch-$os_id.tar.gz" "$TMP/uv.tar.gz" || fail "baixar o Python"
    tar -xzf "$TMP/uv.tar.gz" -C "$TMP/uv" --strip-components=1 || fail "abrir o Python"
    store "$TMP/uv" uv || fail "guardar o Python"
  fi
  # Everything uv downloads or caches stays in the plugin data folder.
  export UV_CACHE_DIR="$DATA_DIR/cache/uv"
  export UV_PYTHON_INSTALL_DIR="$RUNTIME/uv-python"
  export UV_PYTHON_BIN_DIR="$RUNTIME/uv-python/bin"
  export UV_PYTHON_PREFERENCE=only-managed
  export UV_NO_CONFIG=1
  export UV_NO_PROGRESS=1
  rm -rf "$RUNTIME/python"
  "$UV" venv --quiet --python "$PYTHON_VERSION" "$RUNTIME/python" || { rm -rf "$RUNTIME/python"; fail "baixar o Python"; }
  # PyAV 19 dropped an argument faster-whisper 1.2.1 still passes: every transcription fails.
  "$UV" pip install --quiet --python "$PORTABLE_PYTHON" "faster-whisper==1.2.1" "av<19" || { rm -rf "$RUNTIME/python"; fail "baixar o faster-whisper"; }
  [ -n "$(find_python)" ] || { rm -rf "$RUNTIME/python"; fail "fazer a transcrição funcionar"; }
  echo "Python com faster-whisper: pronto."
}

# fetch_model_file <url> <partial file>: downloads into the partial file, continuing it when an
# earlier run was interrupted, and prints a progress line every $PROGRESS_SECONDS so a download of
# minutes never looks frozen. A server that cannot continue (curl 33, HTTP 416) restarts it once.
fetch_model_file() {
  command -v curl >/dev/null 2>&1 || return 1
  name=${2##*/}
  curl -fL --retry 3 --silent --show-error -C - -w '%{http_code}' -o "$2" "$1" > "$2.code" &
  CURL_PID=$!
  ticks=0 # fifths of a second (GNU, macOS and busybox sleep all take fractions)
  while kill -0 "$CURL_PID" 2>/dev/null; do
    sleep 0.2 2>/dev/null || sleep 1
    ticks=$((ticks + 1))
    if [ "$ticks" -ge $((PROGRESS_SECONDS * 5)) ] && kill -0 "$CURL_PID" 2>/dev/null; then
      echo "    $name: $(megabytes_of "$2") MB baixados até agora…"
      ticks=0
    fi
  done
  wait "$CURL_PID"
  status=$?
  CURL_PID=
  code=$(cat "$2.code" 2>/dev/null)
  rm -f "$2.code"
  [ "$status" = 0 ] && return 0
  if [ -z "$3" ] && { [ "$status" = 33 ] || [ "$code" = 416 ]; }; then
    rm -f "$2"
    fetch_model_file "$1" "$2" again
    return
  fi
  return 1
}

megabytes_of() {
  [ -f "$1" ] || { echo 0; return; }
  set -- $(ls -ln "$1")
  echo $(($5 / 1048576))
}

# The speech model comes from our own GitHub Release, never from Hugging Face. Each file lands in
# the model folder only after its sha256 matches the manifest. A download cut halfway waits in
# partial/speech-model/ and the next run continues it from where it stopped, so a slow link that
# needs several runs still gets through the ~1.6 GB model.bin.
install_model() {
  list=$(model_files "$MODEL_MANIFEST")
  [ -n "$list" ] || fail "ler a lista de arquivos do modelo de fala"
  pending=
  while read -r name sha url; do
    if [ -f "$MODEL_DIR/$name" ] && [ "$(sha256_of "$MODEL_DIR/$name")" = "$sha" ]; then continue; fi
    pending="$pending$name $sha $url
"
  done <<END
$list
END
  if [ -z "$pending" ]; then echo "Modelo de fala: já estava pronto."; return; fi
  echo "Modelo de fala (o que entende as suas falas, baixado uma só vez): baixando cerca de 1,6 GB, pode levar alguns minutos…"
  total=$(printf '%s' "$pending" | sed -n '$=')
  mkdir -p "$MODEL_DIR" "$MODEL_PARTIAL_DIR" || fail "preparar o modelo de fala"
  n=0
  while read -r name sha url; do
    [ -n "$name" ] || continue # the here-document ends with an empty line
    n=$((n + 1))
    partial="$MODEL_PARTIAL_DIR/$name"
    if [ -s "$partial" ]; then echo "  ($n de $total) continuando $name de onde parou…"
    else echo "  ($n de $total) baixando $name…"
    fi
    rm -f "$MODEL_DIR/$name"
    if [ ! -s "$partial" ] || [ "$(sha256_of "$partial")" != "$sha" ]; then
      if ! fetch_model_file "$url" "$partial"; then
        [ -s "$partial" ] || rm -rf "${MODEL_PARTIAL_DIR%/*}" # nothing arrived: nothing to continue
        fail "baixar o arquivo $name do modelo de fala"
      fi
    fi
    if [ "$(sha256_of "$partial")" != "$sha" ]; then
      rm -rf "${MODEL_PARTIAL_DIR%/*}" # only this file was waiting there
      echo "O arquivo $name do modelo de fala chegou corrompido e foi apagado. Tente de novo: o que já estava pronto continua pronto."
      exit 1
    fi
    mv "$partial" "$MODEL_DIR/$name" || fail "guardar o arquivo $name do modelo de fala"
  done <<END
$pending
END
  rm -rf "${MODEL_PARTIAL_DIR%/*}" # empty: every file moved into the model folder
  echo "Modelo de fala: pronto."
}

install_remotion() {
  case "$(remotion_state "$ESTUDIO")" in
    ok) echo "Remotion: já estava pronto."; return ;;
    not-an-estudio)
      if [ "$STEP" = tudo ]; then echo "Remotion: fica para quando esta pasta virar o seu Estúdio."; return; fi
      echo "Remotion: esta pasta ainda não é um Estúdio." >&2; exit 2 ;;
  esac
  NODE=$(find_node)
  [ -n "$NODE" ] || fail "preparar o Remotion, porque o Node ainda não está pronto"
  echo "Remotion (o editor de animações), dentro da pasta do Estúdio: baixando cerca de 250 MB…"
  NODE_DIR=$(dirname "$NODE")
  NPM_CLI="$NODE_DIR/../lib/node_modules/npm/bin/npm-cli.js"
  (
    cd "$ESTUDIO" || exit 1
    export PATH="$NODE_DIR:$PATH"
    export npm_config_cache="$DATA_DIR/cache/npm"
    export npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false
    if [ -f "$NPM_CLI" ]; then "$NODE" "$NPM_CLI" install --loglevel=error >/dev/null
    else npm install --loglevel=error >/dev/null
    fi
  ) || fail "baixar o Remotion"
  [ "$(remotion_state "$ESTUDIO")" = ok ] || fail "fazer o Remotion funcionar"
  echo "Remotion: pronto."
}

case "$STEP" in
  tudo)
    install_node
    install_ffmpeg
    install_python
    install_model
    install_remotion
    echo "Computador preparado para editar vídeos."
    ;;
  node) install_node ;;
  ffmpeg) install_ffmpeg ;;
  python) install_python ;;
  modelo) install_model ;;
  remotion) install_remotion ;;
esac
