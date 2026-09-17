---
type: plan
---

# Plan: pick a trip's colour in the scheduler

## Goal

A trip's bar colour can be set and cleared in the scheduler, in the trip
editor and from the bar's menu, as it can in rux-ui, and the same trip looks
the same on both boards while both are in use.

## Decisions

- **The same six choices as rux-ui:** Standard, which stores null, then teal,
  green, purple, amber and pink. Blue and red stay out: the constraint
  `trips_trip_bar_color_check` refuses them, and on the board they mean
  confirmed and unconfirmed.
- **No database change.** The constraint already allows the five names, null
  and the retired `orange`, `cyan` and `yellow`.
- **A retired name opens as the colour it paints**, and an untouched trip
  saves nothing, so 25 trips keep storing `cyan` or `yellow` until someone
  picks a colour.
- **A colour beats unconfirmed red, as it does in rux-ui,** and the helper
  text says so.
- **One table in `scheduler/data.js`, `TRIP_COLORS`,** feeds the board, the
  editor and the bar menu.
- **The editor uses Carbon's dropdown** at the end of the Details tab,
  so its list reads like the bar menu's: a `scheduler-swatch` chip wearing the
  bar's hue class in the field and on each option, and a checkmark on the
  chosen one. Standard's chip is the trip's status colour.
- **The bar menu has one Color item with a submenu**, Carbon's menu radio
  group with the same chips, so the menu stays short. The item's chip is the
  trip's colour, and a pick saves at once, like Take off this bus. Color is
  hidden for the trip open in the editor, whose Save would otherwise meet a
  conflict.
- **Submenus go into Design's menu first**, in `design/js/menu.js` and
  `design/sink/menu.html`, because Design had none.
- **A colour pick writes a trip history entry,** as
  `docs/plans/scheduler-trip-history.md` sets out.

## Questions

None open.

## Tasks

- [ ] rux picks a colour on a real trip, from the editor and from the bar
      menu, and checks rux-ui shows the same colour.
