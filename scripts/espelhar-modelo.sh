#!/bin/sh
# WHAT  Mirrors the speech model onto a GitHub Release of this repository. Downloads the five
#       CTranslate2 files of mobiuslabsgmbh/faster-whisper-large-v3-turbo (served today as
#       dropbox-dash/faster-whisper-large-v3-turbo, MIT) pinned at commit
#       0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf, computes each file's sha256, creates or
#       refreshes the Release `modelo-large-v3-turbo-0a363e9` with the files as separate assets,
#       and prints the manifest entries (name, sha256, Release URL) as a JSON array on stdout.
# WHY   The Criadora's Preparação must never reach Hugging Face: in Claude's cloud workspace the
#       network is an account allowlist she cannot always change (ADR 0006). The mirror is pinned
#       and checksummed, so the installer can verify every file against plugin/estudio/vendor.json.
# WHEN  Once to publish the mirror, and again only to refresh it (a new pinned commit, a lost
#       asset). PUBLISHING IS AN OUTWARD ACTION: run it for real only after the maintainer agrees;
#       use --dry-run to hash the files and print the manifest without touching GitHub.
#       Safe to re-run: an existing Release is kept, and only assets that are missing or differ in
#       size are uploaded (replaced with --clobber, never duplicated).
# HOW   sh scripts/espelhar-modelo.sh [--dry-run] [--dir <download folder>]
#       Needs: curl, sha256sum (or shasum), and for a real run the GitHub CLI `gh`, logged in with
#       write access to the repository. Progress goes to stderr, the manifest JSON to stdout, so
#       `sh scripts/espelhar-modelo.sh > files.json` keeps only the entries. Copy them into the
#       `files` array of the `speech-model` source in plugin/estudio/vendor.json.
#       --dir keeps the ~1.6 GB download for the next run (default: a temporary folder, removed).
#       Hosts this machine must reach (add them to a sandbox allowlist for the first run):
#         Hugging Face: huggingface.co, cdn-lfs.huggingface.co, *.hf.co
#         GitHub (real run): github.com, api.github.com, uploads.github.com
#       Overrides, for tests: MIRROR_UPSTREAM_BASE (default: the pinned Hugging Face resolve URL),
#       MIRROR_REPO (default: rodrigorjsf/studio).
#       Exit 0 when done, 1 when a download or a GitHub step failed, 2 on a usage error.

set -eu

REPO=${MIRROR_REPO:-rodrigorjsf/studio}
COMMIT=0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf
TAG=modelo-large-v3-turbo-0a363e9
UPSTREAM=${MIRROR_UPSTREAM_BASE:-https://huggingface.co/dropbox-dash/faster-whisper-large-v3-turbo/resolve/$COMMIT}
FILES="model.bin config.json tokenizer.json vocabulary.json preprocessor_config.json"

DRY=
DIR=
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --dir) shift; DIR=${1:-}; [ -n "$DIR" ] || { echo "usage: --dir needs a folder" >&2; exit 2; } ;;
    *) echo "usage: espelhar-modelo.sh [--dry-run] [--dir <download folder>]" >&2; exit 2 ;;
  esac
  shift
done

if [ -z "$DIR" ]; then
  DIR=$(mktemp -d)
  trap 'rm -rf "$DIR"' EXIT
fi
mkdir -p "$DIR"

hash_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}
size_of() { wc -c < "$1" | tr -d ' '; }

# 1. Download every file first, so a failure publishes nothing. A file already in --dir is reused.
for name in $FILES; do
  if [ -s "$DIR/$name" ]; then
    echo "already downloaded: $name" >&2
  else
    echo "downloading $name ..." >&2
    if ! curl -fL --retry 3 --silent --show-error -o "$DIR/$name.part" "$UPSTREAM/$name" || [ ! -s "$DIR/$name.part" ]; then
      rm -f "$DIR/$name.part"
      echo "download failed: $name (from $UPSTREAM)" >&2
      exit 1
    fi
    mv "$DIR/$name.part" "$DIR/$name"
  fi
done

# 2. Hash, and build the manifest entries.
MANIFEST=
SEP=
for name in $FILES; do
  sum=$(hash_of "$DIR/$name")
  MANIFEST="$MANIFEST$SEP  {\"name\": \"$name\", \"sha256\": \"$sum\", \"url\": \"https://github.com/$REPO/releases/download/$TAG/$name\"}"
  SEP=",
"
done

# 3. Publish: create the Release when absent, upload only what is missing or differs in size.
if [ -z "$DRY" ]; then
  if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
    echo "Release $TAG exists: keeping it" >&2
  else
    echo "creating Release $TAG on $REPO ..." >&2
    gh release create "$TAG" --repo "$REPO" --title "Speech model large-v3-turbo ($COMMIT)" \
      --notes "Mirror of the CTranslate2 files of mobiuslabsgmbh/faster-whisper-large-v3-turbo (MIT), pinned at commit $COMMIT. The Preparação downloads these files and checks each sha256 against plugin/estudio/vendor.json. Refreshed by scripts/espelhar-modelo.sh." >&2
  fi
  HAVE=$(gh release view "$TAG" --repo "$REPO" --json assets --jq '.assets[] | "\(.name) \(.size)"')
  for name in $FILES; do
    if printf '%s\n' "$HAVE" | grep -qx "$name $(size_of "$DIR/$name")"; then
      echo "asset up to date: $name" >&2
    else
      echo "uploading $name ..." >&2
      gh release upload "$TAG" "$DIR/$name" --repo "$REPO" --clobber >&2
    fi
  done
fi

printf '[\n%s\n]\n' "$MANIFEST"
