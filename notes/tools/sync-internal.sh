#!/bin/sh
#
# A PRIVATE VIEWER FOR THE INTERNAL TIER. Everything sync-guides.sh refuses to
# carry -- gap markers, issue ids, evidence stamps, the notes under every
# phase, and the concept pages that have no published tier at all -- rendered
# with this project's own pages into build/, which .gitignore keeps out of the
# repository and check-links, check-classes and check-publishable all skip.
#
# Nothing this writes is published. It never touches data/guides/ or guides/,
# or anything tracked; the public build runs exactly as before.
#
#   sh tools/sync-internal.sh
#   (cd build/internal/site && PORT=8644 node ../../../../design/tools/serve.mjs)
#
set -e

HERE="$(cd "$(dirname "$0")/.." && pwd)"
ATLAS="${ATLAS:-$HERE/../../rux-ln-atlas}"
DS="${DS:-$HERE/../design}"
OUT="$HERE/build/internal"

[ -d "$ATLAS/.git" ] || { echo "no atlas checkout at $ATLAS (override with ATLAS=)"; exit 1; }
[ -f "$DS/css/rux.css" ] || { echo "no design at $DS (override with DS=)"; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/data" "$OUT/site"
(cd "$ATLAS" && python3 tools/emit.py --all --reviews --exercises --references --concepts --internal --out "$OUT/data" >/dev/null)
# The pages reach the design system at /design/ -- absolute, since 2026-09-10
# -- so the private site root gets a folder of
# exactly that name, symlinked rather than copied, and served by design's OWN
# serve.mjs below (its plain, non-workspace mode resolves a root-absolute
# path against its own cwd, which is this folder).
ln -s "$(cd "$DS" && pwd)" "$OUT/site/design"
# The pages also reach this project's own behaviour at ../js/ and the mark at
# ../brand/, by the same relative paths the public site uses.
ln -s "$HERE/js" "$OUT/site/js"
ln -s "$HERE/brand" "$OUT/site/brand"
# And this project's own two override hooks at the root, linked after
# design's own by every page; without them the viewer 404s twice per page.
ln -s "$HERE/theme.css" "$OUT/site/theme.css"
ln -s "$HERE/overrides.css" "$OUT/site/overrides.css"
LN_DATA="$OUT/data" LN_OUT="$OUT/site/guides" DS="$DS" node "$HERE/tools/build.mjs"

echo "  private site: $OUT/site  (git-ignored, never published)"
echo "  view it:      (cd $OUT/site && PORT=8644 node $(cd "$DS" && pwd)/tools/serve.mjs)"
