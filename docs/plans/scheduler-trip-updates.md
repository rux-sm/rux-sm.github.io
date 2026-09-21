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
- **The prompt fires on a material change only:** the dates, the times, the
  quoted price, the bus count, the destination, the customer, confirmed, the
  contract, a PO, an invoice and a cancellation. A colour pick, a driver swap
  and a corrected phone number ask nothing, because a prompt on every save is
  trained away inside a week.
- **The prompt offers the answer before the box.** Six quick reasons drawn from
  what is already written — quote sent, follow-up sent, waiting on a PO,
  customer confirmed, date changed, working on payment — spell one thing one
  way and make the reasons countable.
- **The prompt names what changed,** each material field with its before and
  after, so the line is written against the change rather than from memory.
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

- **Where does the log live?** `trip_history` already records every change with
  its actor and moment and the scheduler already writes it, so a `note_added`
  action would need only its `action` check widened — no new table, and the
  entries sit in the list rux-ui already shows. Against that: a customer-facing
  thread mixed into a field-diff audit is read by neither well. The alternative
  is a `trip_updates` table of its own.
- **What is material, exactly?** The list above is a first cut. Times and the
  route are the doubtful ones: an itinerary changed 204 times and said nothing
  166 of them, which is either the worst gap here or proof that a route edit is
  routine and a prompt on it would be noise.
- **What happens to the notes already written?** 177 dated lines could be
  parsed into first entries of the log, or left in `notes` to age out. Parsing
  invents an author for every one of them.
- **Does the escape hatch stay?** It can be counted once the log exists; if one
  person presses it on nine saves in ten, the answer is a conversation, not a
  stricter dialog.
- **Does rux-ui prompt too, or only display?** A prompt in one app and not the
  other teaches which app to use to avoid the question.
- **Is the note ever shown to the customer?** It changes the wording of every
  chip if a line can leave the office.

## Tasks

- [ ] Move the breadcrumb off the 290 trips: one `trip_history` entry each,
  `updated` with the reference before and after and the source key in the
  metadata, then blank `notes`. SQL shown to rux, applied as its own migration.
- [ ] Answer the first question, and write the migration the answer needs.
- [ ] Add the update log to the scheduler's panel: the lines newest first, the
  stamp rendered from the row, and a box to add one without saving the trip.
- [ ] Add the prompt to Save, over the material fields the second question
  settles, with the changes named, the quick reasons, the box and the recorded
  decline.
- [ ] Show the newest line on the bar's note row, and keep the standing facts
  reachable in the panel.
- [ ] Add the stale mark to the bar's warning chips.
- [ ] Make rux-ui read the log, and decide there whether it prompts.
