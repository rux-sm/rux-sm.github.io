---
type: plan
---

# Plan: History for drivers, buses, customers, contacts and locations

## Goal

The History page also shows what changed on a driver, a bus, a customer, a
contact or a location and who changed it, beside the trip changes it shows
now.

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
- **A failure in the recording never stops a save.** It is a warning in the
  database's log, and the driver, bus or customer saves as before.
- **The History page stays one list,** with a third choice beside Person and
  When: All, Trips, Drivers, Buses, Customers, Contacts and Locations. All
  is where it opens.
- **One read for the page, `search_history`,** returns trip entries and
  record entries together, newest first, and `history_people` returns the
  names for the Person choice.
- **A row opens the record's own page,** such as `drivers.html?id=` or
  `fleet.html?id=`. A deleted record's row opens nothing.
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

None open.

## Tasks

- [ ] Read the first real entries on the History page after someone saves a
      driver, a bus or a customer, since only a real save proves the
      triggers on production.
