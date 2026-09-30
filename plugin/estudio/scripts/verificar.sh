#!/bin/sh
# WHAT  Checks whether the computer can edit videos: Node, ffmpeg, ffprobe, Python with
#       faster-whisper, the speech model's files, and (inside an Estúdio) the Remotion
#       dependencies. Never installs.
# WHY   The session-start hook and the estudio skill must know what is missing before the
#       Diretor asks the one preparation question; installing is instalar.sh's job, and
#       only after the Criadora says yes.
# WHEN  At every session start (hooks/hooks.json) and whenever the skill needs the paths
#       of the tools (before running estudio.mjs, after instalar.sh).
# HOW   sh verificar.sh [--json] [<plugin data folder>] [<Estúdio folder>]
#       Defaults: $CLAUDE_PLUGIN_DATA and $CLAUDE_PROJECT_DIR (else the current folder).
#       Without --json: prints one line for the model when something is missing, nothing
#       otherwise. With --json: {"os","missing":[…],"tools":{node,ffmpeg,ffprobe,python},
#       "remotion":"ok|missing|not-an-estudio"}. Always exits 0. "missing" may name node,
#       ffmpeg, ffprobe, python, remotion and speech-model (a model file is absent from the
#       model folder).
#       On Windows (Git Bash) it hands over to verificar.ps1.

JSON=
if [ "$1" = --json ]; then JSON=1; shift; fi
DATA_DIR=${1:-$CLAUDE_PLUGIN_DATA}
ESTUDIO=${2:-${CLAUDE_PROJECT_DIR:-.}}
SCRIPT_DIR=$(dirname "$0")

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    exec powershell -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/verificar.ps1" ${JSON:+-Json} ${DATA_DIR:+-DataDir} ${DATA_DIR:+"$DATA_DIR"} -Estudio "$ESTUDIO"
    ;;
esac

. "$SCRIPT_DIR/lib/ferramentas.sh"
if [ "$SYSTEM" = Darwin ]; then OS_ID=mac; else OS_ID=linux; fi

NODE=$(find_node)
FFMPEG=$(find_ffmpeg)
FFPROBE=$(find_ffprobe)
PYTHON=$(find_python)
MODEL=$(model_state)
REMOTION=$(remotion_state "$ESTUDIO")

MISSING=
[ -z "$NODE" ] && MISSING="$MISSING node"
[ -z "$FFMPEG" ] && MISSING="$MISSING ffmpeg"
[ -z "$FFPROBE" ] && MISSING="$MISSING ffprobe"
[ -z "$PYTHON" ] && MISSING="$MISSING python"
[ "$MODEL" = missing ] && MISSING="$MISSING speech-model"
[ "$REMOTION" = missing ] && MISSING="$MISSING remotion"

json_text() {
  if [ -z "$1" ]; then printf 'null'; else printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"; fi
}

if [ -n "$JSON" ]; then
  LIST=
  for item in $MISSING; do LIST="$LIST${LIST:+, }\"$item\""; done
  printf '{"os": "%s", "missing": [%s], "tools": {"node": %s, "ffmpeg": %s, "ffprobe": %s, "python": %s}, "remotion": "%s"}\n' \
    "$OS_ID" "$LIST" "$(json_text "$NODE")" "$(json_text "$FFMPEG")" "$(json_text "$FFPROBE")" "$(json_text "$PYTHON")" "$REMOTION"
elif [ -n "$MISSING" ]; then
  echo "Estúdio setup check (nothing was installed): missing$MISSING. Before editing, the estudio skill asks the Criadora its one preparation question; never install anything without her yes."
fi
exit 0
