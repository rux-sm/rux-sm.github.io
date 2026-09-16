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

### What does not change

- **Close trip keeps the tab.** The X down the start edge of every bar of the
  trip in the editor is a different signal — this trip is open and locked — and
  it is on several bars at once, which nothing floating can be.
- **The right-click menu is untouched,** and still carries every action.
- **Customize shortcuts is untouched** but for the two actions added to its
  dropdowns.

## Questions

- **Does the floating bar carry words as well as icons?** Width is no longer
  scarce, so "Open itinerary" could be written out. Icons alone stay smaller
  and quieter.
- **How many slots?** Six was what fitted the mock. It could be four, or it
  could grow to hold whatever is chosen.
- **What happens on the phone?** The board shows about two days at that width
  and the driver page is not built yet. The floating bar would cover more of a
  neighbour there than it does on the computer.
- **Is Cancel trip wanted as a shortcut at all?** It is guarded by its
  confirming box, but it is the one destructive action in the set.

## Tasks

- [ ] Answer the four questions above.
- [ ] Add the floating bar to `scheduler/index.html` and the placing to
      `scheduler/data.js`, with its rules in `scheduler/app.css` under the
      `scheduler-` prefix.
- [ ] Take the shortcut column, its tab rules and the bar's start padding out,
      leaving Close trip's tab in place.
- [ ] Add Mark hotel booked and Cancel trip to the actions table and to
      Customize shortcuts' dropdowns.
- [ ] Re-place the bar on scroll, on resize and when the week changes.
- [ ] Reach every slot by keyboard from the selected trip, and take the bar
      away on Escape.
- [ ] Say what changed in `scheduler/docs/screen-inventory.md`.
- [ ] rux uses the floating bar on real trips, on the computer and the phone.
