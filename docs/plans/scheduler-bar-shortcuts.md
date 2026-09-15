---
type: plan
---

# Plan: shortcuts on the selected trip bar

## Goal

A selected trip bar shows up to four shortcut slots down its start edge,
where Open trip sat. Every action is also on the bar's right-click menu, and
each person chooses which actions fill their slots, saved on their profile.

## Decisions

- **The tab is 32px wide and holds up to four slots,** splitting the bar's
  height between them, on the computer and the phone alike.
- **A slot that does not fit is dropped, from the bottom.** A slot needs at
  least 24px; a dropped action stays on the right-click menu.
- **Slot 1 is always Open trip,** with Carbon's Launch icon.
- **The default set is Open trip, Open itinerary, Color and an empty fourth
  slot,** until a person chooses their own.
- **An empty slot shows Carbon's dashed circle, faint,** and opens Customize
  shortcuts at that slot.
- **A shortcut that cannot act on a trip shows faint,** with the reason as its
  label, such as No itinerary yet, so the slots keep their order.
- **Open itinerary opens the trip's newest itinerary in a new tab** through the
  document link page.
- **One table of actions in `scheduler/data.js` feeds the slots,** and the
  right-click menu carries the same actions.
- **Customize shortcuts is at the foot of the right-click menu,** a Carbon
  modal with a dropdown for slots 2 to 4, each with None.
- **The choice is saved in `platform.profiles.scheduler_shortcuts`,** where
  null means the default set.
- **Upload itinerary waits** for the file uploader and for the trip documents'
  storage to be locked down, both on the status list.
- **The trip editor's Files tab is not part of this plan.**

## Questions

None open.

## Tasks

- [ ] rux uses the shortcuts on real trips, on the computer and the phone.
