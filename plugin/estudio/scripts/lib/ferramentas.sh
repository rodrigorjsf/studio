# Shared by verificar.sh and instalar.sh (POSIX sh, macOS and Linux; Windows uses the .ps1
# twins). Knows where the portable runtimes live inside the plugin data folder and how to
# tell whether each tool works. Source it after setting DADOS (the plugin data folder) and
# AQUI (the scripts folder, where ../vendor.json lists the speech model's files).
#
# Layout inside the plugin data folder — Claude Code deletes this folder when the plugin
# is uninstalled, so everything downloaded goes here and nowhere else:
#   runtime/node/bin/node          portable Node (official tarball)
#   runtime/ffmpeg/ffmpeg|ffprobe  static ffmpeg build
#   runtime/uv/uv                  uv, which provides Python
#   runtime/uv-python/             the Python interpreter uv downloads
#   runtime/python/bin/python      a virtual environment holding faster-whisper
#   modelos/large-v3-turbo/        the speech model's files, downloaded by the Preparação
#   cache/uv, cache/npm            download caches
#   tmp/                           partial downloads, removed after each step

RUNTIME="$DADOS/runtime"
NODE_PORTATIL="$RUNTIME/node/bin/node"
FFMPEG_PORTATIL="$RUNTIME/ffmpeg/ffmpeg"
FFPROBE_PORTATIL="$RUNTIME/ffmpeg/ffprobe"
PYTHON_PORTATIL="$RUNTIME/python/bin/python"

# The speech model: transcrever.py loads it from modelos/<model name> by path. The list of its
# files (name, sha256, download URL) is the `speech-model` source of vendor.json; the
# ESTUDIO_MODELO_MANIFESTO override points at another manifest, so tests can serve local files.
MODELO_NOME=large-v3-turbo
MODELO_PASTA="$DADOS/modelos/$MODELO_NOME"
MODELO_MANIFESTO=${ESTUDIO_MODELO_MANIFESTO:-$AQUI/../vendor.json}

# funciona <program> <args…>: the program exists and runs successfully.
funciona() {
  [ -n "$1" ] && [ -x "$1" ] && "$@" >/dev/null 2>&1
}

no_path() {
  command -v "$1" 2>/dev/null || true
}

SISTEMA=$(uname -s)

# acha <version flag> <candidate>…: prints the first candidate that works, or nothing.
acha() {
  flag=$1; shift
  for candidato in "$@"; do
    if funciona "$candidato" "$flag"; then echo "$candidato"; return; fi
  done
}

# Each acha_* prints the path of a working program (portable first, then the computer's
# own) or nothing.
acha_node() { acha --version "$NODE_PORTATIL" "$(no_path node)"; }
acha_ffmpeg() { acha -version "$FFMPEG_PORTATIL" "$(no_path ffmpeg)"; }
acha_ffprobe() { acha -version "$FFPROBE_PORTATIL" "$(no_path ffprobe)"; }

# Python counts only with faster-whisper installed. On macOS /usr/bin/python3 is a stub
# that opens a system window offering the developer tools, so it is never touched.
acha_python() {
  for candidato in "$PYTHON_PORTATIL" "$(no_path python3)" "$(no_path python)"; do
    if [ "$SISTEMA" = Darwin ] && [ "$candidato" = /usr/bin/python3 ]; then continue; fi
    if funciona "$candidato" -c 'import importlib.util, sys; sys.exit(importlib.util.find_spec("faster_whisper") is None)'; then
      echo "$candidato"; return
    fi
  done
}

# estado_remotion <folder>: ok | missing | not-an-estudio
estado_remotion() {
  if [ ! -f "$1/estudio.json" ]; then echo not-an-estudio
  elif [ -f "$1/node_modules/remotion/package.json" ] && [ -f "$1/node_modules/@remotion/cli/package.json" ]; then echo ok
  else echo missing
  fi
}

# modelo_arquivos <manifest>: one "<name> <sha256> <url>" line per file of the speech-model
# source. vendor.json is pretty-printed JSON and this runs with only the basic system tools
# (no node, no jq), so it flattens the text and reads the file objects with sed.
modelo_arquivos() {
  sed -n '/"id": *"speech-model"/,$p' "$1" 2>/dev/null | tr -d '\r\n' | tr '{}' '\n\n' \
    | sed -n 's/.*"name": *"\([^"]*\)".*"sha256": *"\([0-9a-f]*\)".*"url": *"\([^"]*\)".*/\1 \2 \3/p'
}

# estado_modelo: ok | missing. Missing when the manifest lists no file or any listed file is
# absent from the model folder. Presence only: hashing 1.6 GB at every session start is too slow;
# instalar.sh verifies the sha256 of every file when it downloads or re-runs.
estado_modelo() {
  lista=$(modelo_arquivos "$MODELO_MANIFESTO")
  if [ -z "$lista" ]; then echo missing; return; fi
  while read -r nome _; do
    if [ ! -f "$MODELO_PASTA/$nome" ]; then echo missing; return; fi
  done <<FIM
$lista
FIM
  echo ok
}

# sha256_de <file>: the file's sha256, lowercase hex.
sha256_de() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | sed 's/ .*//'
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | sed 's/ .*//'
  else openssl dgst -sha256 "$1" | sed 's/.*= //'
  fi
}
