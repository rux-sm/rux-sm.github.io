#!/bin/sh
#
# Pull the guide data from rux-ln-atlas, and record which commit produced it.
#
# THE EXPORT TIER, NEVER THE INTERNAL ONE. `emit.py --internal` keeps gap
# markers, issue ids, evidence stamps and internal paths. This script never
# passes that flag, and must not grow an option to: the export tier is what is
# fit to publish, and the filter fails closed -- if anything forbidden survives,
# emit.py writes nothing and names the pattern.
#
# WHAT DOES NOT COME ACROSS. evidence/ stays in atlas -- the vendor PDFs, the
# session help and the screenshots of a licensed environment. A guide that
# wants to show a screenshot needs a deliberate publication decision and a
# route, and there is none. See atlas _standards/renderer-brief.md section 6.
#
#   sh tools/sync-guides.sh
#
set -e

HERE="$(cd "$(dirname "$0")/.." && pwd)"
ATLAS="${ATLAS:-$HERE/../../rux-ln-atlas}"
OUT="$HERE/data/guides"

[ -d "$ATLAS/.git" ] || { echo "no atlas checkout at $ATLAS (override with ATLAS=)"; exit 1; }

SHA="$(git -C "$ATLAS" rev-parse HEAD)"
OLD="$(sed -n 's/^commit  *//p' "$OUT/PIN" 2>/dev/null)"
# TRACKED CHANGES ONLY (-uno), for sync-ds.sh's reason: an untracked file is
# not in the commit the pin names, so it cannot make the pin wrong.
if [ -n "$(git -C "$ATLAS" status --porcelain -uno)" ]; then
  echo "rux-ln-atlas at $ATLAS has uncommitted changes to tracked files."
  echo "Commit them first -- data pinned to a dirty tree cannot be reproduced."
  exit 1
fi

# PUSHED, NOT ONLY CLEAN. A pin names a commit; if the other machine never
# receives it, the pin names nothing there. Measured 2026-09-02: the portal
# sat committed and unpushed on one Mac while the README on the other pointed
# at it. Compared against the last fetch, which is the best a local check has.
UP="$(git -C "$ATLAS" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [ -z "$UP" ]; then
  echo "note: rux-ln-atlas has no upstream branch; pushed-ness not checked"
elif [ "$(git -C "$ATLAS" rev-list --count "$UP..HEAD")" != "0" ]; then
  echo "rux-ln-atlas has commits not on $UP. Push them first -- a pin that names an"
  echo "unpushed commit names nothing on the other machine."
  exit 1
fi

mkdir -p "$OUT"
# Reviews, summaries, exercises and reference documents emit at the same
# export tier as guides.
# Tests do not: --exercises reads exercises/ only, so scenario matrices and run
# sheets remain internal. emit.py sweeps every emitted document with one
# FORBIDDEN list, so nothing here can loosen what crosses.
#
# EMITTED TO A STAGING DIRECTORY, THEN SWAPPED IN, so that a document atlas
# STOPS emitting is removed rather than left behind. Writing in place could
# only ever add and overwrite: when the image token retired, the SVG it had
# copied sat in data/guides/ with nothing emitting it, and check-data.mjs
# hashes whatever is present, so the stale file was inside the hash and the
# gate called it correct. A sync that cannot prune cannot tell "atlas no
# longer sends this" from "atlas sent it and I kept it".
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
( cd "$ATLAS" && python3 tools/emit.py --all --reviews --exercises --references --out "$STAGE" )

# REFUSE AN EMPTY RESULT RATHER THAN ACTING ON ONE. emit.py fails closed and
# set -e catches a non-zero exit, but a run that succeeds and writes nothing
# would otherwise empty data/guides/ and pass every gate after it. An empty
# staging directory is "could not ask", not "the answer is none".
if [ -z "$(find "$STAGE" -name '*.json' -print -quit)" ]; then
  echo "sync: emit wrote no documents; $OUT is left as it was." >&2
  exit 1
fi

find "$OUT" -mindepth 1 ! -name PIN -delete
cp "$STAGE"/* "$OUT"/

# CONTRACT CHECK. Every file carries a `contract` number -- 3 at the time of
# writing -- and atlas bumps it when the shape changes. A renderer written
# against one number must not silently consume the next, so this reports the
# set rather than assuming it. Reporting is not enforcing: nothing here fails
# on a bump, so read the line.
CONTRACTS="$(grep -h '"contract"' "$OUT"/*.json | tr -d ' ",' | cut -d: -f2 | sort -u | tr '\n' ' ')"

# THE HASH OF WHAT WAS WRITTEN, so tools/check-data.mjs -- in the hook, the
# one check and CI -- can refuse a data/guides/ that did not come through
# here. It is the one line in this file that closes a route rather than
# reporting one: a hand-edited JSON file carries none of emit.py's sweep, and
# CI cannot read atlas to notice. Only this script writes it.
HASH="$(node "$HERE/tools/check-data.mjs" --hash)"

cat > "$OUT/PIN" <<EOF
commit   $SHA
date     $(date -u +%Y-%m-%dT%H:%M:%SZ)
subject  $(git -C "$ATLAS" log -1 --format=%s)
contract $CONTRACTS
tier     export
sha256   $HASH

Emitted by tools/sync-guides.sh via atlas tools/emit.py --all --reviews --exercises --references.
These files are INPUTS, not source. Do not hand-edit them -- the next sync
overwrites them, and the real fix belongs in the guide in atlas.
EOF

echo "synced atlas @ $(echo "$SHA" | cut -c1-7)  ·  contract $CONTRACTS"
ls "$OUT"/*.json | wc -l | tr -d ' ' | xargs echo "  guides:"

# WHAT MOVED UPSTREAM. The only channel between these repositories is a person
# reading the other one, so a decision addressed to this side -- a reply to a
# send-back, a contract bump, a migration -- arrives with no signal at all.
# README.md described three such documents wrongly before this line existed.
#
# It is the commit log rather than a summary of one, so it cannot go stale and
# needs no state file, no acknowledgement and no convention upstream has to
# keep. Reporting, not enforcing: nothing here fails, so read the lines.
if [ -n "$OLD" ] && [ "$OLD" != "$SHA" ]; then
  echo
  echo "atlas moved $(git -C "$ATLAS" rev-list --count "$OLD..$SHA") commit(s) since the previous pin:"
  git -C "$ATLAS" log --oneline --no-decorate "$OLD..$SHA" | sed 's/^/  /'
elif [ -z "$OLD" ]; then
  echo "  (no previous PIN -- nothing to compare against)"
fi
