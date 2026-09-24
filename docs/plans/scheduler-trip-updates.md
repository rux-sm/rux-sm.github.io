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
the notes, the dated status lines average 21 characters and the rest are
standing facts about the trip. No note in the table contains a newline.

## Decisions

- **They are called Updates.** The table is `trip_updates`, a trip has many,
  and the newest is its status.
- **An update is what was said to or heard from the customer.** A follow-up
  sent, a quote signed, a PO received, a date the customer moved.
- **The prompt fires on a customer-facing change only:** the dates, the times,
  the route, the destination, the customer and booking contact, the quoted
  price and quote lines, confirmed, the contract, a PO, an invoice, a payment
  and a cancellation. The buses, the drivers, their statuses and the bar's
  colour ask nothing, because they are the office's own arrangements.
- **The prompt's box comes filled with a line naming the change,** such as
  "Added PO 4512", which the person keeps or rewrites, and quick reasons,
  such as "Follow-up email sent", spell the common ones one way.
- **The app writes the stamp,** the moment and the person, and no one types
  it.
- **The prompt can be skipped.** Its No update button saves the trip and adds
  nothing to the list, and the bar's icon keeps its age from the last real
  update, so a skipped prompt never makes a trip look freshly followed up.
- **Standing facts stay in Notes,** undated and never prompted: a gate code, a
  shuttle, which driver runs which route.
- **The bar's notes row goes;** that row holds the pending and requirement
  icons. The bar carries a small speech-bubble icon instead.
- **The icon says who needs a follow-up.** A trip is waiting on the customer
  while it is not confirmed, its PO or deposit is pending, its itinerary is
  missing, or its balance is unpaid near departure. Once the newest update on
  such a trip is older than the follow-up wait, its icon asks; a trip waiting
  on nothing never asks, however old its updates.
- **The follow-up wait is the office's setting,** a `follow-up-v1` settings
  row edited from the Trips page as Vehicle types is from Fleet, starting at
  3 days.
- **A reminder can be dismissed, and comes back** after the setting's
  snooze, starting at a day, until a real update is written. Dismissing is
  each person's own, kept in their browser, so one person's dismissal never
  hides a trip from another.
- **The Trips page's Show choice gains Needs follow-up,** with its count, the
  longest waiting first.
- **Hovering over a bar opens a chat-style bubble:** the latest updates,
  newest first, each with who and when, standing notes pinned at the top,
  scrolling rather than cut short. On a phone, tapping a bar shows it above
  the docked shortcut bar.
- **The editor lists every update** with a box to add one without changing
  anything else.
- **The log is a `trip_updates` table of its own,** staff only, with the 203
  dated lines already in `notes` copied in as `imported` entries with no
  author; those notes are blanked once both apps read the log.
- **Both apps prompt,** because a prompt in one app teaches people to save
  from the other.
- **The log is for the office only,** so its lines stay short and internal.

## Questions

None open.

## Tasks

- [ ] Redo `scheduler/updates-specimen.html` with the bar's icon, a trip
  asking for a follow-up and the hover bubble, on invented trips, for rux to
  see first.
- [ ] Add the Updates list to the editor, newest first, with a box to add one
  without saving the trip.
- [ ] Add the prompt to Save over the customer-facing changes, with the line
  filled in, the quick reasons and No update.
- [ ] Replace the bar's notes row with the icon row and the update icon, and
  add the hover and tap bubble with Dismiss.
- [ ] Write the `follow-up-v1` row, its dialog on the Trips page, and the
  Needs follow-up choice there.
- [ ] Make rux-ui read the log and prompt on its own saves.
- [ ] Blank the 203 dated notes the log copied, where a note is still the
  text it copied, once both apps read the log. SQL shown to rux.
