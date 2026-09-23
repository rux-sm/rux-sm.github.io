---
type: plan
---

# Plan: customers and locations in the scheduler

## Goal

A customer is a record with a usual pickup and a bill-to address, a location is
a record with a map point, and each fact is typed once. Picking a contact on a
trip fills the customer, the customer fills an empty pickup and drop-off, and
the quote prints the customer's address without anyone typing it.

## Decisions

- **Three lists, each with one job.** A contact is a person, a customer is who
  pays, and a location is a place a bus goes. Two of them in one record means
  one fact typed in several places, free to drift.
- **The chain is contact → customer → location.** A contact belongs to one
  customer; a customer points to its usual pickup, a location. No address is
  typed on a contact or a customer except the optional bill-to.
- **The word is Customer, the table `customers`.** It is the word staff and
  QuickBooks use, and it still fits a family with no school behind them.
- **A customer is a name, a usual pickup and an optional bill-to address.** The
  name is spelled as QuickBooks spells it, because an export matches on it. The
  bill-to is filled only when bills go somewhere other than the pickup, such as
  a district office or a PO box.
- **A group inside a customer is not part of its name.** "Band" or "7th grade"
  goes in the trip's notes, and rux cleans the names that carry one today.
- **One customer per contact, and a trip may name another.** The contact holds
  their usual customer; a trip records its own, so a contact booking for a
  second campus picks it on that trip. A contact in several customers at once
  is a list to keep up for a case a per-trip choice already covers.
- **A location is a name, an address and a map point,** found through the same
  address search the Route tab uses, so a pickup filled from it has its drive
  time at once. An address the search cannot place is not saved.
- **Locations become a table, `locations`.** Today they are one list inside
  rux-ui's `settings` row `locations-v1`, which a customer cannot link to
  reliably and two apps cannot write at once without losing each other's
  changes.
- **rux-ui switches to the table in the same step,** in its one module,
  `js/data/locations-db.js`, after reading its own `CLAUDE.md`. rux-ui adds a
  trip's stops to saved locations on every trip save, so a table only the
  scheduler wrote would miss them from the first day.
- **The copy can run twice.** It inserts a location only when no row has the
  same name and address, so it runs once before rux-ui switches and once after
  to catch anything added in between. The `settings` row is left as it is until
  both apps read the table, then deleted.
- **The yard stays a setting.** It is one place with its own row, and nothing
  links to it.
- **A trip keeps its own copy of every stop,** as `trip_stops` does today, so
  editing or deleting a location never changes a trip already saved.
- **Two new pages, each a page pair** as `docs/plans/site-page-pair.md` shapes
  them and on the `scheduler-pair-*` classes, as Contacts is:
  `customers.html` and `locations.html`, both in the side nav after Contacts.
- **The Customers list:** Customer (the name, with the bill-to or "Bills to the
  pickup" beneath), Usual pickup (the location's name, with its address
  beneath), Contacts (how many). The record has Details (name, usual pickup as
  Carbon's combo box over the locations, bill-to as a text area) and a Contacts
  tab listing its people, each opening their contact page.
- **The Locations list:** Location (the name, with the address beneath), Pickup
  for (how many customers use it). The record is Details alone: name, and the
  address search. A location with no customer on it can be deleted; one in use
  says which customers use it.
- **Neither page has a filter strip,** for the reason Contacts has none:
  neither has a status.
- **The Contacts page's Organization field becomes Customer,** a combo box over
  the customers, with the customer's name beneath the contact on the list.
- **The old text columns keep being written.** `contacts.client` and
  `trips.customer` take the customer's name on every save, so rux-ui goes on
  showing it. A name rux-ui types there later changes only the text, not the
  link.
- **The trip editor's Organization field becomes Customer,** the same combo
  box, and writes `trips.customer_id` beside the name. A name that is not a
  customer yet makes one on Save, as a new contact is made today, so booking a
  new customer takes no detour.
- **Three fills, each only into an empty field:** picking the booking contact
  fills the customer; picking the customer fills the pickup and the drop-off
  from its usual pickup, with the drive time looked up; saving the trip gives a
  booking contact with no customer the trip's one, as it fills a missing phone.
- **The Route tab's address search offers saved locations first,** by name or
  address, then the map search, as rux-ui's itinerary does.
- **The quote's Name/address box fills from the customer:** its name, then the
  bill-to if there is one, otherwise the usual pickup's address. The box stays
  editable, because a quote is corrected before it is sent. A trip with no
  customer linked prints the typed name, as today.
- **Customers come from the contacts' organization names,** 139 of them once
  case is set aside. rux settles the names spelled two ways from a list shown
  in chat before anything is copied; each contact then links to the customer
  its name became.
- **A usual pickup is filled only where the names match exactly,** 13 of the
  139; the rest are picked on the Customers page. A guessed link would put the
  wrong address on a quote.
- **Old trips are not linked in bulk.** Opening an unlinked trip preselects the
  customer whose name matches its typed one exactly, and Save keeps it.
- **A customer or location is deleted only when nothing uses it:** no contact
  or trip for a customer, no customer for a location.
- **The new tables carry `updated_at`,** set by the database, and Save compares
  it rather than the whole row, as `contacts` and `buses` cannot.
- **Database changes are named migrations shown to rux and applied on a yes:**
  the two tables, `customer_id` on `contacts` and `trips`, staff-only row
  security as every table has, and no grant to `anon`, revoked in the same
  migration. The links clear to nothing when their target is deleted.

## Questions

- rux-ui saves every named stop of a trip as a location. Should the scheduler
  do the same, or should a location be added only on the Locations page? The
  first is how the 141 were built without anyone thinking about it; the second
  keeps one-off stops out of the list.

## Tasks

- [ ] rux answers the question above and says go.
- [ ] rux settles the organization names spelled two ways, from a list shown
      in chat.
- [ ] Migration: the `locations` table, and the first copy of the 141.
- [ ] rux-ui's `js/data/locations-db.js` reads and writes the table; then the
      second copy.
- [ ] `scheduler/locations.html` and `scheduler/locations.js`.
- [ ] Migration: the `customers` table, `contacts.customer_id` and
      `trips.customer_id`, the customers and the contacts' links from the
      settled names, and the 13 exact usual pickups.
- [ ] `scheduler/customers.html` and `scheduler/customers.js`.
- [ ] The Contacts page's Customer field.
- [ ] The trip editor: the Customer field, the three fills, and saved
      locations first in the address search.
- [ ] The quote's Name/address box.
- [ ] The two links in the side nav of every scheduler page, and the screen
      inventory's Settings row, which still puts locations there.
- [ ] rux picks the usual pickups the copy left blank.
- [ ] Delete the `locations-v1` settings row once both apps read the table.
