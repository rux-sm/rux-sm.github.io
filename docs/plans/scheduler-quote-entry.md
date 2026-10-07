---
type: plan
---

# Plan: Entering a quote in one pass

## Goal

A quote is entered by going down the trip editor's tabs once, in the order
they already stand: Details, Route, Buses, Billing, Files, Save. Nothing
sends the person back a tab, nothing waits for a second visit after the
save, and a draft that comes from an email arrives with its route already
laid out.

Each tab answers one question and reads only the tabs before it:

| Tab | Its question | What it reads |
| :--- | :--- | :--- |
| Details | Who, when and how many people? | the email |
| Route | How far, how long and how many drivers? | Details |
| Buses | Which bus, with which seats and needs? | Route |
| Billing | What does it cost? | Route and Buses |
| Files | What did the customer send? | nothing |
| Save | What is the trip waiting on? | all of them |

## Decisions

### The order of work

- **The tab order is the work order and stays as it is.** No tab is moved,
  added or renamed, because the order already follows what each one needs
  from the last.
- **The quote calculator is for trying a price, not for entering one.** A
  plain quote is the Billing tab's Add the bus rental. The calculator is
  opened for a dead-mile discount, another rate or a price match, so an
  ordinary quote never leaves the trip's own panel.
- **The Detailed itinerary is the review sheet.** It already shows the
  stops, the hours, each wait's status, the miles, the rate and the price on
  one page, so it is what gets read before a quote is reported or sent, and
  nothing new is built for that.

### Details

- **A trip has a passenger count.** One number field, Passengers, beside
  the dates, kept in a new `passengers` column on `trips`. The headcount has
  a home of its own and stops living in the pinned update. No form prints
  it.
- **The email thread arrives linked.** A draft carries the thread's address,
  so the open icon on Booking contact is there before anyone opens its menu.

### Route

- **A draft can carry the stops between the pickup and the drop-off.** Each
  has a name, an address, the time the group arrives and the time it leaves.
  The editor lays them out in order, each marked to check, so the person
  checks a route in place of typing one.
- **A saved location comes first.** A drafted place that matches a saved
  location by name or by address is set to that location without asking,
  still marked to check.
- **A place search finds a saved location by its address too.** Typing a
  street address lists the saved location at that address ahead of the
  map's own result for it, with Blvd read as Boulevard and the like, so the
  same place is never picked under two records or offered to the lists
  again.
- **Any other drafted place is picked from its list like a typed one.** The
  draft fills the search and the person chooses the result, because an
  address nobody chose has no map point to measure from.
- **The second-driver notice offers the sleeper rest first.** When counting
  the leg's longest wait as sleeper berth would bring the day inside the
  rule, the notice names that stop and offers Rest in the sleeper beside Add
  co-driver. Taking it sets that wait to sleeper berth and turns on the
  Sleeper need on the leg's vehicles, so one press on the tab that raised
  the question replaces a stop's dialog and a vehicle's window. When the
  rest would not be enough, the notice offers the co-driver alone.
- **A long day back after midnight stays a one-day trip.** The +1 beside
  the time is how the editor and the board show it, and nothing asks for a
  second day.

### Buses

- **More passengers than seats is a warning, nothing more.** When the count
  is above what the trip's buses seat, the tab says so above the vehicles.
  It turns on no need and adds no bus, because the office decides what to
  send.

### Settings

- **The Rates page is the Settings page.** One page holds the office's
  decisions that seldom change, on three tabs: Rates, Calendar and Trips.
  It is `settings.html` in place of `quote-rates.html`, linked from the side
  navigation and from the calculator, so a rule has one place to be looked
  for.
- **Calendar sets the default rate for each month.** Twelve rows, one a
  month, each choosing one of the mileage rates, and a month left alone
  uses the default rate. It is kept in `settings`, so the busy months are
  set once and no rate needs dates of its own.
- **Trips holds what a trip's suggestions are worked out from:** the route
  times, the fuel card limits and the dead-mile limit. The Route tab's
  windows for the first two stay, because they are changed with a trip
  open.
- **A setting one page uses keeps its window there.** Follow-ups stay on
  Trips and Vehicle types on Fleet. The yard, the bus needs and the billing
  steps, which only the old app edits, join Settings by the screen
  inventory's own row and not by this plan.

### Billing and the rates

- **A mileage rate is an option with a note.** The Calendar chooses the
  default, and every other rate is there to be picked by hand on the bus
  rental line or in the calculator, so none is deleted and none has to
  explain itself.
- **Add the bus rental chooses the rate by the trip's first day.** It takes
  the Calendar's rate for that day's month. The calculator opens on the
  same rate, so the two agree and a busy month's quote needs no hand
  correction.
- **A price says which rate made it.** The bus rental line and the
  calculator show the rate's note beside its amount, and a rate the
  Calendar chose names its month, so nobody has to remember what a bare
  figure means.
- **Dead miles are suggested past a limit.** Dead miles are the drive from
  the yard to the pickup and back from the last stop. When a leg's pass the
  office's dead-mile limit, the Billing tab says so and offers the
  discount, as the Route tab offers a fuel card. With no limit set, nothing
  is suggested.
- **The customer sees dead miles as a Discount.** Taking the offer leaves
  the bus rental at the full rate on every mile and adds a Discount line,
  Dead miles discount, for the difference, so the quote shows what was
  taken off. The calculator opens the same way, with Count the route's dead
  miles and Show dead miles as a discount both ticked.
