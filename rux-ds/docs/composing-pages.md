# Composing pages

**The procedure tier.** `sink/*.html` says what each component is; this says how to
put them together and what bites on the way. The distinction is the one
`rux-ln-atlas` draws between its `sessions/` and its `guides/`: a reference of
every screen, and a procedure for actually getting something done. This project
had the first and not the second.

**Everything here was learned by shipping it wrong.** Each trap cites where the
failure is recorded, so you can read the full story rather than trust a summary.

**`.claude/skills/rux-ds-page/` is the ordered version for doing the work.** It
states each trap in a line and points back here for why. This document is where
the reasons live; keep them here rather than copying them across, since two
copies of a rule is how the counts in README drifted before `check-gates`.

---

## 1. Start from a template, never from scratch

Each is a **complete page** — shell included, because §4.6 asks for runnable
skeletons. Copy the nearest shape and delete what you do not need. The count
belongs in `npm run gates` and `portal.html`, not here; this table listed seven
of eleven and claimed ten until 2026-09-10.

| your page | start from |
| :--- | :--- |
| anything with a nav and a header | `templates/app-shell.html` |
| an overview of many things | `templates/dashboard-page.html` |
| a list of records, sortable, selectable | `templates/table-page.html` |
| creating or editing one record | `templates/form-page.html` |
| viewing one record | `templates/detail-page.html` |
| reading one record top to bottom, in order | `templates/document-page.html` |
| a query, facets that narrow it, and the results | `templates/search-results-page.html` |
| grouped preferences that save | `templates/settings-page.html` |
| one step of a multi-step flow | `templates/wizard-page.html` |
| dates and times | `templates/schedule-page.html` |
| nothing to show yet | `templates/empty-state.html` |
| something went wrong | `templates/error-state.html` |

**Do not start from `sink/ui-shell.html`.** It is the same shell in a 22rem
sandbox, so its header and nav are positioned for a specimen rather than a page.

**Read the source comments in the template you copied.** They are not decoration —
between them they carry several thousand lines, most of it recording an approach
that was tried and failed. The comment above the thing you are about to change is
usually the answer to the question you are about to ask.

---

## 2. Check the component is actually compiled

**37 of 83 Carbon components are in `css/rux.css`.** `docs/inventory.md` is the
list, with the reason for each cut. A class for a component that is not compiled
resolves to nothing and fails silently — the markup looks right and the page has
no styling on it.

`npm run verify` catches this (`check-classes` fails on a class that does not
resolve, or whose component is not compiled), so the loop is short. But knowing
before you write saves designing around something that is not there:
`date-picker`, `combo-box` and `toggletip` are deferred, `page-header` is cut.

---

## 3. The traps

Twelve. Nine shipped at least once; 3.9 is a gap the §4.6 exam found and which
has since been closed; 3.10 and 3.11 were found by LOOKING, with every gate
green throughout. The first four are the ones that make a page look *finished
and wrong*, which is worse than broken.

### 3.1 A tile inside `layer-two` is invisible on a plain page

`rux--layer-two > rux--tile` is correct **only** where it sits inside something
already painting `layer` — a tab panel, for instance. On a plain page
`layer-two` resolves to the page's own white and the tile disappears: measured
`rgb(255,255,255)` on `rgb(255,255,255)`, no border.

**Bare `rux--tile` on a white page gives `rgb(244,244,244)` and is visible.**
Copying the idiom out of `detail-page.html` faithfully is what produced the
failure — the idiom is right, the context was not.

*Recorded: roadmap §4.6, first exit attempt. `detail-page.html` states the
condition in its own source.*

### 3.2 Nothing offsets the content for a nav inside the header

`.rux--content` is indented only by a **sibling** side nav. The nav in this
shell lives inside the header, so none of Carbon's three rules match and the
content starts underneath the nav.

The templates fix it with breakpoint-scoped fixed padding in their `<head>` —
`@media (min-width: 66rem) { .rux--content { padding-inline-start: 18rem; } }`.
16rem clears the nav, the remaining 2rem is `.rux--content`'s own padding.

**A grid offset was tried and is wrong.** `lg:col-start-4` indents by three of
sixteen columns, which is proportional, while the nav is a fixed 16rem: at 1440
it overshoots by 60px, at 1100 the content starts 4px *inside* the nav. A margin
is wrong too.

