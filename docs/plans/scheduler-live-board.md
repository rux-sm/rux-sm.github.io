---
type: plan
---

# Plan: the board shows what has changed without a reload

## Goal

A schedule left open shows what anyone else has done to it — a trip moved to
another bus, a trip's details edited, a driver's status or priority changed, a
bus taken out of service, someone booked off. The old trips app writes the same
tables, so its edits appear too. Nothing on screen jumps while it is being
worked on. A trip somebody else has open says so, with their face on it, so
two people do not spend ten minutes editing the same trip before one finds out.

## Decisions

- **A change re-reads the week; it does not patch a bar.** The board already
  has one path that reads a week and draws it, and reusing it means the live
  board and a reloaded board can never disagree.

- **Patching could not cover deletes anyway.** Every one of these tables
  reports a delete as the row's id and nothing else, so a bar that vanished
  could not be found without reading the week again.

- **One subscription for the whole board, not one per table.** Any change to
  any of the tables the week is drawn from means the same thing: read it again.

- **A burst counts once.** Saving a trip writes several tables, so the changes
  are gathered for a moment and answered with a single read.

- **Six tables have to be added to the database's live list.** Trips, their bus
  assignments, stops, payments, POs, invoices and the buses themselves already
  broadcast. `trip_drivers`, `drivers`, `driver_time_off`, `bus_out_of_service`
  and `settings` do not, and `trip_drivers` is the crew on the bar — the thing
  most often asked for. This is a production change, shown as SQL and applied
  on a yes.

- **Contacts stay off the list.** A booking contact's name and phone sit on
  every bar, and a contact is edited far less often than it is read; keeping
  the one table of customers' personal details out of a broadcast costs a stale
  phone number until the next refresh.

- **Live updates cannot widen what anyone sees.** The database sends a
  subscriber only the rows its account may already read, and every one of these
  tables has that switched on.

- **Nobody is locked out of a trip.** A save already re-reads the trip and
  asks before replacing an edit made since the editor opened, so no work can be
  lost without being offered. A lock would add stuck trips after a closed
  laptop, and the old trips app would walk straight past it.

- **Presence is not stored anywhere.** Who has a trip open lives on the
  connection: it appears when the editor opens and is gone when the tab closes
  or the Mac sleeps, so there is no row to leave behind and nothing to clear up.

- **The channel is private, and the database says who may join it.** A public
  channel is joinable by anyone holding the publishable key, which is in the
  page, so staff names, photos, accounts and the trip each has open would be
  readable and forgeable from outside. A rule on `realtime.messages` for
  `is_staff()` is what closes it; without the rule nobody joins and no face is
  drawn, which is the safe way to fail.

- **Open is more, not different.** A trip somebody has merely selected wears
  the square alone; one they have open wears the square and the rule round the
  whole bar. One colour, no second style to learn, and the state that matters --
  somebody is in there and might save over you -- is the louder of the two
  rather than another shade of it. Fading the lesser state dulled the photo
  inside its square with it, and a dashed rule is already what a leg of the trip
  in your own editor wears.

- **Only a settled selection is broadcast, and only once.** A click on the way
  past does not flash across everyone's board, and deselecting waits with it, so
  running along a row is one message rather than two for every bar passed. The
  server takes only so many a second and drops the rest, saying so in what it
  answers rather than failing; a burst used to spend the allowance and every
  message after it was lost, which is why the square stopped appearing until the
  page was reloaded. Nothing is said twice, and anything that did not land is
  said again once the burst is over. Opening a trip is deliberate and said at
  once.

- **A square within a square, drawn with one line.** The bar somebody is in is
  ruled; the square in its top right corner carries that same rule through its
  own top and right edges rather than sitting beside them, which left a hairline
  of bar between the two, and its bottom and left are drawn to match. The corner
  they share takes the bar's own curve. The square covers the reference and the
  marks that corner carries, which is rux's call: knowing somebody else is in a
  trip is worth more than "1 of 2". A narrow bar takes Carbon's smaller avatar
  rather than none, because opening the editor squeezes the board and one fixed
  size emptied the whole week the moment a trip was opened beside it; only where
  even the small one would take half the bar is nothing drawn, which costs a
  merely selected trip its mark and an open one nothing, the rule being the
  open one's anyway.

- **A face, not a name.** Staff profiles already carry a photo and a colour, and
  the header already draws them; the board reuses that rather than inventing a
  mark. A crew member on a bar is a coloured glyph and a name, so a photo does
  not read as another driver.

- **An open editor with unsaved work holds the read until it is closed.** The
  board redrawing under a form is not dangerous, but the form would be showing
  a trip as it no longer is. The panel's own `hidden` says the editor is open,
  because `editing` keeps the last trip it held after the panel closes.

- **A change made by somebody else says nothing.** The board redraws and that
  is all; a notice on every save anyone makes would be noise on a busy day.

- **The week board only.** The drivers page and the maintenance schedule read
  the same tables and have the same problem, but neither was asked for.

- **Coming back to the tab always refreshes, and opens what died.** The
  connection drops whenever the Mac sleeps, so the board reads again when it is
  looked at, whether or not the socket survived. This is the floor; the socket
  is what makes it live. A channel that did not survive is thrown out and a new
  one opened, because the library refuses to join the same channel twice, and
  this tab says again which trip it is on -- a presence lives on the connection,
  so the server may have timed it out while the tab was away.

## Questions

## Tasks

- [ ] Check the board does not read twice for one of rux's own saves, and that
      a save's own toast still says what it says now.

- [ ] Check two accounts at once: the face appears when the second opens the
      trip, and goes when that tab is closed, when it sleeps and when the
      network drops.

- [ ] Check what happens when the Mac sleeps and wakes, and when the network
      drops and returns.
