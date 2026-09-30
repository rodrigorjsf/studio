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
DADOS=${1:-$CLAUDE_PLUGIN_DATA}
ESTUDIO=${2:-${CLAUDE_PROJECT_DIR:-.}}
AQUI=$(dirname "$0")

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    exec powershell -NoProfile -ExecutionPolicy Bypass -File "$AQUI/verificar.ps1" ${JSON:+-Json} ${DADOS:+-Dados} ${DADOS:+"$DADOS"} -Estudio "$ESTUDIO"
    ;;
esac

. "$AQUI/lib/ferramentas.sh"
if [ "$SISTEMA" = Darwin ]; then SO=mac; else SO=linux; fi

NODE=$(acha_node)
FFMPEG=$(acha_ffmpeg)
FFPROBE=$(acha_ffprobe)
PYTHON=$(acha_python)
MODELO=$(estado_modelo)
REMOTION=$(estado_remotion "$ESTUDIO")

FALTANDO=
[ -z "$NODE" ] && FALTANDO="$FALTANDO node"
[ -z "$FFMPEG" ] && FALTANDO="$FALTANDO ffmpeg"
[ -z "$FFPROBE" ] && FALTANDO="$FALTANDO ffprobe"
[ -z "$PYTHON" ] && FALTANDO="$FALTANDO python"
[ "$MODELO" = missing ] && FALTANDO="$FALTANDO speech-model"
[ "$REMOTION" = missing ] && FALTANDO="$FALTANDO remotion"

json_texto() {
  if [ -z "$1" ]; then printf 'null'; else printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"; fi
}

if [ -n "$JSON" ]; then
  LISTA=
  for item in $FALTANDO; do LISTA="$LISTA${LISTA:+, }\"$item\""; done
  printf '{"os": "%s", "missing": [%s], "tools": {"node": %s, "ffmpeg": %s, "ffprobe": %s, "python": %s}, "remotion": "%s"}\n' \
    "$SO" "$LISTA" "$(json_texto "$NODE")" "$(json_texto "$FFMPEG")" "$(json_texto "$FFPROBE")" "$(json_texto "$PYTHON")" "$REMOTION"
elif [ -n "$FALTANDO" ]; then
  echo "Estúdio setup check (nothing was installed): missing$FALTANDO. Before editing, the estudio skill asks the Criadora its one preparation question; never install anything without her yes."
fi
exit 0
