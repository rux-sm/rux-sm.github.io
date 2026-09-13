#!/bin/sh
#
# Start a project on rux-ds. Phase 11, roadmap §4.11; served rather than
# vendored since roadmap §4.14 -- §8.4 diff C, decided in §8.6, 2026-09-10.
#
#   sh tools/new-project.sh                       asks, one question at a time
#   sh tools/new-project.sh <dir> [template] [page]
#   sh tools/new-project.sh <dir> --template table-page --theme g10 \
#                           --name "Orders" --title "Orders" --page orders
#   sh tools/new-project.sh <dir>             on a project that already
#                                             exists: nothing to do -- there
#                                             is no pin here to move. Name a
#                                             template/page to add one
#   sh tools/new-project.sh <dir> --path /name/  the app's path under the
#                                             account root (default: /<dir>/),
#                                             used once, for the switcher
#   sh tools/new-project.sh <dir> --grid full   the grid uncapped within the
#                                             page (default: capped at 99rem)
#
# Every question offers only what the templates and sink attest; the list of
# what a project can choose, and which layer offers it, is docs/choices.md.
# What THIS script chooses is what a text substitution on a template can do:
# the template, the theme on <html>, the grid's width on the outer grid, the
# product name in the header, the page title and the file name. Which fields, which buttons, which shell
# parts — that is composition, and the rux-ds-page skill does it.
#
# NOTHING OF RUX-DS IS COPIED. A page's stylesheets and scripts link
# `/rux-ds/…` on the shared account-root origin, so what a visitor gets is
# whatever rux-ds has deployed -- its newest release tag, checked in
# rux-ds's own Pages workflow before that tag goes live. There is no PIN,
# no checksum, and no second command to move one: an app is on the live tag
# or it is not on rux-ds. The trade this drops is holding an app back on an
# older release on purpose; roadmap §8.3's alternative (b), a second
# deliberately-updated path, is the fallback if that is ever needed.
#
# TWO KINDS OF FILE, AND THE SCRIPT TREATS THEM DIFFERENTLY.
#   rux-theme.css           the project's OWN deltas, linked after rux-ds's
#   rux-overrides.css       pair at /rux-ds/css/. Written only if absent, and
#                           written EMPTY but for a header.
#   <page>.html             the project's. Written only if absent, from the
#                           template with its five paths pointed at /rux-ds/
#                           and the two project links added after them.
#
# AFTER A PAGE IS WRITTEN THE DRIFT REPORT RUNS: tools/drift.mjs compares its
# shell to rux-ds's own app-shell template and prints what differs. It blocks
# nothing; a page is the project's, and the report is what says a shell
# change upstream has not reached it.
#
# THE FIRST RUN SCAFFOLDS. With no tools/check.mjs in the folder yet,
# tools/app-skeleton/ is copied in (each file only if absent): the check and
# serve launchers, the hook, the Pages workflow, AGENTS.md. Each launcher
# reads rux-ds from the checkout beside the project (or DS=<dir>). The
# written page gets its switcher entries replaced with Home and this app and
# /switcher.js linked before </body> -- two things the drift report cannot
# see and verb 3 did by hand. That rewrite happens AFTER the page-writing
# region check-parity extracts, because the builder's export does not do it:
# the builder makes a page, this makes an app. Then the new app's own check
# runs, against the rux-ds checkout this script is itself run from.
#
# docs/starting-a-project.md is the long version.
set -e

HERE="$(cd "$(dirname "$0")/.." && pwd)"
THEMES="white g10 g90 g100 rux"
# capped is Carbon's default, max-inline-size 99rem and centred -- a reading
# width. full is its own --full-width modifier, attested by
# elements-grid--full-width, for a page that is scanned rather than read: a
# board, a wide table. Measured 2026-09-06 on the scheduler at 2000px, the cap
# left ~200px dead each side while the board scrolled for want of room.
GRIDS="capped full"
TEMPLATES="$(ls "$HERE/templates" | sed 's/\.html$//')"

has() { for x in $2; do [ "$x" = "$1" ] && return 0; done; return 1; }
esc() { printf '%s' "$1" | sed 's/[&|\\]/\\&/g'; }