- **Estimated miles follow the route.** The field shows the Route summary's
  total and Save writes it, where a blank field writes nothing today, so
  the old app and the driver's forms read the miles the quote was priced
  on. A figure typed over it stays.

### Files

- **The Files tab takes a file before the first save.** The file and its
  type wait in the list, marked as going up with the save, and are sent once
  the save has made the trip. Closing without saving drops them. The
  itinerary is attached while the email is still open, not on a second
  visit.

### Save

- **Save's update box can pin what is written in it.** A Pin this update
  tick sits under the box, on for a new trip and off for a change, so the
  note saying what a trip waits on is pinned by the save that writes it.
- **A new trip's update box opens on one standard line.** It reads Quote
  not sent until a quote is marked sent, and Quote sent with the price once
  it is, so the first update is short and never says a thing that has not
  happened. A session saves that line as it stands, adding a few words only
  when the trip waits on something else.

### Forms

- **The Simple itinerary says Rest in sleeper** on the stop where the wait
  counts as sleeper berth, so the driver reads the rest plan on the sheet
  they carry. It prints no other wait, which stays the Detailed sheet's.
- **A return after midnight prints as the next day's time.** The driver's
  itinerary, the office's and the customer quote mark it as the editor and
  the board do, so a driver never reads a midnight return as the morning's.

### Drafts and the connector

- **A draft can fill `stops`, the email thread and `passengers`,** beside
  the fields it fills now, and `get_trip` returns `passengers` and marks a
  time past midnight as the next day's.
- **`get_trip` returns what a save wrote to Billing:** the quote lines, the
  three Done marks and Quote sent with its price, so a session checks its
  own save by reading it back and opens Chrome only to look.

### How it is built

- **The one database change is its own step.** The `passengers` column is
  written as SQL, shown to rux and applied on a yes, before the code that
  reads it is pushed.
- **Each change ships by itself.** None depends on another except the rate
  by month and the dead-mile suggestion on the Settings page, and the
  drafted stops on the connector, so the small ones go out first and are
  used while the larger are built.
- **The trips skill follows the editor.** Its Entering a trip steps and its
  traps are rewritten in the same commit as each change they describe, so
  the skill never tells a session to work around something that is gone.

## Questions

## Tasks

- [ ] Add Rest in the sleeper to the Route summary's second-driver notice,
      shown only when the longest wait as sleeper berth clears the rule.
- [ ] Match saved locations by address in the place search, abbreviations
      included, ahead of the map's result for the same address.
- [ ] Mark a return after midnight as the next day's time on the driver's
      itinerary, the office's and the customer quote, and in what `get_trip`
      returns.
- [ ] Make Estimated miles show the Route summary's total and save it, with
      a saved figure that differs from the route read as typed, and check
      the old app's driver view reads it.
- [ ] Let the Files tab hold a file before the first save and send it once
      the trip exists.
- [ ] Write the `passengers` column as SQL, show it to rux, and apply it on
      a yes.
- [ ] Add the Passengers field to the Details tab, read and saved with the
      trip, and to the history's field names.
- [ ] Warn on the Buses tab when the passenger count is above the seats the
      trip's buses hold.
- [ ] Turn the Rates page into Settings, `settings.html`, laid out with the
      design-page skill: the rates form and its Save on the first tab, a
      link in the side navigation of the fourteen pages that carry one, and
      the calculator's Edit rates pointed at it.
- [ ] Build the Calendar tab: a mileage rate for each month, saved in
      `settings`, with a month left alone on the default rate.
- [ ] Build the Trips tab: the route times, the fuel card limits and the
      dead-mile limit, the last one new in `settings`.
- [ ] Show the rate's note on the bus rental line and in the calculator,
      with the month when the Calendar chose it.
- [ ] Make `defaultRate` in `scheduler/data.js` and the calculator's
      opening rate in `scheduler/quote.js` take the month of the trip's
      first day.
- [ ] Say on the Billing tab when a leg's dead miles pass the limit, with
      an action that adds the Dead miles discount line as
      `linesFromCalculator` does, and open the calculator with both
      dead-mile ticks on.
- [ ] Add `stops`, `booking_contact_missive_url` and `passengers` to the
      fields a draft may fill in `scheduler/connector/index.ts`, return
      `passengers`, the quote lines, the three Done marks and Quote sent
      from `get_trip`, and deploy the connector.
- [ ] Teach `applyDraft` in `scheduler/data.js` to lay drafted stops out on
      the Route tab, set each place that matches a saved location, link the
      thread and fill the passenger count, each marked to check, with
      unpicked places named in the notice.
- [ ] Rewrite the trips skill's Entering a trip steps and traps to match
      what was built, and point `rules.md` at the Settings page for every
      rate rule it restates.
- [ ] Describe the new column, the Settings page and its two new settings,
      the draft's new fields and the changed windows in the scheduler's
      database and screen inventories and in `working-from-claude.md`, and
      trim the screen inventory's Settings row to the yard, the bus needs
      and the billing steps.
- [ ] Enter a trip from an invented itinerary through a draft in Chrome on
      :8641: stops laid out, a saved location set by itself, sleeper rest
      taken from the notice, bus rental added at the month's rate, dead
      miles offered past the limit, file attached before saving, the
      standard update pinned by the save; then read it back with `get_trip`.
