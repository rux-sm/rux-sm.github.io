#!/bin/sh
#
# Bring Atlas's export tier into ln/data/atlas/, rebuild the pages,
# and check everything. Nothing here publishes: `git push` does that, after
# the pre-commit hook has swept the staged bytes for names.
#
#   npm run export
#
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ATLAS="${ATLAS:-$ROOT/../atlas}"
[ -d "$ATLAS/.git" ] || { echo "no atlas at $ATLAS -- clone it beside this repository, or set ATLAS=<dir>"; exit 1; }
cd "$ROOT/ln" && ATLAS="$ATLAS" sh tools/sync-export.sh
# One command a line: in a chain joined by &&, sh does not stop the script when
# a middle command fails, and a failed build went on to say it had exported.
cd "$ROOT"
node tools/build.mjs
# The check fails when a rebuild leaves generated pages changed and unstaged,
# which is right before a commit and is always the case straight after an
# export. So what the export wrote is staged first, and only that.
git add ln/data/atlas ln/index.html
node tools/check.mjs
echo
echo "  exported from atlas $(git -C "$ATLAS" rev-parse --short HEAD). Commit and push to publish."
