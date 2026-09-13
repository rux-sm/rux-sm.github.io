#!/bin/sh
#
# Bring Atlas's export tier into notes/data/guides/, rebuild the pages,
# and check everything. Nothing here publishes: `git push` does that, after
# the pre-commit hook has swept the staged bytes for names.
#
#   npm run export
#
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ATLAS="${ATLAS:-$ROOT/../atlas}"
[ -d "$ATLAS/.git" ] || { echo "no atlas at $ATLAS -- clone it beside this repository, or set ATLAS=<dir>"; exit 1; }
cd "$ROOT/notes" && ATLAS="$ATLAS" sh tools/sync-guides.sh
cd "$ROOT" && node tools/build.mjs && node tools/check.mjs
echo
echo "  exported from atlas $(git -C "$ATLAS" rev-parse --short HEAD). Commit and push to publish."
