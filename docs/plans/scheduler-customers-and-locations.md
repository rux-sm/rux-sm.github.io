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
- **The yard stays a setting.** It is one place with its own row, and nothing
  links to it.
- **A trip keeps its own copy of every stop,** as `trip_stops` does today, so
  editing or deleting a location never changes a trip already saved.
- **The old text columns keep being written.** `contacts.client` and
  `trips.customer` take the customer's name on every save, so rux-ui goes on
  showing it. A name rux-ui types there later changes only the text, not the
  link.
- **The trip editor's Organization field becomes Customer,** a combo box over
  the customers as the Contacts page has, and writes `trips.customer_id` beside
  the name, which is what the quote's bill-to reads. A name that is not a
  customer yet makes one on Save, as a new contact is made today, so booking a
  new customer takes no detour.
- **Three fills, each only into an empty field:** picking the booking contact
  fills the customer; picking the customer fills the pickup and the drop-off
  from its usual pickup, with the drive time looked up; saving the trip gives a
  booking contact with no customer the trip's one, as it fills a missing phone.
- **The Route tab's address search offers saved locations first,** by name or
  address, then the map search, as rux-ui's itinerary does. It moves onto `scheduler/places.js`,
  which the Locations page already uses, so the two searches are one.
- **Nothing joins a list unless someone says so.** After a trip saves, one
  modal, Update your lists, offers what the edit brought that the lists do not
  have, and shows nothing when there is none. Not now adds none of it, and the
  trip is saved either way. An offer declined is not made again until the
  field is typed again. Three kinds of row:
  - **A new contact**, ticked, with the name, phone and email to correct.
    Declined, the trip keeps the typed name and phone and links no contact,
    as 457 trips already do. A person the trip editor's rule matches by phone,
    email or name is not new and links at once, as today.
  - **A contact's missing phone or email**, ticked. This replaces the silent
    fill `scheduler/data.js` makes on Save today.
  - **A contact's different phone or email**, beside the one on file and not
    ticked, since a different number is often one for that day. A contact
    matched by the name alone is offered too, with their details shown, since
    a person now decides.
  - **A new location**: a stop picked or changed in the edit that no location
    has by its map id or address, ticked, with the name and the address search
    to correct. Saving every stop unasked, as rux-ui does, fills the list with
    one-off stops.
- **Old trips are not linked in bulk.** Opening an unlinked trip preselects the
  customer whose name matches its typed one exactly, and Save keeps it.
- **A customer or location is deleted only when nothing uses it:** no contact
  or trip for a customer, no customer for a location.
- **Locations and customers are tables that carry `updated_at`,** set by the
  database, and Save compares it rather than the whole row, as `contacts` and
  `buses` cannot. Both are staff-only. `contacts.customer_id` and
  `trips.customer_id` link to a customer, and 204 contacts were linked from
  their organization names as rux settled them.
- **A usual pickup was filled only where one saved place had the customer's
  name,** 10 of the 119; the rest are picked on the Customers page, since a
  guessed link would put the wrong address on a quote.
## Questions

None open.

## Tasks

- [ ] The trip editor: the Customer field, the three fills, and saved
      locations first in the address search.
- [ ] The Update your lists modal, in place of the silent contact fill.
- [ ] rux picks the usual pickups the copy left blank.
- [ ] Delete the `locations-v1` settings row once both apps read the table.
