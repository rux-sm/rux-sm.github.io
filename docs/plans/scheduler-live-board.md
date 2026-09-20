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

- **A face, not a name.** Staff profiles already carry a photo and a colour, and
  the header already draws them; the board reuses that rather than inventing a
  mark. A crew member on a bar is a coloured glyph and a name, so a photo does
  not read as another driver.

- **Coming back to the tab always refreshes.** The connection drops whenever
  the Mac sleeps, so the board reads again when it is looked at, whether or not
  the socket survived. This is the floor; the socket is what makes it live.

## Questions

- **What happens when the trip editor is open with unsaved edits?** Redrawing
  the board underneath is safe, but if the open trip is the one that changed,
  its form is now stale. Hold the refresh until the editor closes, refresh the
  board but leave the form alone, or say so and offer a button?

- **Does someone else's change announce itself?** The board could redraw
  quietly, or a notice could say what moved. Quiet is calmer; a notice explains
  why a bar just moved on its own.

- **Open, or selected too?** Opening a trip is deliberate and worth showing.
  Selecting a bar happens constantly while reading the week, so broadcasting it
  would set faces flickering across the board all day. Show only the trips
  somebody has open, or show selection as something quieter?

- **Where does the face go on a bar?** The bar already carries a destination,
  a client, a contact, times, a note, its warnings and its crew, and the
  compact board shrinks all of that to a code. Beside the crew, in a corner of
  its own, or only on the bar's menu and the editor's head?

- **Which pages?** The week board is the ask. The drivers page and the
  maintenance schedule read the same tables and have the same problem.

## Tasks

- [ ] Show rux the SQL that adds `trip_drivers`, `drivers`, `driver_time_off`,
      `bus_out_of_service` and `settings` to the database's live list, and
      apply it as a named migration on a yes.

- [ ] Subscribe the board to those tables and the seven already broadcasting,
      gather a burst into one read, and only while the tab is being looked at.

- [ ] Read the week again when the tab is returned to, whether or not the
      socket lived, and make that the path everything else falls back to.

- [ ] Answer the open-editor question above in code, and leave the reason in a
      comment beside it.

- [ ] Check a change made in the old trips app appears on the board without a
      reload: a trip moved to another bus, a driver's status changed, a bus put
      out of service.

- [ ] Check the board does not read twice for one of rux's own saves, and that
      a save's own toast still says what it says now.

- [ ] Say in the trip editor who else has that trip open, from the same
      connection, with their photo and name.

- [ ] Put the same face on the trip's bar, once the two questions above are
      answered.

- [ ] Check two accounts at once: the face appears when the second opens the
      trip, and goes when that tab is closed, when it sleeps and when the
      network drops.

- [ ] Check what happens when the Mac sleeps and wakes, and when the network
      drops and returns.
