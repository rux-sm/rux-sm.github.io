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
- **rux-ui's Billing shows the quote lines and leaves them to the
  scheduler,** which edits them: while a trip has any, its price is read-only
  in rux-ui, and a Hotel line holds the hotel tag.
- **Both apps prompt for what changed,** because a prompt in one app teaches
  people to save from the other; rux-ui writes `trip_updates` as the scheduler
  does. A dated note the log copied is blanked once both apps read the log,
  where it is still its date and the copied words.
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

- [ ] Blank the dated notes the log copied: the 186 whose note is still its
  date and the copied words. SQL shown to rux.
- [ ] Check in Chrome that a save in each app, then the other, leaves both
  apps' changes, on a round trip, a split trip and a trip with day rows; that
  rux-ui's save asks for an update and writes it, and links the customer; and
  that the scheduler's replace keeps a file's link, its cancel frees the buses,
  and its route change clears rux-ui's Confirm mark.
