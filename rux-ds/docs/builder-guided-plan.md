# Builder — the guided mode, stages 0 and 6 to 13 (roadmap §4.12, creator 3)

**Status, 2026-09-06: approved plan, revision 2; stages 0 and 6 to 12 have
landed and three growth batches with them; 13 has not started.** Stage 12
waited on the map being read (rux's ruling, 2026-09-06, morning) and landed
the same day once it was. This line read "6 to 9" for a day after 10 and 11
landed, the table below being right the whole time; corrected 2026-09-06.
Saved as the select-and-edit and add-and-move plans were, so a different clone
can pick it up. Each stage below is its own proposal in the open and lands in
its own commit; when a stage lands, its roadmap entry in §4.12 is the record
and the matching section here is trimmed to a pointer. Delete this file when
the last stage is folded — it is a plan, not a decision record.

## Context

rux wants a friendly, finished way to build a page and its content on rux-ds,
with clear access to the supported options: start from nothing, pick the
page's purpose, be walked through it one section at a time with defaults and
reasons, edit the content as you go, review, and take the result away. Stages
1 to 5 give the machinery: markers, slots, the byte-exact round trip,
select-and-edit, instance identity, the page model. Revision 1 put the guide
on a page of its own and left content editing in the builder; rux's review
asked for one continuous session, content in the walkthrough, suggestions
that know the page, a defined export, defined coverage, undo semantics
settled first, and the verification debt paid before it is relied on.

**Product flow:** choose purpose → configure sections and content → add
relevant sections → review appearance and behaviour → export. One page,
`builder.html`, with a guided mode and a free mode sharing one draft, one
model and one content editor. A visible preview throughout, a navigable
section outline, "keep recommended settings" per step, explanations that
expand when wanted, provenance and gate vocabulary in secondary details.

## What the repository settles (measured 2026-09-05)

- **Purpose picks the template.** The ten shapes carry a "use it when" line;
  `app-shell` is the blank one. A template's slot containers were attested
  for its job — table-page's body has no stack so pagination sits flush — so
  the purpose has to choose the frame, not only the suggestions.
- **A `follows` run is one unit in the model** and stays so: removing
  pagination removes its table. The guide walks "Data table with pagination"
  as one section with two configurable parts, and does not suggest pagination
  where the template already supplies it.
- **Content shapes**, from `textFieldsOf`: the form block has 18 text leaves
  (4 labels, 2 legends, 3 options, 2 buttons, helper texts); the table block
  15 (h1, h2, p, 6 cells, a label, 3 spans). The form has 7 form items and one
  button set; the table block 4 buttons, one icon-only, and 4 body rows; one
  block carries a real link target. "Text 1 of 18" is not a content control.
- **Swappable variants with attested spellings**: button size (`rux--btn--xs
  rux--layout--size-xs`, sm, md; `rux--layout--size-lg`; `--size-xl`; every
  template button is bare, also lg) and table density (`rux--data-table--xs`
  to `xl`). Icon-only buttons and `<a class="rux--btn">` are excluded.
  `docs/choices.md` has button sizes with guidance and no data-table
  section; stage 9 writes one.
- **Field style is not a swap**: fluid controls have different markup and no
  fluid form is captured. Deferred.
- **Export today is a page, not a project.** `exportPage` writes paths into
  `/rux-ds/`, `brand/`, `rux-theme.css` and `rux-overrides.css` (roadmap §8.4,
  done 2026-09-10 — it wrote `vendor/rux-ds/` before), which
  `tools/new-project.sh` creates. `bodyOnly` returns the whole `<main>`, so
  it replaces a page's main region. A zip is out: no third-party libraries.
- **Attested chrome exists** for the guided mode: a progress indicator
  (three specimens), a contained list with clickable items, an accordion,
  and the controls the builder already clones.
- **`check-blocks` cannot judge whether a marked region is the right one**,
  by its own words. Catalogue growth needs a visual pass per block.
- **The builder's three cells do not age on `builder/`.** Stage 0.

## Sequence

| stage | what | tier-2 files | needs |
|---|---|---|---|
| 0 | **DONE 2026-09-05.** Registry: `pageInputs` so `builder/` ages the three `builder.html` cells; the six literal `fileTargets`. | `gates.mjs` | — |
| 6 | **DONE 2026-09-05.** Undo, redo, and a versioned draft that survives reload. | `build-builder.mjs` | 0 |
| 7 | **DONE 2026-09-05.** Export and parity: download, copy `<main>`, the two delivery paths, `check-parity`. | `build-builder.mjs`, `check-parity.mjs`, `gates.mjs` | 6 |
| 8 | **DONE 2026-09-05.** Content editing that reads as content: labels from context, grouping, link targets, per-field reset. | `rewrites.mjs` | 6 |
| 9 | **DONE 2026-09-05.** Variant edits: button size per group, table density, "as attested" default; the data-table section in `choices.md`. | `rewrites.mjs`, `build-builder.mjs` | 6, 8 |
| 10 | **DONE 2026-09-05.** Manifest depth (`frameDeps`), a whole-manifest comparison, and the generated coverage table. NO catalogue growth — rux's call: build the measurement first, pick from it after. | `build-blocks.mjs`, `check-blocks.mjs`, `lib/coverage.mjs`, `gates.mjs`, CI | 0 |
| 11 | **DONE 2026-09-05.** The guide map `builder/guide.json`, and placement evidence derived rather than claimed: the catalogue splits by recorded layout, the rest behind a disclosure. Drafted throughout, nothing reviewed. | `lib/blocks.mjs`, `check-blocks.mjs`, `lib/gates.mjs`, `build-builder.mjs`, `rewrites.mjs`, `placement.mjs` | 9, 10 |
| 12 | **DONE 2026-09-06**, after the map was read the same morning. Guided mode in `builder.html`: stepper, outline, five steps, acceptance criteria. | `build-builder.mjs` | 7, 8, 9, 11, and the map read |
| 13 | Repeated items: duplicate, remove, reorder a repeated sibling, ids re-suffixed. v2. | `rewrites.mjs` | 12 |
| growth | **BATCH ONE DONE 2026-09-05.** Nine sink blocks picked from the coverage table: tabs, progress-indicator, content-switcher, list, code-snippet, card, action-set, checkbox, search. Two of the eleven asked for were dropped on measured grounds. | — | 10 |
| growth | **BATCH TWO DONE 2026-09-06.** Four more: radio, pagination-nav, options-tile, big-number. Catalogue 46. The ten single form controls are ruled out as ONE decision — blocks cannot nest, so a lone field would sit outside any form; a fieldset is the exception. | — | 10 |
| growth | **BATCH THREE DONE 2026-09-06.** Five second specimens — ordered list, expressive card, clickable tile, single-line snippet, vertical stepper. Catalogue 51. AND the measurement finished: all 47 unmarked fragments now carry a reason, 37 keyed and validated plus the ten form controls as one decision. | — | 10 |

## Stage notes

**0, registry.** `pageInputs: { 'builder.html': ['builder'] }` on the three
browser gates, so a change to `builder.js`, `page.mjs` or `rewrites.mjs`
stales the builder cells as it should have since stage 3 (0475e3f moved a
reading and nothing aged). The `fileTargets` drift stage 2 left open. Both
proposed with what they weaken: nothing, they only age more.

**6, undo. Landed 2026-09-05; this note is corrected rather than deleted,
because what it said was wrong in two ways and the roadmap entry now carries
the record.** It said a history PER TEMPLATE: that was rejected in review,
because `answers` — theme, prefix, name, title, file — are global, so a
per-template history would duplicate them or drop them, and undoing a theme
change would depend on which template happened to be selected. One
session-wide history shipped instead, over `{ pages, edits, answers }`, with
the acting template on the ENTRY so undo and redo both reveal where the
change happened. And it said a draft naming a missing block "drops that
entry and says so": that was also rejected. A draft is validated whole
against the manifest — templates, slots, keys, instance numbers, allocation
counters, follower relations, and a hash of every block an edit was made
against — and is left UNOPENED when any of it fails, never partly applied
and never deleted. Two failures found in review forced that: an orphaned
follower makes `unitOf` throw, and a field index silently retargets when a
block's markup changes.

**7, export and parity. Landed 2026-09-05 (`ce27ceb`); roadmap §4.12 is the
record.** Two corrections to what this note said. It said `check-parity` "runs
the script" into a scratch directory: the whole script refuses a dirty tree and
unpushed commits, so a gate that ran it would fail on every uncommitted change;
it EXTRACTS the page-writing region and runs those bytes instead, and rux chose
that over the two alternatives. And the note assumed byte parity was the whole
contract — it is not, because neither side escapes the answers, so the gate
names that limit and the builder warns. The gate found a real divergence on its
first run; §4.12 has it.

**8, content. Landed 2026-09-05 (`30e91fb`); roadmap §4.12 is the record.**
Two corrections to what this note said. The context it describes — "the nearest
enclosing form item, table row, list item or button set" — is not enough on its
own: ancestors need STABLE IDENTITIES, because tags and classes cannot tell two
structurally identical form items apart, so the chain carries content offsets.
And it treated link targets as a free addition; they are not, because a link
edit and instancing DO NOT COMMUTE, which rux found in review and which made the
order the contract of the stage. The panel's wording also moved: "Label: Email"
became a group headed "Email" holding a row called "Label".

**9, variants. Landed 2026-09-05 (`2757625`); roadmap §4.12 is the record.**
One correction to what this note said. "Order: text, variants, instance; all
three commute" is not the contract — rux's review found that a group keyed by
offset breaks the moment an earlier edit changes length, measured at 7255 to
7289. Variants are keyed by ORDINAL, as edits and links already are, and run
FIRST. The note also said groups are "named by context"; the module reports
structure and the panel supplies the words, the split stage 8 established.

**10, manifest and catalogue. Landed 2026-09-05; roadmap §4.12 is the
record.** Three corrections to what this note said. It keyed the table BY
COMPONENT: there is no usable component-to-fragment mapping — `sink/fluid.html`
demos 13 components, `form` owns no fragment at all, and `spacing` and `grid`
are foundations with no component row — so the row key is the FRAGMENT and
components are resolved into it by `owner()`. It put a hand-kept "deferred, and
why" COLUMN inside a generated table, which cannot survive a rebuild; the
eligibility notes live outside the markers as a keyed list instead, the
arrangement `build-readme.mjs` uses on README, and `check-blocks` faults a note
naming a fragment that is gone, already marked, or named twice. And it planned
GROWTH this stage: rux's call was to build the measurement first and pick from
it after, so the catalogue stays at 33. What was added beyond the note: a
whole-manifest comparison, because a hand-edited `deps`, a rewritten `label`
and a DELETED template record each passed the old gate with 0 faults.

**11, the map. Landed 2026-09-05; roadmap §4.12 is the record.** Three
corrections to what this note said. It listed `requiresFrame` as a field of the
map: it is DERIVED from stage 10's `frameDeps` and is never written down —
exactly one block has any, and the builder now warns before the add rather than
after. It described `slot` as a field alongside the others without saying which
side of the line it falls on; rux's review settled that, and it is the right
side: a container comparison is evidence ABOUT a proposed placement and cannot
decide which slot rux recommends, so `slot` stays hand-written while the
evidence for it is derived. And it said the wider catalogue stays offered under
"not reviewed here: inspect the preview" — the label is wrong, because the split
is not about review at all. It is "seen in the same recorded layout" against "no
matching recorded layout", and a matching layout is not an attested placement:
only a block in its own slot is. What was added beyond the note: `containerOf`
was a regex lookup that never processed a closing tag, so a CLOSED column above
a slot was reported as its container.

**12, guided mode. Landed 2026-09-06; roadmap §4.12 is the record.** It
waited half a day on the map being read, and the design this note carried
went in as reviewed with three things the browser corrected: a `<section>`
does not honour `hidden` under Carbon's reset, so `.bld-step[hidden]` is
written; the Keep button had to re-read its store after a variant change;
and a reload opened the draft on whichever template came first rather than
the one being edited, so the view key carries the template too.

**13, repeated items.** A sibling sharing tag and class with a neighbour can
be duplicated, removed down to one, or reordered, its ids and in-block
references re-suffixed with the stage-4 walker. Columns, tabs and fields of
another type are deferred with reasons in the coverage table.

## Not in v1, and rux's decisions

Fluid fields, notification kind, button kind per button, columns, tabs,
field types: deferred with reasons. Shell toggles: the choices-table
contradiction from stage 2 goes to rux first. Charts: none, by rule. The
map's prose and every "reviewed" record are rux's. Whether stage 13 is
wanted, or repeated content is better served by more captured compositions.
