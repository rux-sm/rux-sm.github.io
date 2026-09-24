---
type: plan
---

# Plan: suggest drivers for the whole week

## Goal

One item in the week's More menu, Suggest drivers, lists every bus on the
board that needs a driver, with the driver the Fleet tab would rank first for
it. The office ticks the rows it agrees with and presses Apply, and the ticked
drivers are saved at once. Filling a week of empty seats takes one look instead
of one trip at a time.

## Decisions

- **It lives in the week's More menu** (`#scheduler-view-menu`), after New
  trip, as Suggest drivers…, because it acts on the board's range rather than
  on one trip.
- **Its range is the board's:** the week shown, or both weeks when Two weeks is
  on.
- **Only the Driver seat is suggested.** Co-drivers and relief need a swap time
  and a note, so they stay in the Fleet tab.
- **A row is a bus on a leg whose Driver seat is:**

  | Seat | Listed | Ticked at first |
  | :--- | :--- | :--- |
  | Empty | always | yes |
  | Declined | always, the declined driver never suggested again for it | yes |
  | Pending assignment | always, like Declined | yes |
  | Not sent | only when the suggestion has a better priority | no |
  | Pending response or Confirmed | never | — |

- **A driver already chosen is never changed unless their row is ticked.**
- **A placeholder trip is left out,** because it is not booked yet.
- **The ranking is the Fleet tab's**, from `fitFor` and `rankDrivers` in
  `scheduler/data.js`: free before busy, strictly by priority, no back-to-back
  before back-to-back, then the fewest days in four weeks.
- **The suggestion is the automatic order's first,** as Assign best takes it:
  a driver with no back-to-back trip, whatever their priority, before a
  back-to-back one, who is a last resort and only with 10 hours from the one
  trip's return arrival to the other's departure. A missing time rules them
  out, and a row with no one rested opens on a blank for a pick by hand.
- **The week is planned as one.** Rows are filled earliest leg first, and each
  suggestion counts as a trip for the rows after it, so one driver is never
  suggested for two buses on overlapping days, and the days it adds count
  towards the fewest-days ranking.
- **Unticking or changing a row plans the later rows again**, so a driver freed
  by an untick can be suggested further down.
- **Each row can be changed** with a Carbon select of the free drivers in rank
  order, each with its reason, such as "Priority 1 · 2 days in 4 weeks".
- **It is a Carbon modal with one row per bus:** a checkbox naming the trip,
  its dates, the leg and the bus, then the driver there now with their status,
  and the select holding the suggestion.
- **Apply saves every ticked row at once,** with the right-click menu's
  `assignDriver` write: the seat's row changed or added, a saved `driver:state`
  role put back to plain `driver`, the crew's statuses sent again with the new
  driver at Not sent, and one history entry per trip.
- **A row that fails to save stays in the list with its error,** and the rows
  that saved leave it, so Apply can be pressed again.
- **The trip open in the editor is left out,** since the editor holds its
  drivers unsaved; the list says so when it has one.
- **Suggesting sends nothing to drivers.** Sending stays where it is today.

## Questions

None open.

## Tasks

- [ ] rux opens Suggest drivers on a real week, checks the rows and picks,
      applies a few and checks the saved drivers on the board.
