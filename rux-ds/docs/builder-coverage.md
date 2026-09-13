# Builder coverage — what the catalogue holds, and what it does not

The page builder offers a catalogue of **blocks**: regions marked in `sink/` and
`templates/` that can stand as a direct child of a page's stack. This page says
which of the sink's fragments are in it and which are not, so growing the
catalogue is a choice made from numbers rather than from memory.

**Only the table is generated.** `tools/build-blocks.mjs` rewrites what sits
between `COVERAGE:BEGIN` and `COVERAGE:END` on every `npm run blocks`, and
touches nothing else on this page — the arrangement `tools/build-readme.mjs`
already uses on README, and for the same reason: the table is current state, and
the eligibility notes beside it are decisions. `tools/check-blocks.mjs` fails if
the table has drifted or if a note below names a fragment that does not exist.

**A candidate region** is an element carrying a `rux--` class none of whose
ancestors carries one. It is an upper bound on what could be marked, not a
forecast of blocks: the rule that governs marking is roadmap §4.12's, "a region
that can stand as a direct child of a page's stack", and most candidates will
not meet it.

**`text` and `variants` are counted per marked block**, so an unmarked fragment
shows `—` rather than a number computed over a whole demo catalogue, which would
mean nothing.

## Eligibility — decided, and why

One line per fragment that will NOT be marked, with the reason. Every other
unmarked fragment is an open candidate: nobody has ruled on it yet. These are
decisions and are kept by hand; the three below quote the fragments' own source
rather than adding a judgement.

**Ruled 2026-09-06, batch three, finishing the measurement.** The reasoning is
stated once per group; the fragments in a group share it. Only the last group is
a judgement rather than a rule, and it says so.

*Foundations — no component to mark, as `spacing` already is:*

- `grid` — a layout primitive. It has no component of its own to stand in a page.
- `stack` — the same; `stack-vertical` is what a SLOT carries, not a block.
- `aspect-ratio` — a ratio applied to something else.
- `scroll-gradient` — an affordance painted over a scrolling region.

*Frame, not a stack child, as `modal` already is:*

- `dialog` — sits outside the page body, like the modal `wizard-page` keeps at
  the end of `<main>`.
- `side-panel` — frame, and the shell owns it.
- `ui-shell` — the frame itself; `templates/` is where a shell is chosen.

*Attached to a trigger — the overlay has no meaning without the control that
opens it, and the control is not the block:*

- `menu` — opened by a trigger elsewhere.
- `menu-button` — the trigger and its menu, but the menu is positioned against it.
- `overflow-menu` — the same, inside a row or a toolbar.
- `combo-button` — a button whose secondary actions live in an overlay.
- `popover` — positioned against whatever opened it.
- `tooltip` — the same, and never free-standing.
- `toggletip` — the same.
- `copy-button` — an affordance on a snippet or a field; `code-snippet` carries
  its own.
- `chat-button` — a launcher, positioned by the app.
- `ai-label` — an inline mark on a field or a container, with its own popover.

*Inline — sits inside text or a control, as `badge-indicator` already does:*

- `tags` — a tag labels something; it is not a region.
- `links` — a link is inside a sentence.
- `icon-indicator` — an inline status mark.
- `shape-indicator` — the same.
- `user-avatar` — inline beside a name.

*Form controls — batch two's decision, that blocks cannot nest:*

- `slider` — a field; `templates/form-page/form` is what a page wanting fields
  carries.
- `edit-in-place` — a field that swaps into an input.

*One thing that is not one thing:*

- `fluid` — demonstrates the fluid field style across thirteen components. There
  is no `fluid` to mark, only fluid versions of other fragments.
- `buttons` — the button-row shape ships as `action-set`, which is what a page
  actually carries at the end of a region.

*A JUDGEMENT, NOT A RULE, AND REOPENABLE.* rux declined these in batch two's
scope question; the reason is recorded so the decision is visible rather than
implied, and these three are the only ones here that a later reading could
reverse without changing a rule:

