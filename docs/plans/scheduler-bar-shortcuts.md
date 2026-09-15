---
type: plan
---

# Plan: shortcuts on the selected trip bar

## Goal

A selected trip bar shows up to four shortcut buttons down its start edge,
where Open trip sits now. Every action is also on the bar's right-click menu,
and a person chooses which actions fill the shortcut slots.

## Decisions

- **Open trip's tab becomes a column of slots.** The tab, 24px wide down the
  selected bar's start edge, holds up to four icon buttons in slot order and
  splits the bar's height between them. With all six rows on, a bar is 104px,
  so each slot is 26px tall.
- **A slot that does not fit is dropped, from the bottom.** A slot needs at
  least 24px, and a bar with rows turned off is shorter: one slot at two rows,
  two at three, three at four. A dropped action stays on the right-click menu.
- **Slot 1 is always Open trip,** so every trip can be opened from its bar.
- **Slot 2 starts as Itinerary.** It opens the trip's latest itinerary in a
  new tab through the document link page, and stays empty on a trip without
  one until upload exists.
- **No slot shows a button that does nothing.** An action that does not apply
  to a trip leaves its slot empty.
- **One table of actions feeds the menu and the slots.** Each action has a
  name, an icon, when it applies and what it does, in `scheduler/data.js`. The
  right-click menu lists every action, and a slot shows the action assigned to
  it.
- **Choosing the slots is a Customize shortcuts item at the foot of the
  right-click menu,** opening a Carbon modal with a dropdown for slots 2 to 4.
- **The board loads each trip's document ids and labels with its week,** which
  it does not yet, so Itinerary knows whether a trip has one.
- **Upload itinerary waits** for the file uploader and for the trip documents'
  storage to be locked down, both on the status list.
- **The trip editor's Files tab is not part of this plan.**

## Questions

- Slots 3 and 4: empty until chosen, or two actions from the start, and which?
  The right-click menu has Take off this bus, Color and Cancel trip.
- Do the chosen shortcuts follow a person to every device, which needs a column
  on their profile, or stay in each browser as the view options do?
- A 24px-wide slot is a small target for a finger. Does the phone get the
  whole column, or Open trip alone?

## Tasks

- [ ] Load each trip's document ids and labels with the week.
- [ ] Move the right-click menu's actions into one table the menu and the slots
      both read, and add Open itinerary to it.
- [ ] Turn the Open trip tab into the slot column, Open trip then Itinerary,
      dropping slots that do not fit.
- [ ] Add Customize shortcuts: the modal and the saved choice.
- [ ] rux uses the shortcuts on real trips, on the computer and the phone.
