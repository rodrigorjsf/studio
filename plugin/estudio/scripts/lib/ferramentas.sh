# Shared by verificar.sh and instalar.sh (POSIX sh, macOS and Linux; Windows uses the .ps1
# twins). Knows where the portable runtimes live inside the plugin data folder and how to
# tell whether each tool works. Source it after setting DATA_DIR (the plugin data folder) and
# SCRIPT_DIR (the scripts folder, where ../vendor.json lists the speech model's files).
#
# Layout inside the plugin data folder — Claude Code deletes this folder when the plugin
# is uninstalled, so everything downloaded goes here and nowhere else:
#   runtime/node/bin/node          portable Node (official tarball)
#   runtime/ffmpeg/ffmpeg|ffprobe  static ffmpeg build
#   runtime/uv/uv                  uv, which provides Python
#   runtime/uv-python/             the Python interpreter uv downloads
#   runtime/python/bin/python      a virtual environment holding faster-whisper
#   modelos/large-v3-turbo/        the speech model's files, downloaded by the Preparação
#   partial/speech-model/          a model file cut halfway, continued by the next Preparação
#   cache/uv, cache/npm            download caches
#   tmp/                           partial downloads, removed after each step

RUNTIME="$DATA_DIR/runtime"
PORTABLE_NODE="$RUNTIME/node/bin/node"
PORTABLE_FFMPEG="$RUNTIME/ffmpeg/ffmpeg"
PORTABLE_FFPROBE="$RUNTIME/ffmpeg/ffprobe"
PORTABLE_PYTHON="$RUNTIME/python/bin/python"

# The speech model: transcrever.py loads it from modelos/<model name> by path. The list of its
# files (name, sha256, download URL) is the `speech-model` source of vendor.json; the
# ESTUDIO_MODEL_MANIFEST override points at another manifest, so tests can serve local files.
MODEL_NAME=large-v3-turbo
MODEL_DIR="$DATA_DIR/modelos/$MODEL_NAME"
MODEL_PARTIAL_DIR="$DATA_DIR/partial/speech-model"
MODEL_MANIFEST=${ESTUDIO_MODEL_MANIFEST:-$SCRIPT_DIR/../vendor.json}

# works <program> <args…>: the program exists and runs successfully.
works() {
  [ -n "$1" ] && [ -x "$1" ] && "$@" >/dev/null 2>&1
}

on_path() {
  command -v "$1" 2>/dev/null || true
}

SYSTEM=$(uname -s)

# find_working <version flag> <candidate>…: prints the first candidate that works, or nothing.
find_working() {
  flag=$1; shift
  for candidate in "$@"; do
    if works "$candidate" "$flag"; then echo "$candidate"; return; fi
  done
}

# Each find_* prints the path of a working program (portable first, then the computer's
# own) or nothing.
find_node() { find_working --version "$PORTABLE_NODE" "$(on_path node)"; }
find_ffmpeg() { find_working -version "$PORTABLE_FFMPEG" "$(on_path ffmpeg)"; }
find_ffprobe() { find_working -version "$PORTABLE_FFPROBE" "$(on_path ffprobe)"; }

# Python counts only with faster-whisper installed. On macOS /usr/bin/python3 is a stub
# that opens a system window offering the developer tools, so it is never touched.
find_python() {
  for candidate in "$PORTABLE_PYTHON" "$(on_path python3)" "$(on_path python)"; do
    if [ "$SYSTEM" = Darwin ] && [ "$candidate" = /usr/bin/python3 ]; then continue; fi
    if works "$candidate" -c 'import importlib.util, sys; sys.exit(importlib.util.find_spec("faster_whisper") is None)'; then
      echo "$candidate"; return
    fi
  done
}

# remotion_state <folder>: ok | missing | not-an-estudio
remotion_state() {
  if [ ! -f "$1/estudio.json" ]; then echo not-an-estudio
  elif [ -f "$1/node_modules/remotion/package.json" ] && [ -f "$1/node_modules/@remotion/cli/package.json" ]; then echo ok
  else echo missing
  fi
}

# model_files <manifest>: one "<name> <sha256> <url>" line per file of the speech-model
# source. vendor.json is pretty-printed JSON and this runs with only the basic system tools
# (no node, no jq), so it flattens the text and reads the file objects with sed.
model_files() {
  sed -n '/"id": *"speech-model"/,$p' "$1" 2>/dev/null | tr -d '\r\n' | tr '{}' '\n\n' \
    | sed -n 's/.*"name": *"\([^"]*\)".*"sha256": *"\([0-9a-f]*\)".*"url": *"\([^"]*\)".*/\1 \2 \3/p'
}

# model_state: ok | missing. Missing when the manifest lists no file or any listed file is
# absent from the model folder. Presence only: hashing 1.6 GB at every session start is too slow;
# instalar.sh verifies the sha256 of every file when it downloads or re-runs.
model_state() {
  list=$(model_files "$MODEL_MANIFEST")
  if [ -z "$list" ]; then echo missing; return; fi
  while read -r name _; do
    if [ ! -f "$MODEL_DIR/$name" ]; then echo missing; return; fi
  done <<END
$list
END
  echo ok
}

# sha256_of <file>: the file's sha256, lowercase hex.
sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | sed 's/ .*//'
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | sed 's/ .*//'
  else openssl dgst -sha256 "$1" | sed 's/.*= //'
  fi
}