- `inline-loading` — a status line rather than a region.
- `loading` — an overlay spinner, nearer frame than stack child.
- `skeleton` — a placeholder FOR a region rather than a region. Marking it would
  mean shipping the loading state of a block beside the block.

*And one specimen that cannot be taken from a fragment that is marked:*

**`tabs` is already marked** at its default specimen, which spans the tablist
and its four panels — so this is not an eligibility key, and the gate would fault
one. **Its three CONTAINED specimens cannot be marked** — lines 151, 219
  and 241 each carry `role="tablist"` with `role="tab"` buttons and **zero
  `aria-controls` and zero `rux--tab-content`**. They demonstrate the contained
  styling, not a wired tab set, and `check-blocks` passes them precisely because
  there is no reference to leak. All three are named so the next batch does not
  try the other two.

- `spacing` — a foundation, not a component. Its own comment: "A FOUNDATION, NOT
  A COMPONENT." It carries zero `rux--` elements.
- `badge-indicator` — its own comment: "A badge is not a free-standing box." It
  renders as the last child of an icon-only button, which is what gives the
  absolutely-positioned badge its containing block.
- `pagination` — **one attribute away, and it is demo spacing rather than
  attested markup.** Its DEFAULT specimen carries
  `style="margin-block-end:2rem"` (`sink/pagination.html:59`), and sink blocks
  forbid inline `style=`. The only mechanically clean region is the second one,
  which the fragment's own comment says exists to demonstrate the
  **unknown-total-items** distinction — marking it would put a deliberately
  non-default pagination in the catalogue under the plain name. Unlike
  `progress-bar` and `treeview`, that margin expresses nothing about the
  component: it separates two specimens. Deleting it would unblock this, and
  that is a sink edit rux has not been asked for. `templates/table-page/pagination`
  serves the shape meanwhile.
- **The ten single form controls** — `select`, `textarea`, `number`,
  `text-input`, `date-picker`, `time-picker`, `dropdown`, `combo-box`,
  `multiselect`, `toggle` — **one decision, not ten. Blocks cannot nest.**
  `add()` in `builder/page.mjs` appends to a slot and nothing else, so every
  block is a direct child of a page's stack: a lone `select` would land beside
  the page title with no form around it, and `templates/form-page/form` carries
  a real `<form>` for pages that want fields. A FIELDSET is the exception and is
  why `checkbox` and `radio` are marked — a labelled group of related choices is
  a thing a page holds, and Carbon renders it as `<fieldset>` with its own
  `<legend>`. Revisit this if the builder ever nests.
- `treeview` — **cannot be a sink block at all, and the reason is a measured
  rule rather than a preference.** Both its regions carry inline
  `style="padding-inline-start:…;margin-inline-start:-…"` on
  `.rux--tree-node__label`: that is how Carbon renders per-depth indentation, so
  it is attested page markup — but `check-blocks` forbids inline `style=` inside
  a SINK block, and only templates are exempt. Marking it would mean either
  editing attested markup or weakening the rule.
- `progress-bar` — the same trap, one step further. A determinate bar expresses
  its value with `style="transform:scaleX(0.42)"` on `.rux--progress-bar__bar`,
  so the plain form is unmarkable. What is left is `--indeterminate` (which also
  carries `--small`), `--finished` and `--error` — a state and a size, not the
  component. Offering one of those as "Progress bar" would name a general thing
  and hand over a particular one.
- `file-uploader` — **the sink ships no empty uploader.** Its first specimen
  carries two file rows, one of them rejected with "File exceeds 500 KB"; its
  second is disabled AND invalid. A block is copied byte for byte, so a reader
  adding "File uploader" would get one mid-error and could not edit the state
  away. Carving the drop zone out was tried and abandoned: the file rows are
  siblings INSIDE `.rux--form-item`, so an end marker before them leaves the
  block's own `<div>` unclosed — and `check-blocks` passed that unbalanced block
  with 0 faults, which is a gate hole recorded in the roadmap. Marking this one
  needs an empty specimen in the fragment first.
