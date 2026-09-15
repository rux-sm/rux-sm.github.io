---
type: plan
---

# Plan: shortcuts on the selected trip bar

## Goal

A selected trip bar shows up to four shortcut slots down its start edge,
where Open trip sits now. Every action is also on the bar's right-click menu,
and each person chooses which actions fill their slots, saved on their profile.

## Decisions

- **Open trip's tab becomes a column of slots.** The tab, 24px wide down the
  selected bar's start edge, holds up to four slots in order and splits the
  bar's height between them. With all six rows on, a bar is 104px, so each
  slot is 26px tall.
- **A slot that does not fit is dropped, from the bottom.** A slot needs at
  least 24px, and a bar with rows turned off is shorter: one slot at two rows,
  two at three, three at four. A dropped action stays on the right-click menu.
- **Slot 1 is always Open trip,** so every trip can be opened from its bar.
- **The default set is Open trip, Itinerary, Color and an empty fourth slot.**
  It applies until a person chooses their own.
- **An empty slot is drawn as an outlined slot with a plus,** and opens
  Customize shortcuts at that slot, so the column shows where a shortcut can
  go.
- **An action that does not apply to a trip shows its icon disabled,** with
  the reason as its label, such as No itinerary yet, so the slots keep their
  order from one trip to the next.
- **Itinerary opens the trip's latest itinerary in a new tab** through the
  document link page.
- **One table of actions feeds the menu and the slots.** Each action has a
  name, an icon, when it applies and what it does, in `scheduler/data.js`. The
  right-click menu lists every action, and a slot shows the action assigned to
  it.
- **Choosing is a Customize shortcuts item at the foot of the right-click
  menu,** opening a Carbon modal with a dropdown for slots 2 to 4, each with a
  None choice that leaves the slot empty.
- **The choice is saved on the person's profile,** so it follows them to every
  device: `alter table platform.profiles add column scheduler_shortcuts
  jsonb;`, where null means the default set. The owner-only select, insert and
  update policies already cover a new column, so none changes. It is applied
  as its own migration, on rux's yes.
- **The board loads each trip's document ids and labels with its week,** which
  it does not yet, so Itinerary knows whether a trip has one.
- **Upload itinerary waits** for the file uploader and for the trip documents'
  storage to be locked down, both on the status list. Once it exists,
  Itinerary on a trip without one becomes Upload itinerary.
- **The trip editor's Files tab is not part of this plan.**

## Questions

- Does the phone get the whole column, or Open trip alone? A 24px-wide slot
  is a small target for a finger.
- Is Color the right third slot in the default set, or another action?

## Tasks

- [ ] rux says yes to the profile column, and it is applied as a migration.
- [ ] Load each trip's document ids and labels with the week.
- [ ] Move the right-click menu's actions into one table the menu and the slots
      both read, and add Open itinerary to it.
- [ ] Turn the Open trip tab into the slot column: the default set, empty and
      disabled slots, and slots dropped when they do not fit.
- [ ] Add Customize shortcuts: the modal, saving the choice to the profile.
- [ ] rux uses the shortcuts on real trips, on the computer and the phone.
