# Browser gate coverage

`node tools/check.mjs` reads classes, tokens, files, ids and the pin. It says
so itself: it cannot see spacing, contrast, focus, behaviour or how the page
looks. rux-ds has five gates for that, they need a real browser, and **they
are not vendored with the pin** — rux-ds's `tools/` carries the app check
and the server and nothing else.

**RUNNING THEM HERE DOES NOT MEAN COPYING THEM IN.** This header used to say
it did, and on 2026-09-08 that sentence cost a session its plan: it was
read, believed, and a whole restart was built around it while the correction
sat forty lines below. Serve this app through the rux-ds clone's own origin
with a gitignored symlink — `.brand/sched` → this repository — and the page
loads from `localhost:8642/.brand/sched/index.html` with `/tools/check-*.js`
already same-origin to `eval`. Nothing is copied into this repository and
nothing is deleted from it. **The symlink does not survive**; it was gone by
2026-09-08 and had to be remade. `.brand/` is in rux-ds's `.gitignore`, so
`git add -A` there cannot sweep it up.

Serving this app on its own port instead does not work: `tools/serve.mjs` sets
no CORS headers, so gates on 8642 are unreadable from a page on 8643.

It remains a gap worth closing upstream: an app on a tag cannot check its own
rendering without a checkout of the design system beside it.

## Swept 2026-09-08 at `52efa52`