- `modal` — frame, not a stack child. `templates/wizard-page.html`
  keeps its modal at the end of `<main>`, deliberately outside every block, and
  its Cancel button's `data-rux-open` is the catalogue's only frame dependency.

  *(Batch one wrote this as ``- `modal`, `dialog` —``, which the gate's key
  pattern never parsed: a comma after the first backticked name ends the match.
  So `modal` looked ruled and was not. Split 2026-09-06; `dialog` has its own
  line above.)*
- `list-box` — its own comment: it is "the primitive under dropdown, combo box
  and multiselect" and "has no story of its own: every reference for it is one
  of those three."

<!-- COVERAGE:BEGIN -->
_68 shipped fragments · 21 marked, holding 27 of the catalogue's 63 blocks · 276 candidate regions in the 47 unmarked._

| fragment | components | blocks | candidates | text | variants | behaviour | in the builder |
|---|---|---|---|---|---|---|---|
| `accordion` | accordion | 1 | 1 | 6 | 0 | accordion | yes |
| `action-set` | action-set, button | 1 | 7 | 2 | 1 | — | yes |
| `ai-label` | ai-label, button, link, popover, toggletip | — | 7 | — | — | copy-button, popover | no |
| `aspect-ratio` | aspect-ratio | — | 5 | — | — | — | no |
| `badge-indicator` | badge-indicator, button | — | 2 | — | — | — | no |
| `big-number` | big-number | 1 | 1 | 2 | 0 | — | yes |
| `breadcrumb` | breadcrumb, link | 1 | 3 | 3 | 0 | — | yes |
| `buttons` | button, inline-loading, loading | — | 18 | — | — | — | no |
| `card` | button, card | 2 | 11 | 8 | 1 | — | yes |
| `chat-button` | button, chat-button | — | 4 | — | — | — | no |
| `checkbox` | checkbox, form | 1 | 5 | 6 | 0 | — | yes |
| `code-snippet` | button, code-snippet, copy-button | 2 | 4 | 4 | 1 | copy-button | yes |
| `combo-box` | combo-box, list-box, text-input | — | 2 | — | — | form-controls, list-box | no |
| `combo-button` | button, combo-button, menu | — | 4 | — | — | menu | no |
| `contained-list` | button, contained-list | 1 | 2 | 5 | 1 | — | yes |
| `content-switcher` | button, content-switcher | 1 | 3 | 3 | 0 | — | yes |
| `copy-button` | button, copy-button, popover, tooltip | — | 2 | — | — | copy-button, popover | no |
| `date-picker` | button, date-picker, form | — | 9 | — | — | date-picker | no |
| `dialog` | button, dialog | — | 2 | — | — | — | no |
| `dropdown` | dropdown, form, list-box | — | 8 | — | — | form-controls, list-box | no |
| `edit-in-place` | EditInPlace, button, popover, text-input, tooltip | — | 3 | — | — | copy-button, form-controls, list-box, popover | no |
| `file-uploader` | file-uploader, form, popover, tooltip | — | 2 | — | — | copy-button, popover | no |
| `fluid` | checkbox, combo-box, date-picker, dropdown, form, list-box, multiselect, number-input, search, select, text-area, text-input, time-picker | — | 18 | — | — | date-picker, form-controls, list-box | no |
| `full-page-error` | FullPageError, link | 1 | 1 | 3 | 0 | — | yes |
| `grid` | — | — | 5 | — | — | — | no |
| `icon-indicator` | icon-indicator | — | 16 | — | — | — | no |
| `inline-loading` | inline-loading, loading | — | 3 | — | — | — | no |
| `links` | link | — | 7 | — | — | — | no |
| `list` | list | 2 | 3 | 5 | 0 | — | yes |
| `list-box` | list-box | — | 2 | — | — | form-controls, list-box | no |
| `loading` | loading | — | 2 | — | — | — | no |
| `menu` | button, menu | — | 6 | — | — | menu | no |
| `menu-button` | button, menu-button | — | 2 | — | — | — | no |
| `modal` | button, data-table, modal | — | 12 | — | — | data-table, menu, modal, overlay | no |
| `multiselect` | checkbox, combo-box, form, list-box, multiselect, tag, text-input | — | 3 | — | — | dismiss, form-controls, list-box | no |
| `notification` | button, notification | 1 | 15 | 2 | 0 | dismiss | yes |
| `number` | form, number-input | — | 4 | — | — | form-controls | no |
| `options-tile` | OptionsTile, toggle | 1 | 2 | 3 | 0 | form-controls | yes |
| `overflow-menu` | overflow-menu | — | 2 | — | — | menu | no |
| `pagination` | form, pagination, select | — | 2 | — | — | form-controls | no |
| `pagination-nav` | button, pagination-nav | 1 | 2 | 11 | 0 | — | yes |
| `popover` | button, popover | — | 7 | — | — | copy-button, popover | no |
| `progress-bar` | progress-bar | — | 4 | — | — | — | no |
| `progress-indicator` | progress-indicator | 2 | 3 | 8 | 0 | — | yes |
| `radio` | form, radio-button | 1 | 5 | 4 | 0 | profile | yes |
| `scroll-gradient` | scroll-gradient | — | 1 | — | — | scroll-gradient | no |
| `search` | search | 1 | 3 | 1 | 0 | form-controls | yes |
| `select` | form, select | — | 5 | — | — | form-controls | no |
| `shape-indicator` | shape-indicator | — | 13 | — | — | — | no |
| `side-panel` | action-set, ai-label, button, popover, side-panel, toggletip, tooltip | — | 1 | — | — | copy-button, popover | no |
| `skeleton` | breadcrumb, button, link, skeleton-styles | — | 13 | — | — | — | no |
| `slider` | form, slider, text-input | — | 5 | — | — | list-box | no |
| `spacing` | — | — | 0 | — | — | — | no |
| `stack` | button, stack, tile | — | 3 | — | — | tile | no |
| `structured-list` | structured-list | 2 | 2 | 12 | 0 | form-controls | yes |
| `table` | button, checkbox, data-table, overflow-menu, radio-button, search, tag | 1 | 6 | 9 | 1 | data-table, dismiss, form-controls, menu, overlay, profile | yes |
| `tabs` | popover, tabs, tooltip | 1 | 11 | 8 | 0 | copy-button, popover, tabs | yes |
| `tags` | tag | — | 20 | — | — | dismiss | no |
| `text-input` | button, form, popover, text-input, toggle, tooltip | — | 10 | — | — | copy-button, form-controls, list-box, popover | no |
| `textarea` | form, text-area | — | 5 | — | — | — | no |
| `tile` | button, link, stack, tile | 2 | 9 | 2 | 0 | tile | yes |
| `time-picker` | checkbox, form, select, text-input, time-picker | — | 4 | — | — | form-controls, list-box | no |
| `toggle` | toggle | — | 7 | — | — | form-controls | no |
| `toggletip` | dropdown, link, list-box, popover, toggletip | — | 2 | — | — | copy-button, form-controls, list-box, popover | no |
| `tooltip` | button, popover, tooltip | — | 3 | — | — | copy-button, popover | no |
| `treeview` | treeview | — | 2 | — | — | — | no |
| `ui-shell` | button, form, radio-button, stack, text-input, ui-shell | — | 3 | — | — | list-box, profile, ui-shell | no |
| `user-avatar` | user-avatar | — | 16 | — | — | — | no |
<!-- COVERAGE:END -->
