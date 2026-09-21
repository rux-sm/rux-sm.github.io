---
type: plan
---

# Plan: the driver itinerary form

## Goal

A second form on the Forms page: the trip's plan for the day, on the company's
own head, in one shape whoever the customer is. Opened from a trip it fills in
from the route already entered; opened from the Forms page it is blank and
typed into. It prints, goes in the envelope, and the driver carries a sheet
that reads the same on every trip.

The customer's own itinerary stays what it is. It arrives as a PDF, a text
message or a photograph, in whatever shape the customer keeps it, and it is
filed against the trip unchanged. This form is the office's clean copy of it.

## Decisions

- **This is the driver sheet already named for the registry.**
  `scheduler/docs/screen-inventory.md` lists "Print schedule, driver sheet" as
  later entries in `print.html`'s registry, and rux-ui's
  `js/panels/driver-sheet.js` opens by calling itself "the printable itinerary
  a driver carries". It is that form, not a sixth one, and it is built before
  the print schedule rather than after it.
- **It is called the driver itinerary,** not the itinerary and not the driver
  sheet. "Itinerary" alone already names the customer's file:
  `itinerary_not_needed`, the bar's No itinerary yet mark, the menu's Upload
  itinerary and the itinerary panel all mean a row in `trip_documents`. "Sheet"
  says nothing about what is on it. `driver-itinerary` is the `?form=` value
  and the class prefix.
- **It binds the trip and the leg, not the bus.** The envelope binds
  `assignment+seat` because it is personal, one seat and one name; the plan for
  the day is the same for every driver and every bus on the leg, and
  `trip_stops` are keyed by trip and leg with no bus among them. So `binds` is
  `'trip'`, and `copies` is the trip's legs rather than its crew.
- **`?assignment=` opens it too,** resolving the trip and the leg from the
  assignment, so a way in that holds a bar's id needs no second address.
- **Every field can be typed into, always,** where the envelope's are typed
  into only on a blank one. The envelope prints what dispatch knows and
  dispatch is right; this prints what the customer sent, which is the thing
  being tidied. Autofill is a head start, not a lock.
- **Four columns, as rux-ui's sheet prints them: Time, Location, Address,
  Activity.** They are what the office already reads, and the fourth is the
  answer to a line like "Games are at 4:30pm and 5:30pm", which is neither a
  place nor a time but belongs beside the stop it happens at.
- **Each column is a `trip_stops` field,** the leg's own rows in `position`
  order: Time from `depart_prev`, `arrive` and `spot`, labelled by the stop's
  type as rux-ui labels them — Report and Roll at the yard, Spot and Dep at a
  pickup, Arr and Dep elsewhere; Location from `name`; Address from `address`;
  Activity from `label`, which is where rux-ui's grid keeps it, except on a
  pickup, where `label` carries `origin:yard` instead.
- **Miles and drive print under the location, and nothing else is worked out.**
  `trip_stops` holds `miles` and `drive` per row, so the leg line rux-ui prints
  costs nothing. Its tight-leg warnings and its duty-hours-by-day footer come
  from the Grid tab's arithmetic, which this app does not have and which the
  registry forbids a form from redoing. They wait for the itinerary grid.
- **The head names the leg, the date, the client, the destination and the
  day-of contact — no bus and no crew,** which is rux-ui's own head. The
  envelope beside it names the bus and the seat, and naming them twice is one
  fact with two homes. A Bus line is the one exception, blank and typed into,
  filled only when the form was opened on an assignment.
- **No blank ruled rows.** Rows are added on screen before printing, because a
  printed grid of empty rows reads as a form nobody filled in, which is the
  impression this form exists to get away from. The driver's pen has the
  envelope's day-of fields and the room beside each stop.
- **It names no paper.** `page` left out is `size: auto`, which lays the form
  out to whatever is in the tray and flows onto as many sheets as the stops
  need; rux-ui's sheet is Letter with the margin on the sheet. The envelope
  names 6 by 9 because it is an envelope; this goes inside one.
- **Nothing is saved.** What is typed is on the page and nowhere else, prints,
  and is gone when the page closes, which is what the blank envelope does and
  what rux-ui's sheet does — it builds into the document, prints, and removes
  itself. A typed line worth keeping belongs upstream, in the stop's `label`
  or the seat's `instructions`, both of which already print. The structured
  home for an itinerary is the Itineraries view and the itinerary grid, and
  inventing a column now would compete with them.
- **A printed copy is never filed as the trip's Itinerary.** Printing to PDF
  and uploading it is always open, but under its own name: filed as an
  itinerary it becomes the trip's newest, the bar's shortcut opens the office's
  copy instead of the customer's, and the No itinerary yet mark clears for a
  document the customer never sent.
- **The mark is `trips.itinerary_printed_outbound` and `_return`,** which exist
  and which rux-ui already writes, so a sheet printed here shows as printed
  there. This is the one piece of plumbing the second form forces: `markPrinted`
  in `scheduler/print.js` is written against `trip_drivers`, `envelope_printed`
  and a seat id, and has to read the registry entry's `marks` instead. A
  `marks` shape that only ever describes one form is not a registry.
- **The way in is the Forms page, and nothing new on the bar.** The bar's menu
  already has Forms, which opens the hub on the trip, and the hub lists every
  form with a link per leg. A bar that grew an item per form would be a menu of
  paperwork. The envelope keeps its own shortcut because it is printed for
  every trip.
- **The envelope's multi-stop log stays what it is.** That table is the driver
  recording what happened — time in, time out, odometer. This is the plan for
  what should. They are a pair, and their columns are drawn differently enough
  that nobody fills in the wrong one on the bus.
- **One layout.** The envelope has two because which one the office uses is an
  arrangement with the customer. Nothing says this form needs a second, and a
  layout added before it is wanted is a choice offered for no reason.

## Questions

None open.

## Tasks

- [ ] Teach `marks` to say what it writes, and `markPrinted` in
      `scheduler/print.js` to read it: the table, the column, and whether the
      subject is a seat or a leg. The envelope's entry says what it says now.
- [ ] Teach `showForm` the `'trip'` binding: read the trip and its stops by
      `?trip=`, take the leg from `?leg=` or from `?assignment=`, and build the
      copies list from the trip's legs.
- [ ] Build the form: the head, the four columns, the leg line, and the fields
      that are typed into. Its rules go in `scheduler/print.css` beside the
      envelope's, and any class it needs that Carbon lacks is its own under
      `scheduler-driver-itinerary`.
- [ ] Give the hub a link per leg for a trip-bound form, where it now builds
      one per bus.
- [ ] Amend the forms line in `docs/status.md`, and the "Print schedule, driver
      sheet" row in `scheduler/docs/screen-inventory.md`, to say which of the
      named forms is still open and in what order.
- [ ] rux prints one from a real trip, in the panel and in its own tab, and
      checks the sheet against the itinerary the customer sent.
