---
type: plan
---

# Plan: History for drivers, buses and customers

## Goal

The History page also shows what changed on a driver, a bus or a customer
and who changed it, beside the trip changes it shows now.

## Decisions

- **The database records the change itself,** with a trigger on each table,
  because both apps write these tables from more than twenty places and the
  old trips app cannot be safely changed to report each one.
- **One new table, `record_history`,** holds every entry: the kind of
  record, its id and name, the account and the name of who changed it, whether
  it was created, updated or deleted, and each field's before and after. Like
  `trip_history` it has no rule and no grant, so only functions reach it.
- **Who is the signed-in account,** named from its profile when the entry is
  written. A change made with no log-in, such as one applied through the
  Supabase connection, is named System.
- **An update records only the fields that changed.** A created or deleted
  record is one line with its name. Nothing is recorded when the only change
  is the order of a list, a photo, or a time the database stamps itself.
- **A driver's time off and a bus's days out are recorded on the driver and
  the bus,** as a line added or removed, since that is where the office
  edits them.
- **A link to another record is saved as its name:** a customer's usual
  pickup as the location's name, not its id.
- **The values are kept as they are,** a licence number and a date of birth
  included, because every staff member already reads them on the Drivers
  page.
- **The History page stays one list,** with a third choice beside Person and
  When: Everything, Trips, Drivers, Buses and Customers. Everything is where
  it opens.
- **One read for the page, `search_history`,** returns trip entries and
  record entries together, newest first. It replaces `search_trip_history`,
  and `history_people` replaces `trip_history_people`; the two replaced
  functions are dropped, since only this page calls them.
- **A row opens the record's own page,** `drivers.html?id=`, `fleet.html?id=`
  or `customers.html?id=`. A deleted record's row opens nothing.
- **Each record page gets a History button** that opens the History page on
  that one record, as the bar menu does for a trip.
- **The page turns a column's name into the office's words,** such as
  `license_exp` into Licence expires. A column with no word yet shows its own
  name, so a column added later is never hidden.
- **History starts when the trigger is switched on.** Nothing that changed
  before then can be shown.
- **Not built here:** undoing a change, bringing back a deleted record, and
  history for the office's settings, such as the vehicle types and the quote
  rates.

## Questions

- **Contacts and locations too?** The same trigger covers them at no extra
  cost, and the page would gain two more choices. Recommended: yes.

## Tasks

- [ ] Write the SQL for `record_history`, the trigger function and its
      triggers, `search_history` and `history_people`, and the drop of the
      two replaced functions. Try it offline against a copy of the tables'
      shape, show it to rux and apply it on a yes as one named migration.
- [ ] Confirm the grants afterwards by `docs/database-access.md`'s check:
      `anon` can run neither function and reads nothing from the table.
- [ ] Move `history.js` to `search_history` and `history_people`, add the
      third choice, the record rows and their links, and the words for each
      column.
- [ ] Add the History button to the driver, bus and customer pages.
- [ ] Update `scheduler/docs/screen-inventory.md` and
      `scheduler/docs/database-inventory.md` in the same commits.
- [ ] Check it in Chrome on :8641: trip entries read as before, each choice
      alone and with Person and When, Show older across both kinds of entry,
      and the page at phone width. The report says that only a real save of
      a driver, a bus or a customer can prove the trigger on production.