# ---- arguments ------------------------------------------------------------
DIR=""; TPL=""; THEME=""; GRID=""; NAME=""; PREFIX="Rux"; TITLE=""; PAGE=""; APP_PATH=""
while [ $# -gt 0 ]; do
  case "$1" in
    --template) TPL="$2"; shift 2 ;;
    --theme)    THEME="$2"; shift 2 ;;
    --grid)     GRID="$2"; shift 2 ;;
    --name)     NAME="$2"; shift 2 ;;
    --prefix)   PREFIX="$2"; shift 2 ;;
    --title)    TITLE="$2"; shift 2 ;;
    --page)     PAGE="$2"; shift 2 ;;
    --path)     APP_PATH="$2"; shift 2 ;;
    -h|--help)  sed -n '3,21p' "$0"; exit 0 ;;
    --*)        echo "unknown flag $1"; exit 1 ;;
    *) if [ -z "$DIR" ]; then DIR="$1"; elif [ -z "$TPL" ]; then TPL="$1"; elif [ -z "$PAGE" ]; then PAGE="$1"; fi; shift ;;
  esac
done

# ---- a project that already exists, named with nothing else: nothing to do
# Measured 2026-09-02, back when a pin was the thing to move: re-running with
# only the folder re-asked the five questions and wrote an index.html from
# app-shell into a project whose page was orders.html. tools/check.mjs is the
# proof a project was scaffolded. With one present and no template, theme,
# name, title or page named, there is nothing this script does any more --
# name any of those and it is a second page, asked for as before.
EXISTING=""
if [ -n "$DIR" ] && [ -e "$DIR/tools/check.mjs" ] && [ -z "$TPL$THEME$GRID$NAME$TITLE$PAGE" ]; then
  EXISTING=1
fi

# ---- the questions, asked only for what was not given ---------------------
# A numbered list, a default in brackets, Enter takes the default.
ask() { # ask VAR "question" "default" "options or empty"
  _v="$1"; _q="$2"; _d="$3"; _o="$4"
  if [ -n "$_o" ]; then
    i=0; for x in $_o; do i=$((i+1)); printf '  %2d  %s\n' "$i" "$x"; done
  fi
  printf '%s [%s]: ' "$_q" "$_d"
  read -r _a || _a=""
  [ -z "$_a" ] && _a="$_d"
  if [ -n "$_o" ] && [ "$_a" -eq "$_a" ] 2>/dev/null; then
    _a="$(printf '%s\n' $_o | sed -n "${_a}p")"
  fi
  eval "$_v=\"\$_a\""
}
if [ -z "$DIR" ]; then
  echo "rux-ds: a new project. Enter takes the default."
  ask DIR "Folder for the project" "$HOME/Developer/my-app" ""
fi
if [ -n "$EXISTING" ]; then
  echo "$DIR is already an app on rux-ds. It vendors nothing (roadmap §8.4):"
  echo "there is no pin here to move. Name --template/--theme/--grid/--name/"
  echo "--title/--page to add another page."
  exit 0
fi
if [ -z "$TPL" ]; then
  echo "The page shape — each is a complete page, shell included (docs/choices.md):"
  ask TPL "Template" "app-shell" "$TEMPLATES"
fi
has "$TPL" "$TEMPLATES" || { echo "no templates/$TPL.html; the templates are:"; printf '  %s\n' $TEMPLATES; exit 1; }
if [ -z "$THEME" ]; then
  echo "The DEFAULT theme on <html> -- every page offers all five in its account"
  echo "panel, and a visitor's choice wins; the shell header keeps its own dark one:"
  ask THEME "Theme" "white" "$THEMES"
fi
has "$THEME" "$THEMES" || { echo "no theme $THEME; one of: $THEMES"; exit 1; }
if [ -z "$GRID" ]; then
  echo "The grid's width: capped at 99rem and centred, Carbon's reading width, or"
  echo "the full available content width for a page that is scanned rather than read:"
  ask GRID "Grid" "capped" "$GRIDS"
fi
has "$GRID" "$GRIDS" || { echo "no grid $GRID; one of: $GRIDS"; exit 1; }
if [ -z "$NAME" ]; then
  echo "The product name in the header, after the '$PREFIX' prefix:"
  ask NAME "Name" "DS" ""
fi
if [ -z "$TITLE" ]; then
  ask TITLE "Browser tab title" "$PREFIX $NAME" ""