Both pages, white theme asserted by `--rux-field-hover` (#e8e8e8) and `body`
`rgb(255,255,255)` read in the same execution, 1440×950, focus taken with Tab
then blurred (`activeElement` BODY, `hasFocus` true), transitions and
animations suppressed (`body` `transition-duration` 0s), IBM Plex serving,
pointer parked with only HTML, BODY and MAIN.`rux--content` in `:hover`,
settle asserted by the absence of `.rux--inline-loading` in the same execution
as the gate, both pages looked at. `node tools/check.mjs` exits 0 at v0.1.11.

| Gate | `index.html` | `specimen.html` |
|---|---|---|
| `check-runtime-classes` | 119 / 125, **5 stripped**, 11 added | 56 / 56, 0 stripped, 0 added |
| `check-a11y` | 0 findings, 0 notes, ring check live | 0 findings, 0 notes, ring check live |
| `check-spacing` | 51 checked, 46 matched, 1 known, **4 diverges**, 6 not comparable, 26 no reference | 30 checked, 28 matched, **2 diverges**, 1 not comparable, 9 no reference |
| `check-rendered` | throws | throws |
| `check-behaviour` | 4 of 18 | 4 of 18 |

**The red run was done again, on both.** Stripping every `:focus` outline
and box-shadow took `check-a11y` from 0 to **30** on `index.html` and from 0
to 14 on `specimen.html`; removing the style returned both to 0.
`index.html` read 20 red at `b8c373d` and reads 30 now, which is the
direction the toolbar and the per-row toggletips should move it.

**The five stripped classes are the same five, and still not a defect.** The
`inline-loading` spinner set `sch-data.js` replaces on first read. Unchanged
in kind since 2026-09-06.

**Eleven added, and every one resolves.** They are the toggletip and popover
sets the bus rows build at runtime. ADDED is the harmless direction for the
ratchet, but "harmless" is not "resolves", so each was checked against the
pinned rux-ds's `css/rux.css` by hand: all eleven are compiled there, as
are `rux--btn--selected` and `rux--menu-item__selection-icon`. The only class
this app BUILDS rather than writes out is `sch--no-${r}` over
`VIEW_ROWS = ['client','time','reqs','drivers']` (`sch-data.js:1503`), and
those four are exactly the four selectors at `sch.css:607`. No orphan.
`rux--inline-` matches only a comment, not a built class.

### Four divergences on `index.html`, two of them new

`rux--header__name` and `rux--tab-content` are the standing pair, both
adjudicated below and unchanged. The two new ones:

**`rux--css-grid--full-width` — this app's own decision, already reasoned.**
No inline padding where the capture has 16px, and the cause is
`--rux-grid-margin: 0` in `rux-overrides.css`, whose comment records the
alternative it rejected. **The comment's arithmetic was checked rather than
taken.** Measured chain to the column's content: `MAIN.rux--content` pays
32px of Carbon's own padding, the column's `margin-inline-start` pays 16px,
content lands at 48px — and `.sch-board` also lands at 48px, so the two
regions do agree. The comment's "16px" is the grid's OWN contribution, not
the page's outer inset; read that way it holds. Not a defect.

**`rux--tabs__nav-item` margin — Carbon caused it, exactly like
`header__name`.** Ours reports `margin-inline-start: 1px` where the capture
has none, on the second of two tabs. The rule is Carbon's own compiled CSS,
untouched, at rux-ds's `css/rux.css:25485`:

    .rux--tabs .rux--tabs__nav-item + .rux--tabs__nav-item { margin-inline-start: 0.0625rem; }

An adjacent-sibling rule needs two adjacent tabs to fire. Nothing in this
repository selects that class. Not a defect.

**`specimen.html` is no longer unchanged figure for figure**, and one cause
explains it: it picked up the same `rux--css-grid` divergence, taking it
from 29 matched / 1 diverges to 28 / 2. Its `check-runtime-classes` and
`check-a11y` readings are identical to every prior sweep.

### The last two cells are corrected, not inherited

Both were carried as "N/A" below. Both were run this time, and both readings
are different from what that word implies.

**`check-rendered` does not report N/A — it THROWS.** `TypeError: Cannot read
properties of null (reading 'getBoundingClientRect')`, on both pages, because
its unit is `.ks-sec` inside `.ks-main` (`tools/check-rendered.js:24`) and
neither page has either. The cell is still empty; the reason is now measured.

**`check-behaviour` reports failures it did not earn — the opposite of what
was written below.** The prior entry said it "would report a pass it did not
earn". It does not. It reports **4 passed of 18** on both pages, and all 14
others read `no X on this page`. That message is section-id scoping, not
absent components: every fixture is looked for inside a kitchen-sink section
— `#ui-shell`, `#tabs`, `#accordion` — so no consumer app can ever satisfy
one.

**Proved by hand on `index.html`, since the gate cannot reach it.** The
shell it calls absent works: nav 0 → 256 → 0 across two clicks of the
trigger, glyph `#i-menu` → `#i-close` → `#i-menu`, `aria-label` "Close menu"
while open, `side-nav--expanded` set. The tablist it calls "fewer than two
tabs" has two, with roving `tabindex` 0 / -1 and `aria-selected` true /
false. Both are exactly what the gate would have asserted had it been able
to see them.

The four that DO pass are real and worth the cell: `profile` (a theme radio
moves `data-theme` and stores it; a typed name is stored) and `theme`
(`apply()` puts the stored theme on `<html>`, and refuses a value that is
not a theme name). Those test module APIs rather than sink markup, which is
why they survive the move to an app. **This belongs in
`docs/rux-ds-requests.md`:** the behaviour gate is unusable by consumers for
14 of its 18 cases, and the fix is scoping the fixtures to the document
rather than to a section id.

## Re-swept 2026-09-07 at `b8c373d`

Both pages, white theme asserted by `--rux-field-hover` (#e8e8e8) and
`body` `rgb(255,255,255)` read in the same execution, 1440×950, focus taken
with Tab then blurred (`activeElement` BODY, `hasFocus` true), transitions and
animations suppressed, IBM Plex serving, pointer parked with only HTML, BODY
and MAIN in `:hover` and no control under measurement, page looked at.

| Gate | `index.html` | `specimen.html` |
|---|---|---|
| `check-runtime-classes` | 122 / 117, **5 stripped**, 0 added | 56 / 56, 0 stripped, 0 added |
| `check-a11y` | 0 findings, 0 notes, ring check live | 0 findings, 0 notes, ring check live |
| `check-spacing` | 46 checked, 43 matched, 1 known, **2 diverges**, 4 not comparable, 28 no reference | 30 checked, 29 matched, **1 diverges**, 1 not comparable, 9 no reference |
| `check-rendered` | N/A | N/A |
| `check-behaviour` | N/A | N/A |

**The red run was done again.** Stripping every `:focus` outline and
box-shadow took `check-a11y` from 0 to 20 on `index.html` and from 0 to 14 on
`specimen.html`, and restoring them returned both to 0.

**`specimen.html` is unchanged, figure for figure.** `index.html` is not, and
the growth is the page's own: it gained 151 lines across `7ce4e93`
(right-click actions), `c277be1` (cancel a trip) and `3202be8` (the board on
the whole screen), all after the sweep below. 60/55 became 122/117 for that
reason and no other. The **same five** adjudicated classes are stripped — the
`inline-loading` spinner `sch-data.js` replaces — so that finding is unchanged
in kind.

**One divergence is new, and it is this app's own decision, already reasoned.**
`rux--tab-content` reports no inline padding where Carbon's capture has 16px,
on 2 of 2 variants. That is `.rux--side-panel .rux--tab-content
{ padding-inline: 0 }` in `rux-overrides.css`, added at `f9716f5` — after the
sweep below, which is why it appears now. Its comment there records the
measurement (a field sat 33px from the panel edge against the title's 17), the
specificity, the panel scope, and that **no capture settles it**: none of the
nine captured side-panel stories contains tabs. Not a defect and not to be
removed. `rux--header__name` is the standing Carbon-caused one described below.

**HOW THIS WAS RUN, AND IT DID NOT NEED THE TOOLS COPIED IN.** The header of
this file says sweeping here means copying rux-ds's browser gates over and
deleting them again. It does not. The app was served through the rux-ds
server's own origin by a gitignored symlink in that clone (`.brand/sched` →
this repository), so the page loads from `localhost:8642/.brand/sched/` and
`/tools/check-*.js` are already there to `eval`. Nothing was copied into this
repository and nothing was deleted from it. The environment matches the earlier
sweeps in the way that matters: everything this app owns served 200, and only
`/switcher.js` and `/account.js` 404 — root-absolute hub files that 404 on this
app's own server too, which is the drift the report below already names.

**A TIMING TRAP, PAID FOR HERE.** The first `check-runtime-classes` reading of
this sweep was taken immediately on load and said 122/122 with **0 stripped**.
That is wrong and it looks like a clean result: `sch-data.js` had not yet
replaced `#sch-status`, so the spinner was still in the live DOM and matched
the file. Read again once settled — `.rux--inline-loading` gone — it says
122/117 with the five stripped. rux-ds's own pages settle synchronously and
never show this; a page that fetches does. Wait for the page to settle before
this gate, not merely for it to load.

## Re-swept 2026-09-06 at `abb971a`

The grid moved onto `border-subtle-01` and `layer-accent-01` and the header
band lost its vertical rules. **Every reading is unchanged again** - 60/55
with 5 stripped and 56/56 clean, 0 a11y findings on both with the ring check
live, 29/28 and 30/29 with the one `header__name` divergence. Colour was the
whole change and `check-spacing` measures boxes; the contrast that moved was
measured directly instead, and `docs/log.md` carries it.

## Re-swept 2026-09-06 at `9151235`

The bar's default fill became blue, the selection ring moved to
`layer-selected-inverse`, and the drag added its own `sch-` classes. **Every
reading is unchanged from the first sweep below**, which is the answer those
changes should give: none of them touches a Carbon component's box, and the
new classes are the app's own, which `check-runtime-classes` does not track.

| Gate | `index.html` | `specimen.html` |
|---|---|---|
| `check-runtime-classes` | 60 / 55, 5 stripped, 0 added | 56 / 56, 0 stripped, 0 added |
| `check-a11y` | 0 findings, 0 notes, ring check live | 0 findings, 0 notes, ring check live |
| `check-spacing` | 29 / 28, 1 diverges, 1 not comparable, 9 no reference | 30 / 29, 1 diverges, 1 not comparable, 9 no reference |

The contrast the colour change introduced was measured separately rather than
left to this gate, which does not read colour: label on fill 5.94:1 in all
five themes, selection ring on fill 7.09:1 on the dark pair and 13.79:1 on the
light three. `docs/log.md` carries the numbers.

## Swept 2026-09-06 at `092f8f3`

Both pages, white theme asserted by `--rux-field-hover` (#e8e8e8) read in the
same execution, 1440×950, focus taken with Tab then blurred (`activeElement`
BODY, `hasFocus` true), transitions and animations suppressed, IBM Plex
serving, pointer parked off content, page looked at.

| Gate | `index.html` | `specimen.html` |
|---|---|---|
| `check-runtime-classes` | 60 / 55, **5 stripped**, 0 added | 56 / 56, 0 stripped, 0 added |
| `check-a11y` | 0 findings, 0 notes, ring check live | 0 findings, 0 notes, ring check live |
| `check-spacing` | 29 checked, 28 matched, **1 diverges**, 1 not comparable, 9 no reference | 30 checked, 29 matched, **1 diverges**, 1 not comparable, 9 no reference |
| `check-rendered` | N/A | N/A |
| `check-behaviour` | N/A | N/A |

**The red run was done, on the gate that read zero.** Stripping every outline
and box-shadow on `:focus` took `check-a11y` from 0 findings to 21, and
restoring them returned it to 0. A green reading from this gate means
something here.

**`check-rendered` and `check-behaviour` are N/A for the same reason they are
on rux-ds's own templates.** The first measures `.ks-sec` sections inside
`.ks-main`, which is kitchen-sink structure neither page has. The second
drives every rux-ds module against sink markup, and these pages carry the
shell and almost nothing else, so it would report a pass it did not earn.

## The two findings, both adjudicated

**Five stripped classes on `index.html`, and they should be there.** They are
`inline-loading`, its `__animation` and `__text`, and `loading` with
`loading--small` — the spinner the page ships inside `#sch-status` saying
"Loading the week…". `sch-data.js` replaces the status contents the moment the
first read returns, so the classes are in the file and never in the settled
page. That is the point of them: a page whose script never runs, or whose
first read is slow, says something true instead of showing an empty grid.
Not a defect, and not to be removed.

**One spacing divergence on both pages, and Carbon caused it.**
`rux--header__name` has 8px of inline start padding where Carbon's capture has
16px. The rule doing it is Carbon's own:

    .rux--header__menu-toggle:not(.rux--header__menu-toggle__hidden) ~ .rux--header__name

which tightens the app name when the hamburger sits beside it. The captured
story has the toggle hidden, because it was captured at desktop where Carbon
hides it by default; this app deliberately shows it at every width, so
Carbon's own rule fires and the padding is correct rather than wrong.

**THIS ADJUDICATION IS NOW PERMANENT, NOT PROVISIONAL, 2026-09-08.** It used to
have to be re-argued each sweep because rux-ds's `js/ui-shell.js` called the
configuration causing it invented -- "a desktop hamburger invents a state IBM's
design does not have" -- so a reader had no standing answer. Both halves of that
are now settled, on rux-ds `main` and in no tag:

**The comment was corrected** (`a545cc1`). `ui-shell.js` names both shells,
and the three compiled readings this app raised -- `__hidden` is markup-applied
and the stylesheet never adds it; the `:not(.__hidden) ~ __header__name` rule
carries no media query and so can only fire in a permanent-toggle shell; the
`--ux`/`--hidden`/`--expanded` cascade order does work only above the breakpoint
-- are the documented doctrine rather than a consumer's complaint. The
collapsible desktop shell is legitimate. So the padding here is Carbon
behaving correctly for the shell this app chose, which is what this entry
already said.

**And the capture fix was DECLINED, with a reason that settles it for good.**
`carbon-react-spacing.json` keys on an element's own class signature plus its
parents, and holds exactly one entry for `cds--header__name`:
`paddingInlineStart` 16px, parent `cds--header`. Our 8px comes from a SIBLING
selector, and both shells give the name an identical signature and an identical
parent -- so no capture can tell them apart inside `check-spacing`'s model.
`check-spacing.js:482` passes a signature on ANY recorded variant, so adding an
8px variant would make 8px acceptable on all eleven persistent-shell templates
and on rux-ds's own `index.html`, where it would be a real regression. What
would fix it is teaching `check-spacing` to express a sibling condition, which
is a change to a control and a different ask.

**So: keep adjudicating it, and stop treating that as a stopgap.** The finding
is correct, the padding is correct, and there is no upstream change coming that
would remove either. We are not waiting on rux-ds for this one.