*Recorded: `templates/app-shell.html`, which cites IBM hitting the same wall on
their own site.*

### 3.3 `--side-nav--ux` is 16rem, and is not the rail

Three widths, easily confused: bare `.rux--side-nav` is 3rem,
`--side-nav--rail` is the rail, `--side-nav--ux` is the 16rem nav the templates
use. Picking the wrong one silently breaks 3.2's padding, since the padding
assumes 16rem.

### 3.3a Two shells, and one class picks which one you have

`__menu-toggle__hidden` is written by **your markup**. `rux.css` never adds it;
it only acts on it above 66rem. So the class is how a page declares its shell,
and the two behave differently in ways no gate will tell you about.

| | toggle | nav | at desktop |
| :--- | :--- | :--- | :--- |
| **persistent** | carries `__hidden` | `--side-nav--ux` | nav always open, button hidden |
| **collapsible** | no `__hidden` | `--side-nav--ux --side-nav--hidden` | button present, nav opens over the page |

**All eleven templates ship the persistent shell.** Take it unless the page cannot
afford a permanent 16rem column — a wide board or table is the case that
cannot, and `rux-scheduler` is the consumer that hit it.

**If you take the collapsible shell, two things follow.**

**Drop §3.2's `padding-inline-start: 18rem`.** It indents the content past a nav
that is no longer always there; keep it and the page is indented past nothing
for as long as the nav is closed.

**Your app name moves to 8px and `check-spacing` will report it.** Carbon's
`.rux--header__menu-toggle:not(.__hidden) ~ .rux--header__name` sets
`padding-inline-start: 0.5rem` with no media query, so it fires at every width
in this shell and never in the other one. The captures are all of the
persistent shell, so the gate has nothing right to compare against and reports
8px where the capture has 16. **That is the rule working, not a defect** — but
it is a permanent divergence in that consumer's sweep until a capture of this
shell exists.

*Measured 2026-09-08 at 1440, above the breakpoint, transitions off:
`ux+hidden` is 0 wide, adding `--expanded` gives 256 with `aria-expanded` true,
removing it gives 0. Recorded in `js/ui-shell.js`, whose comment said this
state did not exist until the same day.*

### 3.4 The sprite must be inlined into every page

Referencing `../assets/icons.svg#i-name` from a `<use>` **fails silently in two
ordinary cases**: WebKit has never supported a cross-document `<use>`, so every
icon is blank in Safari, and `file://` blocks the fetch in every engine. You get
a fully styled page with no icons on it.

`npm run icons` rewrites the block between `SPRITE:BEGIN` and `SPRITE:END` in every
template **and in any page at the repository root that carries those markers**, and
`check-icons` fails if one drifts. **A ROOT PAGE OPTS IN BY CARRYING THE MARKERS** —
copy them with the rest of the template and you are covered; `tools/lib/sources.mjs`
`spritePages()` finds it from then on.

*This paragraph said the opposite until 2026-08-31* — that `icons.mjs` read
`templates/` only and a consumer page would drift silently. That was true when it was
written and `spritePages()` has since fixed it. §4.6's eighth exit attempt copied the
sprite from `table-page.html`, ran `npm run icons`, and got `pages refreshed: 0 of 10`
with `check-icons` reporting "38 fragments, 9 templates and 1 page" — already current.
**A doc that warns about a fixed problem sends the reader to do unnecessary work by
hand**, which is the failure mode of an unenforced document.

### 3.5 Without `stack-vertical`, everything is flush

There is no automatic vertical rhythm. A page with correct markup and no
`rux--stack-vertical` measures `margin 0` and `gapToNext 0` on every child:
headings flush against the section above, tiles merged into unbroken slabs.

Use `rux--stack-vertical` with a scale — the templates use
`rux--stack-scale-3` through `-7`, most often `-6`.

**No gate catches this.** `check-spacing` compares *classed* elements against
Carbon's computed signatures, and the gap between an `h2` and the section under
it belongs to neither element. `portal.html` shipped exactly this and passed all
seventeen gates.

**Between grid ROWS it is a different class, and `stack-vertical` cannot reach
there.** `.rux--css-grid` sets no `row-gap`, so the moment two columns stop
sitting side by side and stack — anything below the `lg` breakpoint — they are
flush. A stack *inside* a column has no say in the gap *between* rows.

