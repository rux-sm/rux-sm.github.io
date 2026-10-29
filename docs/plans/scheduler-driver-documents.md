---
type: plan
---

# Plan: a driver's documents on their profile

## Goal

Each driver's file is kept against the driver: the medical card, a copy of
the licence, the yearly driving record, the clearinghouse query, the road
test, the yearly review and the background check forms schools ask for. The
profile's Documents tab uploads them in place. The licence and medical card
end dates are read from the papers on file instead of being typed twice, and
any paper that has ended, or ends within 30 days, shows up before the office
puts that driver on a trip.

What is built is in `scheduler/docs/screen-inventory.md` and
`scheduler/docs/database-inventory.md`, under `drivers`, `document_kinds` and
`company_documents`.

## Decisions

- **A driver's document is a `company_documents` row with its `driver_id`,**
  of a kind marked `per_driver`, in bucket `company-documents`. That is how
  the background check form is already kept, so it needs no new table,
  bucket or policy.
- **The driver kinds are Medical card, Licence copy, Driving record (MVR),
  Clearinghouse query, Road test, Yearly review and Driver background
  check.** Medical card is the kind Driver medical long form renamed, so a
  customer that asks for the long form now asks for the card; the others are
  new.
- **A medical exam is kept as one file, the way it arrives:** the Medical
  Examiner's Certificate, which is the card and gives the end date, and the
  long-form Medical Examination Report behind it, sometimes with a sleep
  questionnaire.
- **The background check form stays a form for each school.** Which schools
  ask for it is the customer's `customer_required_kinds`, and the trip's
  Forms list asks for it already; this plan only uploads it from the profile.
- **The paper on file is the one home of its end date.** A trigger sets
  `drivers.med_card_expiry` from the current Medical card's `ends_on` and
  `drivers.license_exp` from the current Licence copy's, so the list, the
  popover, `clashes.js`, `leg-facts.js` and the connector keep reading the
  columns they read now. Either date can only be typed while no paper of
  its kind is on file, and then says it came from the paper.
- **A paper is ending soon from 30 days before its `ends_on`,** the
  `WARN_DAYS` that `document-status.js` and `drivers.js` already use. The
  licence and medical card warn on the driver list, Needs attention and a
  trip through the dates the papers set; every other paper warns on the
  driver's Documents tab.
- **A replaced copy of a driver kind is kept three years from its
  `replaced_at`, then deleted with its file,** as the federal driver file rule
  allows; the current copy never is. Storage refuses a delete from SQL, so it
  is an Edge Function on a nightly schedule, not a database job.
- **The upload stays on the Documents page,** which already takes the driver
  and kind from the link; the Documents tab lists every driver kind, a
  missing one linking to its upload, and a new paper saved from that link
  goes back to the tab.
- **A driver's medical papers are health records.** They stay staff only and
  never reach the driver link, a share page or a customer. The connector's
  `find_documents` finds them only by driver and kind, and never reads their
  pages.
- **No driver's name goes into this repository.** Uploading the real files
  is done in rux's Chrome, never committed.

## Questions

- None open.

## Tasks

- [ ] Write the nightly Edge Function that deletes a replaced driver paper
      and its file three years after `replaced_at`, and schedule it, before
      the first replaced copy reaches three years.
