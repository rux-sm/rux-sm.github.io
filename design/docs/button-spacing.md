---
type: reference
---

# Button sizes and spacing in Rux Dark

How big a button is, how far it stands from the button beside it, and how far
from the edge of what holds it, in Rux Dark. Geist Dark shares every rule here
but the header and the dialog's margin, and Ant Dark and the Apple themes
share the gaps.
Carbon's four themes keep Carbon's own: square buttons edge to edge in a bar,
and a button set joined by a 1px seam.

The values are set in `css/rux-overrides.css`, and an app's own bars take
them from it rather than restating them.

## Sizes

| Size | Height | Where |
| :--- | :--- | :--- |
| `md` | 36px | the default: every bar (the header, a toolbar, a panel's head and foot, a dialog's foot), a dialog's close, and an action standing in a page or a panel, such as Add |
| `sm` | 32px | inside dense content (a section's menu, a copy button in a field, a row's actions, a small command beside a heading), and inside a notification or a toast |

A component an app draws itself, such as a tile of an icon over a word, may
take its own height; it still takes the gaps below.

## Between buttons

- **8px** between buttons side by side, wherever they stand: a toolbar, a
  head, a foot, a button set, a pair in a row such as Call and Text, and an
  action and its notification's close.
- **Groups part by free space**, not by a wider fixed gap: a toolbar's spacer
  takes what is left, and a foot of three buttons sends the first to the
  start, so a destructive action stands away from the safe pair.
- **Never touching, never 1px apart.** Carbon's 1px is the seam between two
  square buttons; between two rounded ones it reads as one control split in
  half, and two rings touching draw a doubled line.

## From the edge

| Inset | Where |
| :--- | :--- |
| 12px | from the edge of a bar that holds buttons: the header, a toolbar, a panel's head and foot, a dialog's foot, a dialog's close, a card's row of buttons; with 36px buttons that makes every bar 60px |
| 24px | the margin of what a panel or a dialog holds, its words and fields, wider than the 12px its bars' buttons keep |
| centred | a notification's buttons sit centred on its line: the close 8px in on every side of Carbon's 48px square, and 4px in a toast's 40px row |

Ant Dark's foot stands 16px in, as its Modal page measures. Geist Dark
holds a dialog's words 20px in, and its header's 32px buttons 16px in a 64px
bar, as Geist's own site does.

## Inside a button

A label stands 10px from each side, 9px of padding and the 1px border, with an
icon 8px after it. A button in a foot keeps 16px each side, so a short label
does not read as pushed off centre.
