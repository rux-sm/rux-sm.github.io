# Choices a project makes

The user-facing list of what can be picked when a page is started, where
each option comes from, and which layer offers it. **Every option here is
attested**: a template or a sink fragment renders it, diffed against a Carbon
capture. Nothing is offered that the gates would refuse. Counts come from
`templates/` and `sink/` on 2026-09-02; when they move, this page is wrong
before the code is.

Three layers offer them, cheapest first:

| Layer | Offers | Status |
|---|---|---|
| **Script** `tools/new-project.sh` | what a text substitution on a template can do: shape, theme, grid width, name, title, file | Retired 2026-09-12 with the consolidation; the builder's download is the page an app starts from |
| **Skill** `rux-ds-page` | composition: which shell parts, which fields, which buttons, which blocks; then the gates | Done 2026-09-02, its §2 |
| **Builder** `builder.html`, here | a page builder: a template, its answers, marked blocks from `sink/` and `templates/`, a live preview, the HTML to take away | Done 2026-09-06 — a guided mode (purpose, sections and content, add sections, review, take it away) and a free mode on one draft; every marked block added, moved or removed; text, links, sizes and densities edited in place; undo, a draft that survives a reload (roadmap §4.12 item 3); its export was held to `new-project.sh` by `check-parity` until both retired 2026-09-12 |

## Page shape — pick one

Each is a complete page with the shell. Start from the one nearest the job;
the second column is the suggestion.

| Template | Use it when |
|---|---|
| `app-shell` | nav and header, nothing else yet |
| `dashboard-page` | a few numbers and a table, read more than edited |
| `table-page` | a list of records: sort, select, page |
| `form-page` | create or edit one record |
| `detail-page` | read one record, with actions |
| `document-page` | read one record top to bottom, in order |
| `search-results-page` | a query, facets that narrow it, and what came back |
| `settings-page` | grouped controls that save |
| `wizard-page` | one step of a multi-step flow |
| `schedule-page` | dates and times |
| `empty-state` | nothing to show yet |
| `error-state` | something failed |

## UI shell — one, with parts

Carbon ships one shell and rux-ds carries one attested build of it: a dark
header with the product name, header nav links, global actions, two
right-hand header panels — **the switcher** and, since 2026-09-02, **the
account panel** — and a left side nav, expanded, fixed. Two things are
choices and four are not:

- **Header nav links**: present or absent.
- **Global actions and the switcher panel**: present or absent. Two actions
  ship, in Carbon's prescribed order: the switcher, where an ecosystem lists
  its apps, and the account. Notifications and help are NOT among them
  (2026-09-03) — an icon-only button with no handler is an affordance that
  lies. Add one in a product when it does something.
- Side nav: only the expanded, fixed variant is captured. No rail, no
  collapsed-by-default; ask before offering one.
- The account panel: every app has one (roadmap §4.13). It holds the profile
  — a display name and the theme — saved in the browser under one key every
  app on the origin shares, so a choice made in one app is the choice in all.
  `js/theme.js` applies it before first paint, `js/profile.js` keeps it.
- The shell's theme: the header is `g100` by Carbon's own guidance and stays
  so whatever the page is.
- The mark: it is the brand, not a choice.

## Theme — five, all offered, one the default

`white`, `g10`, `g90`, `g100` from Carbon, and `rux`, the block in
`css/rux-theme.css`, vendored so it is the same theme in every app. Every
page offers all five in its account panel and a visitor's choice wins; what
a project chooses is the DEFAULT, on `<html>`. Suggestion: `white` or `g10`
for a page read at length, `g10` when cards should stand off the page, `g90`
or `g100` for a dark tool.

## Grid width — capped or full

Carbon's grid caps content at 99rem (1584px) and centres it: a reading
width, right for prose and forms, and the default on every template. Its
own `--full-width` modifier lifts the cap, and is the choice for a page that
is scanned rather than read — a board, a wide table. Attested by
`elements-grid--full-width` and `sink/grid.html`; measured on the scheduler
at 2000px, 2026-09-06, where the cap left about 200px dead each side while
the board scrolled for want of room. Below 99rem the two are identical.
Suggestion: `capped` unless the page's main thing is wider than a paragraph.
One class on the page's outer grid, so a project can flip it by hand later;
`--grid full` in the script and Grid width in the builder set it at the
start.

## Fields — regular or fluid

Six controls exist in both styles: text input, text area, select, number
input, search, date picker. Fluid packs the label inside the field's box so
a dense form aligns; regular keeps the label above and is what every other
control matches. Suggestion: regular unless the whole form is fluid, since
Carbon does not mix them in one group. Checkbox, radio, toggle and the
list-box family have no fluid form.

