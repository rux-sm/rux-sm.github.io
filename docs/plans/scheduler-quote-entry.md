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

### Billing and the rates

- **The rates page is the rate guide.** Every mileage rate has a name and a
  line saying when it is used, in place of the loose note, and the page
  lists them as a table to read: rate, name, when to use it, season. A rate
  cannot be saved without saying when it is used, so no rate sits in the
  list unexplained.
- **A mileage rate can have a season.** A rate takes an optional first and
  last day of the year it applies to, so the Busy season rate, April to
  early June, knows its own dates. A rate with no season is never chosen by
  date.
- **Add the bus rental chooses the rate by the trip's first day.** It takes
  the rate whose season holds that day, and the default rate when none
  does. The calculator opens on the same rate, so the two agree and a busy
  season quote needs no hand correction.
- **A price says which rate made it.** The bus rental line and the
  calculator show the rate's name beside its amount, and a rate chosen by
  season says so, so nobody has to remember what a bare figure means.
- **The dead-miles rate says when the discount is given,** in a line of its
  own on the rates page, so the calculator's tick is a rule and not a guess.

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
- **A new trip's update box suggests Quote sent only when it is marked.**
  With no quote marked sent the box opens empty and asks what the trip is
  waiting on, so the suggestion is never a thing that has not happened.

### Forms

- **A return after midnight prints as the next day's time.** The driver's
  itinerary, the office's and the customer quote mark it as the editor and
  the board do, so a driver never reads a midnight return as the morning's.

### Drafts and the connector

- **A draft can fill `stops`, the email thread and `passengers`,** beside
  the fields it fills now, and `get_trip` returns `passengers` and marks a
  time past midnight as the next day's.

### How it is built

- **Each database change is its own step,** the `passengers` column and the
  rates' new columns alike: written as SQL, shown to rux and applied on a
  yes, before the code that reads it is pushed.
- **Each change ships by itself.** None depends on another except the rate
  by season on the rates' columns and the drafted stops on the connector,
  so the small ones go out first and are used while the larger are built.
- **The trips skill follows the editor.** Its Entering a trip steps and its
  traps are rewritten in the same commit as each change they describe, so
  the skill never tells a session to work around something that is gone.

## Questions

- On which day in June does the Busy season end?
- What is each mileage rate with no note used for, and which of them can be
  deleted?
- When is the dead-mile discount given?
- Should the driver's Simple itinerary say Rest in sleeper on the stop
  where the wait counts as sleeper berth, as the Detailed one does?
- Should Estimated miles follow the route's total until someone types over
  it, in place of being typed after every quote?
- Should `get_trip` return the quote lines, the three Done marks and Quote
  sent, so a session can check its own save without opening Chrome?

## Tasks

- [ ] Open a new trip's update box empty unless Quote sent is marked.
- [ ] Add the Pin this update tick to Save's update box and pin the update
      in the same save.
- [ ] Add Rest in the sleeper to the Route summary's second-driver notice,
      shown only when the longest wait as sleeper berth clears the rule.
- [ ] Match saved locations by address in the place search, abbreviations
      included, ahead of the map's result for the same address.
- [ ] Mark a return after midnight as the next day's time on the driver's
      itinerary, the office's and the customer quote, and in what `get_trip`
      returns.
- [ ] Let the Files tab hold a file before the first save and send it once
      the trip exists.
- [ ] Write the `passengers` column and the rates' name, use and season as
      SQL, show it to rux, and apply it on a yes.
- [ ] Add the Passengers field to the Details tab, read and saved with the
      trip, and to the history's field names.
- [ ] Warn on the Buses tab when the passenger count is above the seats the
      trip's buses hold.
- [ ] Rebuild the rates page's mileage rates as the guide: name, when to
      use it and season on each row, a when-given line on the dead-miles
      rate, and no save for a rate that says nothing.
- [ ] Fill the guide from rux's answers: the Busy season's days, each
      unexplained rate's use or its deletion, and the dead-mile rule.
- [ ] Show the rate's name on the bus rental line and in the calculator.
- [ ] Make Add the bus rental and the calculator's opening rate follow the
      trip's first day.
- [ ] Add `stops`, `booking_contact_missive_url` and `passengers` to the
      fields a draft may fill in `scheduler/connector/index.ts`, return
      `passengers` from `get_trip`, and deploy the connector.
- [ ] Teach `applyDraft` in `scheduler/data.js` to lay drafted stops out on
      the Route tab, set each place that matches a saved location, link the
      thread and fill the passenger count, each marked to check, with
      unpicked places named in the notice.
- [ ] Rewrite the trips skill's Entering a trip steps and traps to match
      what was built, and point `rules.md` at the rates page for every rate
      rule it restates.
- [ ] Describe the new column, the rate guide, the draft's new fields and
      the changed windows in the scheduler's database and screen inventories
      and in `working-from-claude.md`.
- [ ] Enter a trip from an invented itinerary through a draft in Chrome on
      :8641: stops laid out, a saved location set by itself, sleeper rest
      taken from the notice, bus rental added at the season's rate, file
      attached before saving, update pinned by the save; then read it back
      with `get_trip`.
