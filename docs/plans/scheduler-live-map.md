---
type: plan
---

# Plan: a Live map to act from

## Goal

Pressing a bus on `scheduler/live.html` gives everything needed to act on
it, the same card the board shows, so a problem seen at a glance is put
right from the map.

## Decisions

- **Pressing a bus opens the board's live card beside the map,** the same
  card `scheduler/trip-tips.js` draws on the board, drawn from where both
  pages can reach it, with Call driver, Open trip and Copy tracking link,
  so the map is somewhere to act from. Copy tracking link waits on the key
  task in `docs/plans/scheduler-samsara.md`.
- **Geofences, replay, address searches and cameras stay in Samsara,**
  because Samsara already does them well, behind an Open in Samsara link
  on the card.
- **The card's own map draws the road ahead as the Live map does,** through
  `aheadOf` in `scheduler/live-map.js`, since both draw one bus's leg with
  `drawLeg` and should not differ.

## Questions

None open.

## Tasks

- [ ] Make the board's live card drawable on the map, with Call driver, Open
  trip, Copy tracking link and Open in Samsara.
- [ ] Draw the road ahead on the live card's map with `aheadOf`.
- [ ] Update the comment at the head of `scheduler/live.js`, the Live map
  row in `scheduler/docs/screen-inventory.md` and `scheduler/README.md`
  with each change.
