---
type: plan
---

# Plan: finish company documents and the customer profile

## Goal

The Claude app finds a company document, the office's real documents are in
the Documents page, and every trip still to come is linked to its customer,
so it asks for that customer's driver forms and shows on the customer's Trips
tab. The background check form is `scheduler-driver-forms.md`'s.

What is built is in `scheduler/docs/screen-inventory.md`, under Documents and
Customer page, and `scheduler/docs/database-inventory.md`.

## Decisions

- **This plan waits on `scheduler-trip-shapes.md`,** which is built first.
- **A session deploys the connector from rux's Terminal panel, on rux's yes,**
  because the Supabase CLI is signed in there and not in the session's own
  shell. It copies the three files in `scheduler/connector/` to
  `supabase/functions/scheduler-connector/` under a scratch folder and runs
  `supabase functions deploy scheduler-connector --project-ref
  udnmqhayzhrbltxzzhjw --no-verify-jwt --use-api --workdir <that folder>`.
- **A trip is its customer's when `trips.customer_id` links it.** A trip
  saved before customers were linked has only the customer's name; those
  whose name was exactly a customer's are linked, and any other links when it
  is saved with a customer picked.
- **An unlinked trip asks for no driver form and is off its customer's Trips
  tab and money,** so the trips still to come are linked first.
- **A group inside a customer is not part of its name,** as
  `scheduler-customers-and-locations.md` decided, so a name with a team or a
  grade after it links to the campus and does not become a customer.
- **A document's real content never enters this repository,** which is
  public: a form is read where rux keeps it, and a check uses an invented
  file.

## Questions

- 181 names on 382 trips match no customer, 24 of them on 37 trips still to
  come: the same place spelled several ways, or a group after its name. Which
  customer does each coming name belong to?
- A Google Sheet rux owns holds DOT forms, a fuel card log, a pre-trip
  checklist and a monthly vehicle inspection. Should any of them become a
  form the scheduler prints, as the binder covers and spines are?
- Should History record a change to the driver forms a customer asks for? It
  records the customer's own row only.

## Tasks

- [ ] Deploy the connector, whose source answers `find_documents` with each
      document's holder and finds a district's documents by a school's name,
      then call `find_documents` through the Scheduler connector with a
      school's name and open the link it answers with.
- [ ] Check on a real trip in Chrome on :8641, for a customer that asks for
      a driver form: the Departures line under each driver, and the Printed
      tick, read back from `trip_drivers.driver_forms_printed`.
- [ ] List the names on trips still to come that match no customer, and link
      those trips by SQL shown to rux, once each name has its customer.
