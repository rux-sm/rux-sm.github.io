---
type: plan
---

# Plan: Every painted edge on a whole pixel

## Goal

In every app, every box that paints something lands on whole CSS pixels:
its left, top, width and height. A box paints when it has a background, a
border, a shadow, or is an icon or a picture. A check fails the commit when
one does not, so it stays that way.

## Decisions

- **Text itself is not measured.** Letters are drawn at their font's own
  widths, which are fractions; the box around them is measured.
- **A box sized by its text is rounded up to the next whole pixel,** with
  `calc-size(fit-content, round(up, size, 1px))`, in Design's shared rules,
  so tags, buttons and pills are fixed once for every app.
- **Spacing stays on Carbon's scale,** 2, 4, 8, 12, 16px and up; a gap
  that takes a leftover is the one exception, and is whole and even.
- **A shared part is fixed in Design,** never in an app, because the same
  defect shows in every app that links it.
- **Things placed by time or by share are rounded where they are placed:**
  a trip bar's stops and track, the road strip, and table columns.
- **The check has no list of exceptions.** If a box cannot be made whole,
  the rule is changed, not excused.
- **The check is `tools/check-pixels.mjs`,** in `npm run check`: headless
  Chrome, as `scheduler/tools/check-strip.mjs` runs it, opening every app's
  pages at 1440px and at a 402px phone width, the Scheduler's behind a
  stand-in account.

## Questions

- **iPhone Safari has no `calc-size`.** Text-sized boxes stay fractional
  there unless a script rounds them. Leave the phone as it falls
  (recommended, its screen draws three dots to a pixel), or add the script?

## Tasks

- [ ] Write `tools/check-pixels.mjs` and add it to `npm run check`.
- [ ] Design's header: the logo's width at 16px tall, and the 24px avatar
  centred in a 47px bar at 11.5px.
- [ ] Design's text-sized boxes: tags, buttons, pills, the select field.
- [ ] Design's data table: whole-pixel columns and row tops.
- [ ] Design's tiles and progress bar, which LN Guide, Coins and Pixels show.
- [ ] Scheduler board: stops and tracks, the road strip, and the bar's kind
  icon.
- [ ] Scheduler lists, records, forms, chat and print pages.
- [ ] LN Guide's status icons, Pixels' header menu, Sevens' and Coins'
  buttons.
- [ ] Every app at both widths through the check, then in Chrome on :8641.