```html
<div class="rux--css-grid rux--css-grid--with-row-gap">
```

`row-gap: var(--rux-grid-gutter)`, attested in Carbon's `elements-grid--with-row-gap`
story. Measured on the §4.6 seventh attempt's page: **0px before, 32px after**,
with the side-by-side layout unchanged at `lg`.

> **That page first recorded that no such class existed** — its source comment
> named `subgrid--with-row-gap` as the only row-gap rule in the build and split
> one grid into two to work around the absence. The absence was not real. The
> two-grid split still stands on its own merit, because those rows want
> different spacing from the gutter, but it was not forced.

*Recorded: roadmap §4.6, fourth exit attempt; the grid-row half, seventh.*

### 3.6 Sink specimens are deliberately not operable

Some fragments demo a CSS state with no trigger and no tab stop —
`sink/list-box.html`'s `<div>` field, `sink/menu.html`'s densities. Copying one
expecting a working control gives you a picture of a control.

A module claims a component by its **interactive element**, never by the root
class. If you copied a root class and no button, no module will attach.

### 3.7 An inactive container must not hide focusable children

`table-page.html` shipped `aria-hidden="true"` on an inactive batch bar that
still contained three focusable buttons — a real defect, inherited byte-for-byte
by a consumer page. Carbon pairs the two attributes; hiding without disabling
leaves keyboard users tabbing into an announced-as-absent region.

`check-a11y` catches it, but **only if you run it on your page**, which is the
whole reason it went unnoticed. See §5.

### 3.8 An overflow menu can cover its own trigger

Shipped nine times in `table-page.html` before anyone opened the page. No gate
reads occlusion.

### 3.9 Type utility classes exist — use them for group headings

`rux--type-*` gives 73 classes: `heading-compact-01`, `body-01`,
`productive-heading-03` and the rest of Carbon's scale, plus weights and
`type-italic`.

**They were missing until 2026-08-29**, and the §4.6 exam is what found it.
Carbon forwards a `type-classes` mixin and never calls it, so `@use ".../type"`
supplied the tokens and the mixins and **zero classes**. The visible cost: a
settings page's three `<legend>` group names rendered at
`12px / 400 / rgb(82,82,82)` — byte-identical to the field label beside them, so
each group name read as a label for the one field under it. There was no Carbon
class that could lift it.

`@include type.type-classes` in `src/app.scss` fixes it, at **+1.7 KB gzipped**.
A legend with `rux--type-heading-compact-01` now measures `14px / 600` against
the label's `12px / 400`.

**A `<legend>` keeps the fieldset's accessible grouping**; an `<h2>` does not.
Add the type class, do not swap the element.

**APPLIED IN ALL SIX TEMPLATE LEGENDS, 2026-08-31** — `form-page.html` ×2,
`settings-page.html` ×3, `wizard-page.html` ×1. **Until then this rule was documented
and applied nowhere**, including on the very page whose three legends are its worked
example. §4.6's eighth exit attempt found that, and it is the ordinary failure of an
unenforced document: the rule was written, the fix was measured, and no template was
revisited.

Measured before and after. All six read `12px / 400 / rgb(82,82,82)` bare and read
`14px / 600` with the class; the `Account` group on `settings-page.html` was
**byte-identical** to the `Organisation` field label beneath it — the exact defect this
section describes, live in a shipped template. `check-spacing` reads the same
44 · 43 · 1, 54 · 52 · 2 and 55 · 47 · 8 after as before, so no box moved.

**Two things this section did not say, and both matter when you apply it:**

**The numbers above are a TEXT-INPUT label**, not a checkbox or toggle row. A checkbox
row's text is `14px / 400 / rgb(22,22,22)`, so bare, a legend was *smaller and greyer*
than its own contents rather than identical to them. Identical is the `Account` case,
where the group's first row is itself a `rux--label`.

**THE COLOUR IS NOT FIXED AND CANNOT BE.** `rux--label` sets
`color: var(--rux-text-secondary)`, no `rux--type-*` utility carries colour, and the
build ships no text-colour utility at all. So a group name ends up heavier and larger
than its rows **while staying greyer than them**. Inventing a colour class is the one
thing this project does not do, so this is recorded rather than worked around.

