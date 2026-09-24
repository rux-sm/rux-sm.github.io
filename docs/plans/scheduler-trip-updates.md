---
type: plan
---

# Plan: a trip says what changed for the customer

## Goal

A trip carries a dated, stamped log of what has been said to the customer, and
a save that changes something the customer would ask about cannot be recorded
without adding a line to it.

The gap is measured. Of 1,472 recorded trip updates, 376 touched the note; of
the 234 that changed a note already written, 225 overwrote it and 9 appended,
so the previous status line is destroyed nearly every time one is written. Of
610 notes, 177 are dated status lines averaging 21 characters, 143 are standing
facts about the trip, and 290 are machine text a migration left behind. No note
in the table contains a newline.

## Decisions

- **The one field is split in two.** `notes` keeps the standing facts a trip
  carries for its whole life, and the dated status lines move to a log, because
  one box cannot be both overwritten and appended to.
- **Standing facts are not dated, not stamped and never prompted.** A gate
  code, a shuttle, which driver runs which route: a prompt that stamped those
  would bury them under a date that means nothing.
- **An update is a row, not a string with a prefix.** It holds the moment, the
  actor and the text, so the date can be re-rendered, the author filtered and
  the lines counted; a stamped string is a one-way door.
- **The app writes the stamp, and no one types it.** The dates typed today are
  spelt four ways and cannot be trusted, since nothing stops a line dated the
  21st being written on the 22nd.
- **The log is a `trip_updates` table of its own,** because a customer thread
  mixed into the field-by-field history is read well by neither.
- **The prompt fires on a material change:** the dates, the times, the route,
  the quoted price, the bus count, the destination, the customer, confirmed,
  the contract, a PO, an invoice and a cancellation. A colour pick, a driver
  swap and a corrected phone number ask nothing.
- **The prompt's box comes filled with a line describing the change,** which
  the person confirms or rewrites, so asking on every route edit costs one
  press.
- **The prompt offers the answer before the box.** Six quick reasons drawn from
  what is already written — quote sent, follow-up sent, waiting on a PO,
  customer confirmed, date changed, working on payment — spell one thing one
  way and make the reasons countable.
- **The prompt names what changed,** each material field with its before and
  after, so the line is written against the change rather than from memory.
- **The 177 dated lines already in `notes` move into the log,** one entry
  each, dated from the line where its date reads and marked as having no
  known author.
- **Both apps prompt,** because a prompt in one app teaches people to save
  from the other.
- **The log is for the office only,** so its lines stay short and internal.
- **Declining is a line of its own.** "Nothing to tell the customer" writes its
  own entry under the same stamp, so a save that says nothing is visible in the
  log instead of invisible.
- **The board shows the newest line only.** The bar's note row is one line cut
  with an ellipsis, and a log that grew the row would cost the week its shape.
- **A stale trip is marked on the bar.** A newest line older than the trip's
  last material change earns a chip in the row of warning marks the bar already
  draws, because the prompt cannot reach a trip nobody saves.
- **rux-ui moves in the same session.** It reads and writes `notes` on the same
  database, so a column that changes meaning changes there too.
- **The migration breadcrumb moves to the history, and is not deleted.** 290
  trips carry `[Legacy corrected MAR26: tripKey=...; original_trip_ref=...]` in
  the note field, and it is the only surviving record of a renumber that wrote
  no history entry of its own.
- **What is kept from it is the old reference.** `original_trip_ref` differs
  from the current one on 287 of the 290 and 70 of those old references are
  held today by a different trip, so a search on one lands on the wrong trip;
  `tripKey` names nothing in this database and its first eight characters are
  already in the new reference on 248 of them.
- **It moves before anything else here, and alone.** No document, invoice or
  purchase order on those 290 trips cites the old reference, so the move waits
  on nothing and nothing waits on it.

## Questions

None open.

## Tasks

- [ ] Move the breadcrumb off the 290 trips: one `trip_history` entry each,
  `updated` with the reference before and after and the source key in the
  metadata, then blank `notes`. SQL shown to rux, applied as its own migration.
- [ ] Write the `trip_updates` migration, staff-only with anon granted
  nothing, and move the 177 dated lines into it. SQL shown to rux.
- [ ] Add the update log to the scheduler's panel: the lines newest first, the
  stamp rendered from the row, and a box to add one without saving the trip.
- [ ] Add the prompt to Save, over the material fields, with the changes
  named, the box filled from them, the quick reasons and the recorded decline.
- [ ] Show the newest line on the bar's note row, and keep the standing facts
  reachable in the panel.
- [ ] Add the stale mark to the bar's warning chips.
- [ ] Make rux-ui read the log and prompt on its own saves.
