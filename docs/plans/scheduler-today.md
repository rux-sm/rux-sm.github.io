---
type: plan
---

# Plan: Today, the Scheduler's dashboard

## Goal

One page that says what the office has to do and what is about to go wrong,
in the order it bites, each line opening the place where it is put right. It
shows only what the scheduler already works out, so it never disagrees with
the board, the Trips page or the connector's `needs_attention`.

## Decisions

- **The page is Today, `scheduler/today.html`, started from
  `design/templates/dashboard-page.html`,** because a page is what the
  office goes to, as §7 of `scheduler/docs/screen-inventory.md` places a list
  or a feed.
- **It reads and never writes.** Every line is worked out by the module that
  owns its rule: `scheduler/to-do.js` through `scheduler/to-do-rows.js`'s
  read, `scheduler/follow-up.js`, `scheduler/close-out.js`,
  `scheduler/departures.js`, `scheduler/document-status.js`, and the
  `to_dos` rows the Tasks pane draws, so a rule fixed once is fixed
  everywhere.
- **No rule lives only on Today.** A judgment no module makes yet goes into
  the module that owns it and shows on that module's own page as well,
  because a fact with two homes drifts.
- **Five sections, in the order the work bites:**
  1. **Leaving next,** the page's focal point: the days Departures preps
     for, each leg ready or not, then what breaks within a week: Short of
     buses, Clash, Driver declined, Tell the driver, No times, Missing and
     Leaving soon.
  2. **Tasks:** the open rows by due day, overdue first, as the Tasks pane
     orders them.
  3. **Waiting on customers:** the follow-ups, the due ones first, each
     named by what it waits on: confirmation, PO or deposit, or itinerary.
  4. **Back and still open:** the trips `close-out.js` says are back and
     still lack a balance, an invoice, actual miles or driver pay.
  5. **Paperwork:** a driver's licence or medical card that has ended, ends
     within the Drivers page's 30 days, or is not on file.
- **A section is its count and its first few rows, then All N into the page
  that owns the list,** Trips with `?show=`, Drivers or Documents, so Today
  sums up and is never a second list.
- **No map, activity feed, calendar or welcome,** because the Live map,
  History and the board already are those, and no figure that changes
  nobody's next step, such as trips this month.
- **The layout follows IBM's layout tips:** Leaving next wide on the left as
  the one focal block, the other sections narrower at its right, room
  between them and one row shape repeated; one column at phone width.
- **It reads when it opens and again when its tab is shown,** with no
  realtime channel, because it is read rather than worked in.

## Questions

- Does the Scheduler open on Today, or stay on the board with Today first
  in the side nav? Staying on the board is the default, since the office
  works there all day.
- The screen inventory keeps Tasks and Departures the board's alone, and
  the board opens with its panes shut. May a row on Today open the board
  with that pane open, by an address such as `./?pane=departures`, or does
  Today only count them and send people to the board?
- Should a confirmed trip's missing itinerary or PO wait for the chase
  window before it asks, as an unconfirmed trip's confirmation does? As the
  rule stands, a confirmed trip months away asks after every follow-up wait,
  and those rows would bury Waiting on customers.
- Does a customer with a trip coming up need a current insurance certificate
  on file? If so, that is a new rule in `document-status.js`, shown on the
  Documents page and under Paperwork.
- Should Today show how many buses are free on each of the next three weeks'
  days, for answering a quote request at a glance?
- Should Paperwork name a bus, such as one with an open defect on its
  Maintenance tab? No rule yet says when a bus is due.

## Tasks

- [ ] Change `follow-up.js` as the chase-window question is answered, with
  `scheduler/tools/check-to-do.mjs`'s sample trips and §3 of
  `scheduler/docs/booking.md` in the same commit.
- [ ] Move the licence and medical card rule, `expiry` in
  `scheduler/drivers.js`, into a module the Drivers page and Today both
  load, its words unchanged.
- [ ] Add a metric row that reflows, four across at lg, two at md and one at
  sm, to `design/templates/dashboard-page.html` with invented content, from
  `elements-grid--subgrid` in `design/data/carbon-react-dom.json`.
- [ ] Build `scheduler/today.html` and `scheduler/today.js` from that
  template: the five sections, each read through the modules above.
- [ ] Give the board an address that opens a pane, if the Tasks and
  Departures question allows it, and correct that row of §2 of the screen
  inventory.
- [ ] Add Today to the side nav of every Scheduler page, where the landing
  question puts it.
- [ ] Add Today's row to `scheduler/docs/screen-inventory.md` and its
  paragraph to `scheduler/README.md`.
- [ ] Open Today on :8641 in Chrome in every theme and at phone width, and
  check each section's count against the board, the Trips page's Show
  choices and `needs_attention`.
