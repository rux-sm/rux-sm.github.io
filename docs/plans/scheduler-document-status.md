---
type: plan
---

# Plan: say what is ending on each document

## Goal

A document's row on the Documents page says, under its kind, whether it is
in force: Up to date, a part ending soon, or a part that has ended, as
Workers' comp expired. A certificate covers several policies that end on
different days, so each policy's end date is kept, and the line names the
one that needs a new copy.

What is built is in `scheduler/docs/screen-inventory.md`, under Documents and
Customer page, and `scheduler/docs/database-inventory.md`.

## Decisions

- **A kind names its parts,** in a new `document_kinds.parts`, a list of
  names. Insurance certificate has four: General liability, Auto, Umbrella
  and Workers' comp. Physical damage is left out, because it is on the auto
  policy and ends with it. Every other kind has none and keeps one Ends date.
- **The parts are set in the database, and the Kinds window does not edit
  them,** since only certificates have any.
- **A document keeps each part's end date,** in a new
  `company_documents.parts`, a list of a name and a day for each. A part left
  empty is one the document does not cover.
- **`ends_on` stays, and a trigger sets it to the earliest part's day,** so
  the Ends column, the customer's Documents tab, a trip's driver forms in
  `leg-facts.js` and the connector's `find_documents` keep reading one date
  and need no change.
- **For a kind with parts, the form asks one date for each part, labelled
  with its name,** in place of the one Ends field. Upload with several files
  gives every file the same dates, as Ends does now.
- **The line under the kind is the status, worked out from the dates:**
  - **Up to date,** in the quiet colour, when nothing ends within 30 days.
  - **Workers' comp ends Nov 2,** with the warning mark, within 30 days,
    the same 30 days Ends warns at now.
  - **Workers' comp expired,** with the error mark, once its day is past.
  - Two parts in the same state are named together, as Auto and workers'
    comp expired. A kind with no parts says Ends Nov 2 or Expired. A
    document with no end date, such as the W-9, says nothing.
- **The note follows the status on the same line,** after a dot, and the
  file name no longer shows there; it is on the document's own page.
- **The Ends column shows the earliest date alone,** because its warning and
  error marks move to the line.
- **The customer's Documents tab shows the same status words** in place of
  its Ends and Ended dates.
- **The 170 certificates on file get their parts from what is known now:**
  the 166 whose note says Workers' comp shown to 09/20/2026 get that day for
  Workers' comp and their Ends day for the other three, and their note is
  cleared. The four with no note are read from their files.
- **The change is SQL shown to rux and applied on his yes,** as a named
  migration, after it runs in PGlite in the scratchpad first.

## Questions

- Should the page read the dates out of an uploaded certificate, so nobody
  types them? Every certificate on file is the same insurance form, so it
  could, but it is a step of its own after this one.
- Once the dates are in, 166 certificates will show Workers' comp expired in
  red. Is that what the list should show until new copies come, or should
  expired rows sort to the top?

## Tasks

- [ ] Write the migration: the two `parts` columns, the trigger that sets
      `ends_on`, the four part names on Insurance certificate, and the
      backfill of the 166; run it in PGlite, then show it to rux.
- [ ] Read the four certificates with no note and set their parts.
- [ ] Ask a date for each part on the Documents form for a kind with parts,
      and save them, in `scheduler/documents.js`.
- [ ] Draw the status line and the plain Ends column on the Documents page.
- [ ] Show the status words on the customer's Documents tab in
      `scheduler/customers.js`.
- [ ] Put the status rule where a tool in `scheduler/tools/` runs it against
      sample documents in the check: up to date, ending soon, expired, two
      parts at once, no parts, and no end date.
- [ ] Write the parts into `scheduler/docs/database-inventory.md` and the
      status line into `scheduler/docs/screen-inventory.md`.
- [ ] Check in Chrome on :8641: the list, a certificate's form, saving a new
      copy with its dates, and a customer's Documents tab.
