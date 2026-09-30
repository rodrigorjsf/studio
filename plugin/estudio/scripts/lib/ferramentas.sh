# Shared by verificar.sh and instalar.sh (POSIX sh, macOS and Linux; Windows uses the .ps1
# twins). Knows where the portable runtimes live inside the plugin data folder and how to
# tell whether each tool works. Source it after setting DADOS (the plugin data folder).
#
# Layout inside the plugin data folder — Claude Code deletes this folder when the plugin
# is uninstalled, so everything downloaded goes here and nowhere else:
#   runtime/node/bin/node          portable Node (official tarball)
#   runtime/ffmpeg/ffmpeg|ffprobe  static ffmpeg build
#   runtime/uv/uv                  uv, which provides Python
#   runtime/uv-python/             the Python interpreter uv downloads
#   runtime/python/bin/python      a virtual environment holding faster-whisper
#   cache/uv, cache/npm            download caches
#   tmp/                           partial downloads, removed after each step

RUNTIME="$DADOS/runtime"
NODE_PORTATIL="$RUNTIME/node/bin/node"
FFMPEG_PORTATIL="$RUNTIME/ffmpeg/ffmpeg"
FFPROBE_PORTATIL="$RUNTIME/ffmpeg/ffprobe"
PYTHON_PORTATIL="$RUNTIME/python/bin/python"

# funciona <program> <args…>: the program exists and runs successfully.
funciona() {
  [ -n "$1" ] && [ -x "$1" ] && "$@" >/dev/null 2>&1
}

no_path() {
  command -v "$1" 2>/dev/null || true
}

# Each acha_* prints the path of a working program (portable first, then the computer's
# own) or nothing.
acha_node() {
  for candidato in "$NODE_PORTATIL" "$(no_path node)"; do
    if funciona "$candidato" --version; then echo "$candidato"; return; fi
  done
}

acha_ffmpeg() {
  for candidato in "$FFMPEG_PORTATIL" "$(no_path ffmpeg)"; do
    if funciona "$candidato" -version; then echo "$candidato"; return; fi
  done
}

acha_ffprobe() {
  for candidato in "$FFPROBE_PORTATIL" "$(no_path ffprobe)"; do
    if funciona "$candidato" -version; then echo "$candidato"; return; fi
  done
}

# Python counts only with faster-whisper installed. On macOS /usr/bin/python3 is a stub
# that opens a system window offering the developer tools, so it is never touched.
acha_python() {
  for candidato in "$PYTHON_PORTATIL" "$(no_path python3)" "$(no_path python)"; do
    if [ "$(uname -s)" = Darwin ] && [ "$candidato" = /usr/bin/python3 ]; then continue; fi
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