**`sink/*.html` DELIBERATELY DOES NOT DO THIS.** Carbon renders `legend.cds--label` in
all 51 captures and never a type class, so `sink/checkbox.html`, `sink/radio.html` and
`sink/tile.html` keep their legends bare. The sink answers "what is Carbon's markup";
this section answers "how do you compose a page", and they are different questions.

### 3.10 An unattested composition inherits no spacing, and there may be no fix

Putting a `rux--tag` inline after text inside a `rux--list__item` gives you a
**word space, 4px** — and that is all Carbon offers. `.rux--tag` is
`inline-flex` with no margin of its own (the margins in its SCSS belong to the
close icon and label), `.rux--list__item` has none, and **no Carbon capture
pairs a tag with a list item at all.** There is no reference composition to
inherit spacing from, because Carbon never renders this one.

**That is the general rule and it is worth more than the example.** Composing
two components in an arrangement Carbon does not ship gives correct classes and
whatever spacing the normal flow happens to produce — and **no gate reads it.**
`check-spacing` compares classed elements against Carbon's computed signatures,
and the gap between a text node and its sibling belongs to neither.

> **`stack-horizontal` LOOKS LIKE THE FIX AND IS NOT. Recorded because it was
> shipped for one commit before the regression was found.** It does give 8px,
> but it is `inline-grid; grid-auto-flow: column`, so the row **cannot wrap**.
> In the `lg:col-span-4` track — 155px at a 1100px viewport — the tag was
> squeezed instead and `Complete` and `Current` both ellipsised to `Comple…`.
> A truncated status badge is worse than a tight one. Left inline, the badge
> wraps onto its own line and stays legible.
>
> Two further traps if you reach for it anyway: on the `li` itself it drops
> `display: list-item` and flows every row onto one line; and it squeezes
> whichever child can shrink, which is the component, not the text.
>
> **A wrappable inline gap needs CSS, and no Carbon utility provides one.**
> `stack-horizontal` is for a row that is allowed to be a row.

`stack-vertical` on the `<ol>` **is** safe and worth having: it is row flow so
it cannot squeeze anything, and an ordered list's numbers are a `::before`
counter rather than a list marker, so they survive `display: grid`. 4px between
rows.

*Found by looking, on the §4.6 seventh exit attempt — every gate green throughout,
including through the regression.*

### 3.11 An ordered list's numbers render outside its own box

`.rux--list--ordered` gets Carbon's `component-reset` — `margin-inline-start: 0`
— while its counter is `position: absolute; inset-inline-start: -24px`. The
numbers therefore sit **24px to the left of the list's content box, by design.**

Carbon gives that start margin to `.rux--list--unordered` only. An ordered list
is expected to sit inside something already padded; `sink/list.html` gets away
with it because `.ks-sec` supplies the room.

Placed directly at the top of a `rux--css-grid-column`, which has none, the
numbers escape into the page gutter and sit further left than every heading on
the page. Nothing is red: the markup is Carbon's own.

### 3.12 There is no responsive metric-row idiom

A four-across row of metric tiles that reflows is a shape **no template and no
sink fragment demonstrates**. The §4.6 third attempt had to reach into
`docs/carbon-react-dom.json` for `elements-grid--subgrid`. That is a sanctioned
source, but it means the templates alone cannot teach this shape — a known gap
rather than a trap, recorded here so the next person does not hunt for it.

`templates/dashboard-page.html` now carries a four-tile metric row, so the reach is no
longer forced. The row is fixed-width rather than reflowing; the responsive half of
this gap is still open.

### 3.13 Pagination silently drops half its controls below 42rem

`.rux--pagination` sets `container-type: inline-size`, and
`@container pagination (max-width: 42rem)` sets `display: none` on
`pagination__text` and on every `> .rux--form-item`. **Under 672px the page-size
select, the page-number select and both text labels vanish**, leaving the range and
two arrows. No class is wrong, nothing is red, and the page gains no scrollbar.

Measured 2026-08-31 by §4.6's eighth exit attempt, which put pagination in a
`lg:col-span-12` track beside a filter column: 783px at a 1440 viewport shows the full
bar, and **528px at 1100 shows the stripped one** — a width at which nothing else on
the page changes.