fi
if [ -z "$PAGE" ]; then
  ask PAGE "File name, without .html" "index" ""
fi

# A first run is the one with no scaffold yet: it seeds brand files and
# tools/app-skeleton/ (below). Decided here, before anything is written, so a
# run that fails halfway cannot look like one.
NEW_APP=""
[ -e "$DIR/tools/check.mjs" ] || NEW_APP=1

mkdir -p "$DIR"

# THE BRAND, THREE FILES, AND ONLY ON A FIRST RUN. logo.svg for the header,
# favicon.svg for the tab, icon.svg for the 32px tile the hub draws; each is
# the project's to swap, and brand/README.md is the spec.
if [ -n "$NEW_APP" ]; then
  mkdir -p "$DIR/brand"
  cp "$HERE/brand/logo.svg" "$DIR/brand/logo.svg"
  cp "$HERE/brand/favicon.svg" "$DIR/brand/favicon.svg"
  cp "$HERE/brand/icon.svg" "$DIR/brand/icon.svg"
fi

for f in rux-theme.css rux-overrides.css; do
  [ -e "$DIR/$f" ] || cat > "$DIR/$f" <<DELTA
/* $f -- this project's own, linked after /rux-ds/css/$f, served from
   rux-ds's own repository and never copied here. Only what THIS project
   changes goes here: token values inside a [data-theme] block
   (rux-theme.css), or component rules at Carbon's own specificity with no
   !important (rux-overrides.css). Empty is the normal state. rux-ds
   AGENTS.md, "Where a change goes". */
DELTA
done

# ---- the page: five paths, then the five substitutions --------------------
if [ -e "$DIR/$PAGE.html" ]; then
  PAGE_NOTE="kept, already there"
