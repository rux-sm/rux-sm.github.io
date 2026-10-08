---
type: plan
---

# Plan: finish company documents and the customer profile

## Goal

A driver's background check form opens from a trip with the campus and the
trip date already written in, the Claude app finds a company document, the
office's real documents are in the Documents page, and every trip still to
come is linked to its customer, so it asks for that customer's driver forms
and shows on the customer's Trips tab.

What is built is in `scheduler/docs/screen-inventory.md`, under Documents and
Customer page, and `scheduler/docs/database-inventory.md`.

## Decisions

- **Opened from a trip, a background check form has the campus and the trip
  date written into their fields,** on a copy; the stored file never changes.
  The campus is the trip's customer's name.
- **The trip's Forms list already hands the trip over:** a driver form's row
  opens `documents.html?open=<document id>&trip=<trip id>`, and `documents.js`
  reads only `open` so far.
- **The site has no PDF library.** Writing on a PDF needs one, loaded as the
  pages load supabase-js, from jsdelivr at a pinned version with its hash.
- **The form is a PDF, uploaded once a year for each driver,** and printed
  for the driver to carry.
- **A session cannot deploy the connector.** It copies
  `scheduler/connector/index.ts` to
  `supabase/functions/scheduler-connector/index.ts` under a scratch folder and
  hands rux `supabase functions deploy scheduler-connector --project-ref
  udnmqhayzhrbltxzzhjw --no-verify-jwt --use-api`, run from that folder.
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
- **rux-ui does not change.**

## Questions

- Which background check PDF may a session read, by its file name in
  Downloads?
- 182 names on 389 trips match no customer, 29 of them on 49 trips still to
  come: the same place spelled several ways, or a group after its name. Which
  customer does each coming name belong to?
- The office's binder spine and binder cover are two tabs of a Google Sheet
  rux owns, beside its DOT forms, fuel card log, pre-trip checklist and
  monthly vehicle inspection. Should any of them become forms the scheduler
  prints, and which?
- Should History record a change to the driver forms a customer asks for? It
  records the customer's own row only.

## Tasks

- [ ] Deploy the connector, whose source has `find_documents`, then call
      `find_documents` through the Scheduler connector and open the link it
      answers with.
- [ ] Read the background check PDF rux names, and decide how its campus and
      date are written: into its own boxes, or as text placed on the page.
- [ ] Write the campus and the trip date onto the form's copy in
      `documents.js` when `open` comes with `trip`, and show the copy in the
      browser's viewer.
- [ ] Check the filled copy in Chrome on :8641 with an invented PDF shaped
      like the real one.
- [ ] Check on a real trip in Chrome on :8641, for a customer that asks for
      a driver form: the checklist's Driver forms printed item, the
      Departures line under each driver, and the Printed tick, read back
      from `trip_drivers.driver_forms_printed`.
- [ ] Check the Documents page at an iPhone's width, 402 by 812, where Show
      old and Kinds are hidden and the search and Upload share the band.
- [ ] Upload the office's current documents from the files rux names, each
      with its kind, holder and the end date read from the file.
- [ ] List the names on trips still to come that match no customer, and link
      those trips by SQL shown to rux, once each name has its customer.
