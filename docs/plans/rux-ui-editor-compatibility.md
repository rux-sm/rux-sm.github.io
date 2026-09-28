---
type: plan
---

# Plan: rux-ui's trip editor saves as the scheduler's does

## Goal

A trip saved in either app never undoes, drops or duplicates what the other
saved. rux-ui's trip editor writes the same tables the same way the scheduler's
does: only what changed, row by row by id, over the same model of a route, a
quote and a trip's updates, so the two can be used side by side on one trip.
rux-ui keeps its own look; only how it saves changes.

## Decisions

- **A save writes only what changed.** rux-ui compares its form with the trip
  it opened on and writes the columns that differ, as the scheduler's
  `patchOf` does, instead of every column on every save; and it checks
  `updated_at` first, offering Save anyway or reload when the trip changed
  since it opened, as the scheduler's conflict window does.
- **Every child table is written by id.** Stops, payments and ticket options
  are updated, added and deleted row by row, as trip_pos, trip_invoices and the
  buses already are, so a row the other app added since the form opened stays.
  The buses delete only a row the form loaded and then removed.
- **The needs are merged, not rebuilt.** `trip_reqs` keeps the keys it held,
  including false answers and needs the office has switched off, as the
  scheduler keeps them.
- **The itinerary is rebuilt on the Route tab's model,** in rux-ui's own
  layout. Written by id, it
  keeps day and sleeper rows, a spot typed for the customer, the yard times and
  a drop-off's own arrival, takes the spot minutes from `route-times-v1`
  instead of a fixed 15, and never deletes the other leg's rows unless the trip
  stopped being a split.
- **Billing reads and writes the quote lines,** the Hotel line with them, and
  the price is their total once a trip has any, as on the scheduler's Billing
  tab.
- **Both apps prompt for what changed,** because a prompt in one app teaches
  people to save from the other; rux-ui writes `trip_updates` as the scheduler
  does. The 203 dated notes the log copied are blanked once both apps read it.
- **The customer is linked the same way:** `customer_id` set, and a customer
  made for a name newly typed, as the scheduler's `linkCustomer` does.
- **A driver's statuses are sent only when a seat or a status changed,** as
  the scheduler sends them.
- **Two fixes are the scheduler's:** replacing a file keeps its row's id, as
  rux-ui does, so a document link keeps working; and a trip whose day-of
  contacts have a gap opens unchanged.
- **A cancelled trip loses its buses and drivers in both apps,** as rux-ui
  does now, so they are free for other trips at once.
- **A route changed in the scheduler clears rux-ui's Confirm mark,**
  `itinerary_confirmed`, since a changed route needs checking again.
- **What only rux-ui has stays,** each written only when changed: pay per
  seat, ticket options and ticketed service, the manifest, the email thread,
  self-organized, the itinerary's Confirm mark and the tasks panel's fuel card
  and hotel rows.

## Questions

None open.

## Tasks

- [ ] Rebuild rux-ui's itinerary on the Route tab's model, as the decision
  above says.
- [ ] Bring rux-ui's Billing section onto the quote lines, the Hotel line
  included.
- [ ] Make rux-ui read the updates log and prompt on its own saves.
- [ ] Blank the 203 dated notes the log copied, where a note is still the text
  it copied, once both apps read the log. SQL shown to rux.
- [ ] rux-ui links the customer and the booking contact's customer as the
  scheduler does.
- [ ] The scheduler keeps a replaced file's row id, opens a trip whose day-of
  contacts have a gap unchanged, takes a cancelled trip's buses and drivers
  off, and clears `itinerary_confirmed` when a save changes the route.
- [ ] Update `scheduler/docs/database-inventory.md` for what each table's
  writers now do, and rux-ui's own docs as its `CLAUDE.md` asks.
- [ ] Check in Chrome that a save in each app, then the other, leaves both
  apps' changes, on a round trip, a split trip and a trip with day rows.