**No template can surface this.** `table-page.html` is the only page with pagination
and it sits at `col-span-100`, which is never under 672px. Put pagination in any
narrower column — beside a filter panel, in a split view, inside a modal — and check it
at your narrowest breakpoint. This is Carbon's own responsive behaviour, not a defect,
and it is exactly the kind of thing that looks finished until someone resizes.

---

## 4. Where IBM's own guidance fits

**Yes, use it — and it is already on this machine.** `carbon-website/` is
gitignored quarry: *read from, never shipped.* It carries seventeen pattern pages
under `src/pages/patterns/` (plus an overview) — empty states, forms, dialogs,
notifications, filtering, global header, login, loading, search, disabled and
read-only states — alongside accessibility and content guidelines.

It is genuinely good on the question this document exists for: composition,
anatomy and when-to-use, which the component reference cannot answer. Its empty
states pattern names a Title / Body / primary action anatomy, and
`templates/empty-state.html` already matches it, including the distinction
between large and small empty spaces.

**Two limits, both of which will bite.**

**It assumes all of Carbon.** The patterns freely reference components this
project does not compile. Read every pattern against `docs/inventory.md` before
following it; a pattern built on `page-header` is describing something that is
not here.

**Take facts and decisions, not prose.** This repository is **public**, and its
`NOTICE` covers Carbon's Apache-2.0 *code* — the compiled CSS and the icon path
data. Website guidance content is a different thing under a different licence.
Record what the guidance establishes and cite where it says it; do not paste
paragraphs across. The project already treats Carbon this way everywhere else:
it diffs against captures and cites them rather than copying documentation.

**And it is not a substitute for the captures.** For *markup*, `docs/carbon-*.json`
remains the reference — 667 stories matching the compiled version, needing no
network. `node tools/diff-fragment.mjs <name>` does it mechanically. The website
tells you what a pattern should do; the captures tell you what the markup is.

---

## 5. Verify by opening the page

**The gates cannot see everything and looking is not optional.** Five defects
this project shipped passed every gate: two chevrons rotated from the wrong base
glyph, a missing positioning wrapper, a missing styled wrapper, and four menu
specimens that were `visibility: hidden`.

Run the browser gates against **your page**, not only against the sink.
`check-a11y`, `check-runtime-classes` and `check-spacing` work on a template as
well as the sink — **there is no page argument**: they read whatever document
they are evaluated in, so you load your page and run the tool there. Fetch it
from the server rather than pasting, so the file on disk is what runs. A bug
shipped nine times in `table-page.html` because nobody did this.

One cannot be pointed at an arbitrary page: `check-rendered`, whose unit is the
`.ks-sec` section no template has — it throws rather than reporting nothing.

`check-behaviour` can be, since 2026-09-08. It scopes each case to the sink
section where that exists and to the document where it does not, and reports a
component the page does not carry as **skipped** rather than failed. Read
`passed/ran` off the sink and treat it as a diagnostic: the coverage cell
`npm run gates` requires is still the sink's.

`.claude/skills/sink-check/SKILL.md` is the procedure, and its eight conditions
each exist because getting one wrong produced a confident wrong number.

`docs/verifying-templates.md` covers the behaviour half: a template's behaviour
is verified against a **running Carbon page**, never derived from `css/rux.css`.
The stylesheet gives the mechanism and says nothing about the intent — four wrong
shell answers in one sitting came from reading it and guessing.

---

## What this does not yet cover

Stated so the gaps are visible rather than assumed filled:

- **Only the six template shapes.** A dashboard, a wizard, a settings page and a
  login are all unmodelled here. IBM has patterns for some; none has been read
  against `docs/inventory.md` yet.
- **No content or writing guidance.** `carbon-website/src/pages/guidelines/content`
  exists and has not been mined.
- **Theming is one attribute.** `data-theme` on `<html>` is `white`, `g10`,
  `g90`, `g100` or `rux`, and the shell zone keeps its own — the head comment in
  `templates/app-shell.html` says why it is g100. Every template
  links `css/rux-theme.css` and `css/rux-overrides.css` after `rux.css`, in
  that order; which change goes in which is `AGENTS.md`, "Where a change goes".
- **Nothing on responsive behaviour** except 3.2's breakpoint and 3.12's gap.
- **This document is unenforced.** No gate reads it, and it can go stale exactly
  the way the counts in README did before `check-gates` existed. Treat a claim
  here as needing the same verification as any other — the citations are so you
  can check, not so you can skip checking.
