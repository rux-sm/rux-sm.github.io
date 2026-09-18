---
type: plan
---

# Plan: place a list box's menu where it can be seen

## Goal

A combo box or dropdown opened inside anything that scrolls shows its whole
list. The menu was `position: absolute` inside its field, so the scheduler's
trip panel cut it off at the panel's edge — measured 80px past it — and the
options beyond the cut could be neither seen nor reached.

The placement is built. What is left is rux seeing it in the running app,
which needs signing in, and one surface that was deliberately not changed.

## Decisions

- **The menu is `position: fixed` while open and nothing is portaled,** because
  a fixed box is laid out against the viewport and so escapes every scrolling
  ancestor's clip on its own. `js/overlay.js` records that Design portals
  nothing, and this keeps that true.
- **The below-or-above arithmetic is `Rux.anchorTo` in `js/overlay.js`,** shared
  with `js/menu.js`, because a second copy would be the one that missed the next
  fix.
- **The overflow menu passes no options, so its behaviour is unchanged.** The
  lifted expression was checked against the one it replaced over 2016 input
  combinations with no difference.
- **The contract lives in `js/overlay.js`'s header, not in `design/docs/`,**
  because that is where the kernel's other placement rules are written and one
  fact wants one home.
- **The row overflow menu stays absolute.** It sits in
  `.rux--data-table-content`, which scrolls, so the same clip is available to
  it, but no row menu has been reported cut off and one was measured 209px
  clear; `js/overlay.js` records that this is a decision, not an omission.
- **No sink specimen is added.** A sink specimen is pinned open and this module
  claims a list box by its field, so a specimen would never be placed and would
  demonstrate nothing; the scheduler's own trip panel is the real case.

## Questions

None.

## Tasks

- [ ] rux opens the scheduler's trip panel signed in and checks the contact
      search, the driver picker and the bus picker near the bottom of a long
      panel, on the desktop and on a phone.