else
  N="$(esc "$NAME")"; P="$(esc "$PREFIX")"; T="$(esc "$TITLE")"
  # The class the grid gains, or nothing: with GC empty the expression below
  # rewrites the line to itself, so a capped page is byte-identical to before.
  case "$GRID" in full) GC=" rux--css-grid--full-width" ;; *) GC="" ;; esac
  sed -e 's|"\.\./css/rux\.css"|"/rux-ds/css/rux.css"|' \
      -e 's|"\.\./css/rux-theme\.css"|"/rux-ds/css/rux-theme.css"|' \
      -e 's|"\.\./css/rux-overrides\.css"|"/rux-ds/css/rux-overrides.css"|' \
      -e 's|"\.\./brand/|"brand/|g' \
      -e 's|"\.\./assets/|"/rux-ds/assets/|g' \
      -e 's|"\.\./js/|"/rux-ds/js/|g' \
      -e "s|^<html lang=\"en\" data-theme=\"white\">|<html lang=\"en\" data-theme=\"$THEME\">|" \
      -e "s|<title>[^<]*</title>|<title>$T</title>|" \
      -e "s|name--prefix\">Rux</span>&nbsp;DS|name--prefix\">$P</span>\&nbsp;$N|" \
      -e "s|aria-label=\"Rux DS\"|aria-label=\"$P $N\"|g" \
      -e "s|^  <div class=\"rux--css-grid\( [^\"]*\)\{0,1\}\">|  <div class=\"rux--css-grid\1$GC\">|" \
      "$HERE/templates/$TPL.html" \
  | awk '{ print } /href="\/rux-ds\/css\/rux-overrides\.css"/ { print "<link rel=\"stylesheet\" href=\"rux-theme.css\">"; print "<link rel=\"stylesheet\" href=\"rux-overrides.css\">" }' \
  > "$DIR/$PAGE.html"
  PAGE_NOTE="written from templates/$TPL.html · theme $THEME · grid $GRID · '$PREFIX $NAME'"

  # ---- the app step: the switcher, and /switcher.js ----------------------
  # A template's switcher lists three invented apps so the panel has something
  # to open on. An app's lists Home and itself; at runtime /switcher.js at the
  # account root replaces the list with the hub's switcher.json and marks the
  # app you are on -- so the entries written here are what a visitor sees only
  # when that fetch fails. Done on the first page of a new app only: a second
  # page copies the first, and a page that exists is never touched.
  if [ -n "$NEW_APP" ] && grep -q 'class="rux--switcher"' "$DIR/$PAGE.html"; then
    [ -n "$APP_PATH" ] || APP_PATH="/$(basename "$DIR")/"
    case "$APP_PATH" in
      /|/*/) ;;
      *) echo "--path must be / or /name/, got $APP_PATH"; exit 1 ;;
    esac
    AP="$(esc "$APP_PATH")"; AN="$(esc "$PREFIX $NAME")"
    awk -v home='      <li class="rux--switcher__item"><a class="rux--switcher__item-link" href="/">Home</a></li>' \
        -v rule='      <li><hr class="rux--switcher__item--divider"></li>' \
        -v self="      <li class=\"rux--switcher__item\"><a class=\"rux--switcher__item-link\" href=\"$AP\" aria-current=\"page\">$AN</a></li>" '
      /class="rux--switcher"/ { print; print home; print rule; print self; skip=1; next }
      skip && /<\/ul>/ { skip=0 }
      !skip { print }
    ' "$DIR/$PAGE.html" | awk '/^<\/body>/ && !done { print "<script src=\"/switcher.js\"></script>"; done=1 } { print }' > "$DIR/$PAGE.html.new"
    mv "$DIR/$PAGE.html.new" "$DIR/$PAGE.html"
    PAGE_NOTE="$PAGE_NOTE · switcher: Home, $APP_PATH · /switcher.js linked"
  fi
fi

# ---- the scaffold, on a first run only -------------------------------------
# tools/app-skeleton/, each file only if absent, four placeholders filled.
# README.md there describes the skeleton and is not part of an app.
SKEL_NOTE=""
if [ -n "$NEW_APP" ]; then
  [ -n "$APP_PATH" ] || APP_PATH="/$(basename "$DIR")/"
  DN="$(esc "$PREFIX $NAME")"; DT="$(esc "${TITLE:-$PREFIX $NAME}")"; DP="$(esc "$APP_PATH")"; DD="$(esc "$(basename "$DIR")")"
  SKEL="$HERE/tools/app-skeleton"
  WROTE=""
  for f in $(cd "$SKEL" && find . -type f ! -name README.md | sed 's|^\./||' | sort); do
    [ -e "$DIR/$f" ] && continue
    mkdir -p "$DIR/$(dirname "$f")"
    sed -e "s|@NAME@|$DN|g" -e "s|@TITLE@|$DT|g" -e "s|@PATH@|$DP|g" -e "s|@DIR@|$DD|g" "$SKEL/$f" > "$DIR/$f"
    [ -x "$SKEL/$f" ] && chmod +x "$DIR/$f"
    WROTE="$WROTE $f"
  done
  SKEL_NOTE="${WROTE:-nothing, all present}"
fi

echo "rux-ds (served, /rux-ds/ on the account-root origin) → $DIR"
echo "  brand/logo.svg, brand/favicon.svg, brand/icon.svg   yours; swap any time, left alone if present"
echo "  rux-theme.css, rux-overrides.css   yours, deltas only; left alone if present"
echo "  $PAGE.html   $PAGE_NOTE"
[ -n "$SKEL_NOTE" ] && echo "  scaffold  $SKEL_NOTE"

# The drift report, on every run: what each page's shell carries that rux-ds's
# own template does not, and the reverse. It prints and blocks nothing. DS is
# THIS checkout -- exactly what the page was just written against -- rather
# than the sibling default tools/drift.mjs falls back to, which may not be
# where $DIR happens to sit.
DS="$HERE" node "$HERE/tools/drift.mjs" "$DIR"

# ---- a new app's own check, and what is left to a person -------------------
if [ -n "$NEW_APP" ]; then
  echo ""
  echo "── the app's check: node tools/check.mjs"
  CHECK_RC=0; ( cd "$DIR" && DS="$HERE" node tools/check.mjs ) || CHECK_RC=$?
  echo ""
  echo "  Left to you, in this order (docs/verbs.md, verb 3):"
  echo "    cd $DIR && git init && git config core.hooksPath .githooks"
  echo "    create the repository (gh repo create, once rux has named the app); enable Pages (rux's click)"
  echo "    add {\"name\",\"path\":\"$APP_PATH\",\"description\"} to the hub's switcher.json; node tools/check.mjs there"
  echo "    open the page in every theme, then commit and push both"
fi