## Buttons — kinds, sizes, states

- **Kinds**, seven: primary, secondary, tertiary, ghost, danger, danger
  tertiary, danger ghost. Suggestion: one primary per view, secondary beside
  it, ghost for the quiet action, danger only for the destructive one.
- **Sizes**, five: `xs` `sm` `md` `lg` `xl`, and `lg` is the default with no
  size class. What the corpus attests: every template button is bare, `lg`,
  the one toolbar (`table-page`) included. Carbon's own guidance, unattested
  here, is `sm` inside tables and toolbars and `xl` only for a hero action;
  this line said so as a suggestion until 2026-09-06, when stage 9's finding
  that nothing here attests it was ruled on. `expressive` is a type-scale
  variant, not a size.
- **States**: disabled, loading, selected. They are states the page sets,
  not choices made at creation.

## Data tables — five row densities

- **Densities**, five: `xs` `sm` `md` `lg` `xl`, written as
  `rux--data-table--<size>` on the `<table>` itself, never on a wrapper. All
  five are attested in Carbon's captures and demoed in `sink/table.html`.
  `lg` is the default twice over — it is what every table in this repository
  uses, and `.rux--data-table tr` is already 3rem without any density class.
  Suggestion: `lg` for a table people read a row at a time, `sm` or `xs` when
  the point is to see many rows at once; `xl` only where a row holds two lines.
- **A row will not shrink below what it holds**, measured 2026-09-05: on a
  table with a selection column the checkbox floors every row at 41px, so `xs`
  and `sm` look identical there. Without one, the rendered heights follow the
  token — 29, 38, 40, 48 and 64px for the five. Pick density for a table you
  have looked at, not from the ladder alone.
- **The toolbar does not shrink with the table.** Carbon pairs a small table
  with `cds--table-toolbar--sm`, and that class is not compiled here, so a
  toolbar stays its own size whatever the rows do.

## Content blocks — 68 fragments by name, 33 marked as blocks

Anything in `sink/` can be dropped into a page body; the kitchen sink is the
catalogue and `sink/ORDER` the index. The skill offers all 68 by name; the
script does not. The builder offers only what carries a `BLOCK:BEGIN` marker
— one attested specimen per marked fragment, plus every REPLACE region of a
template's `<main>` — because a fragment dropped in whole brings `ks-`
wrappers that `css/rux.css` does not style and specimens a page does not
want. `builder/blocks.json` is the list, and `tools/check-blocks.mjs` keeps it
a verbatim copy of its sources.

## Where a block may go — evidence, not permission

*Drafted 2026-09-05 by the stage-11 pass. Every figure is measured; the
judgement in the last paragraph is rux's to make.*

**Nothing refuses a block.** The builder offers all 33 in every slot, which is
`builder/page.mjs`'s standing decision and is not reopened here. What stage 11
added is a **sort and a label**, so the reader can tell one kind of choice from
another.

| | |
|---|---|
| **An attested placement** | a block in **its own source slot**. `templates/detail-page/metric-row` in `detail-page/body`, and nowhere else, ever. |
| **The same recorded layout** | a slot whose enclosing grid, grid column and stack classes are identical to the ones the block was marked in. **Evidence about a placement, never a verdict on one.** |

Of the 33 blocks, **16 have a layout matching more than one slot, 8 match
exactly one, and 9 match none** — those nine are every `sink/` block, because a
sink fragment has no grid ancestry to record. The twelve slots reduce to
**seven distinct layouts**.

**Why the grid is in the signature, which is the worked example.**
`form-page` opens `<div class="rux--css-grid">` and `wizard-page` opens
`<div class="rux--css-grid rux--css-grid--with-row-gap">`, which
`templates/wizard-page.html` calls *load-bearing and only below `lg`*. Their
columns and stacks are byte-identical. Comparing only those two would have
reported **15 block-and-slot pairs as matching that do not**, all of them
between the wizard's panel and the three form bodies.

**What the comparison cannot see, and why a reading still governs.** Layer,
siblings, what sits above in the same stack, the frame, the theme — and every
one of the thirteen hazards in `docs/composing-pages.md`. §3.1 is the standing
proof: a `rux--tile` inside `layer-two` is invisible on a plain page, measured
`rgb(255,255,255)` on `rgb(255,255,255)`, and no class signature sees it. §3.10
is the general rule — an unattested composition inherits no spacing, there may
be no fix, and no gate reads it.

So a matching layout means the repository has *seen* an arrangement like this
one. It does not mean this one works. That is what `builder/guide.json`'s
`reviewed` field is for, and **at the commit this landed every entry in it is
`false`**.
