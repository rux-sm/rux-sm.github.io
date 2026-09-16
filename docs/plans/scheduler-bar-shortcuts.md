---
type: plan
---

# Plan: the selected trip's shortcuts float clear of the bar

## Goal

The shortcuts leave the trip bar. A small bar floats beside the selected trip,
placed the way a tooltip is placed — above it where there is room, below it
where there is not, slid back inside the board's edges — and carries the same
actions on every trip, however short or narrow that trip is. Picking a trip
stops costing that trip anything.

## Decisions

### Why the tab is being replaced

- **The tab takes 28% of the writing.** On the narrowest day column the bar has
  113px for its text, and the tab leaves 81px. Every line on the one trip you
  are looking at is the shortest it ever gets.
- **Slots vanish when rows are turned off.** The count is the bar's height over
  24px, capped at four: six rows gives four slots, five rows gives three, three
  rows gives two, two rows gives one. A shortcut someone chose is simply not
  there, with nothing said.
- **Drawing them along the bottom instead moves the fault rather than fixing
  it.** A one-day column at its narrowest holds about four 32px buttons, so a
  one-day trip would show four of six and a three-day trip all six. Any layout
  inside the bar meets that ceiling; floating clear is what escapes it.

### How it is placed

- **Above the trip by choice, below it when the top of the board is in the
  way.** Nothing else is tried.
- **It slides back inside the board at either edge,** and the arrow keeps
  pointing at the trip it belongs to.
- **It follows the trip while the board scrolls,** and is re-placed on scroll
  and on resize.
- **It sits over the trip above or below it.** That is the price, and it is
  paid by a trip nobody is working on rather than the one in hand.
- **It stays while the trip stays selected,** as the tab does today. Picking
  another trip moves it; picking nothing takes it away.

### What it holds

- **The same actions on every trip.** No count that changes with the trip's
  height or its length.
- **Mark hotel booked and Cancel trip join the choices.** Both are on the
  right-click menu today and neither can be a shortcut, which is most of why
  the customizing does so little. Cancel trip opens its confirming box as it
  does from the menu.
- **Slot 1 is still Open trip,** with Carbon's Launch icon.
- **Icons only, no words.** Width is no longer scarce, but a wider bar covers
  more of the trip next door, and the icons are already learned.
- **The row grows with what is chosen, from three slots up to six.** An empty
  slot only pads it up to three, so Customize shortcuts stays one press away
  while the row is small and no dashed circle trails a row that is already
  full enough. Three slots are 120px, inside the 129px a one-day trip bar has
  at the narrowest day column, so the bar never overhangs the trip it points at.
- **The day column keeps its 8.5rem minimum.** Narrowing it to 127px would make
  a three-slot bar exactly as wide as a one-day trip, and cost every one-day
  trip 9px of writing all week to do it.
- **The phone gets the same bar.** One behaviour and one lot of code; it covers
  more of a neighbour there, which the phone board will have to answer for
  itself when it is built.
- **Cancel trip is offered,** because it asks before it cancels, exactly as it
  does from the right-click menu.
- **The default set is unchanged:** Open trip, Open itinerary, Color, and an
  empty slot.
- **An empty slot still shows the dashed circle** and opens Customize
  shortcuts at that slot.
- **A shortcut that cannot act on a trip still shows faint,** with the reason
  as its label, so the slots keep their order from trip to trip.
- **The actions table in `scheduler/data.js` stays the one source,** feeding
  both the floating bar and the right-click menu.
- **The choice stays in `platform.profiles.scheduler_shortcuts`.** No database
  change.

### The trip in the editor

- **Close trip loses its tab too.** It was the last thing taking 32px from a
  bar, and it was never the only way out: the panel has its own close button
  and Escape closes it. The shortcut bar's first slot turns into an X on the
  bar the panel holds, so one slot works the editor both ways.
- **The trip's other bars wear a dashed ring** in the selection's colour. The
  tab was the only thing saying which bars belong to the open trip, and without
  a mark they would refuse to drag with no reason given.
- **A slot the editor has taken over stays in place and says so** — change the
  colour, the hotel or the bus in the editor — because a write from the board
  would move `updated_at` under the panel and turn its next Save into a
  conflict.

### What does not change

- **The right-click menu is untouched,** and still carries every action.
- **Customize shortcuts is untouched** but for the two actions added to its
  dropdowns.

## Questions

None open.

## Tasks

- [ ] rux uses the floating bar on real trips, on the computer and the phone.
