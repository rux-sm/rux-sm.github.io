# Screen-reader pass

`tools/check-a11y.js` reads attributes. This pass reads what a person hears, and nothing
automated substitutes for it. Tab order, arrow keys inside composites and focus rings
are checked separately; this pass is about what is announced.

Three controls are still to be heard: **toggle**, **modal** and **popover**. Do not
rush, and write down what was actually said — the wording is the result. A blank row is
not a pass.

## Setup

1. From the repository root, `npm run serve`, then open
   <http://localhost:8640/rux-ds/kitchen-sink.html> in **Safari**. VoiceOver and Safari
   are the pairing Apple tests; Chrome produces findings that are Chrome's.
2. Start VoiceOver with **⌘F5**. Turn it off the same way.
3. Click the page once, so the window has real focus.

The sections are `#toggle`, `#modal` and `#popover`.

|                      |                                                       |
|----------------------|-------------------------------------------------------|
| `VO`                 | Control + Option, held together                       |
| `VO` + A             | read continuously from here                           |
| `VO` + → / ←         | move through everything, including text               |
| Tab / Shift-Tab      | move between focusable controls only                  |
| `VO` + Space         | activate the thing VoiceOver is on                    |
| `VO` + U             | rotor — headings, links, form controls; Escape closes |
| `VO` + Shift + ↓ / ↑ | step into / out of a group (tables, toolbars)         |
| Control              | stop it talking, without turning it off               |

## What a pass sounds like

Three things per control, and a missing one is a finding: **role**, **name** and
**state**. "Submit, button" is a pass. "Button" alone is not — it has no name.

State must be announced when it **changes**, not only on first landing. A control that
says its state on arrival and stays silent when you change it has failed, even when the
attribute is correct. That is the gap `check-a11y` cannot see.

## The three checks

| Section | Do this   | Should hear                                              | Heard |
|---------|-----------|----------------------------------------------------------|-------|
| toggle  | Tab, Space | the name once, "switch" not "checkbox", and the new state on each flip |       |
| modal   | Open it   | "dialog" and the title on open; focus inside; page behind silent |       |
| popover | Open it   | content read on open, not before                         |       |

**Toggle.** All six toggles are `role="switch"`. Their `toggle__text` span is
`aria-hidden`, which is what stops the name being read twice. If you hear "On On, on,
switch", check that attribute in `sink/toggle.html`.

**Modal.** The page behind must go silent. If `VO`+→ moves out of the dialog into the
sink's sections, `aria-hidden` or `inert` is not doing its job. That is a real finding.

## What is not a bug

- **Six specimens have no trigger and no tab stop**, because they demonstrate CSS: four
  `menu` density demos, `overflow-menu`'s open options list and `list-box`'s expanded
  menu. `check-a11y` reports them as notes.
- **`progress-indicator`'s step button reports "no visible focus change".** Carbon draws
  that ring on `:focus-visible` on the label, so this is a false positive.
- **A notification in the page at load is not announced.** Live regions only fire on
  change, and the sink cannot show one added later.

## Results so far

**Heard and passing:** buttons (disabled ones say "dimmed" under `VO`+→; Tab skips
them), checkbox (mixed and invalid states), radio (position and dimmed), search, tile,
tabs (position, selected, group name, panel), dropdown, tooltip, menu, overflow-menu,
accordion, pagination ("Page of 9 pages" includes the number), ui-shell (the side-nav
submenu reads as a list), progress-indicator (only the disabled step says "dimmed"), and
select (all five are labelled).

**Heard and still open:**

- **textarea** — "Character count" is read with no number.
- **notification** — all eleven close buttons say only "Close, button", so a reader
  moving by Tab cannot tell which notification each one dismisses. Carbon may do the
  same.
- **table** — sortable headers say "Service, button" with no sort state. `aria-sort` is
  on the `<th>`, not the button inside it. Whether `VO`+Shift+↓ announces it is untested.
- **links** — the "link" role was not heard.

**Not yet heard clearly:** text-input (the field's name, re-do with Tab), number-input
and list-box.

Write new results into this section: the section, what was said, and what should have
been.
