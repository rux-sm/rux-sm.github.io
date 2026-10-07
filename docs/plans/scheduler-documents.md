---
type: plan
---

# Plan: company documents in the scheduler

## Goal

The office's own paperwork, such as insurance certificates, the W-9 and each
driver's yearly background check form for a school district, is kept in the
scheduler. Typing part of a name, like a school or a driver, narrows the list
to that one's documents, and a customer's own page lists the same ones. A
click opens a document to view, download or print, and the Claude app answers
"the current insurance certificate for this school" with the same link. A trip
for a customer that asks for background check forms lists each of its
drivers' forms among its own forms, and warns about a driver who has none.

## Decisions

- **A document is a file plus five facts:** its kind, who it is issued to, the
  driver it is about, the date it ends, and a note. "Issued to" is blank for a
  general document, like the W-9 or the plain insurance certificate, and the
  driver is blank on everything but a background check form.
- **The kinds start as insurance certificate, W-9 and driver background
  check,** and a new kind is typed on upload and offered from then on.
- **The driver is picked from the Drivers list,** so a background check form
  is found under the driver's name.
- **"Issued to" is picked from the Customers list,** so a search for a school
  finds its certificate under the same name its trips use. A holder not in the
  list is added on the Customers page first.
- **A background check form is a PDF, uploaded once a year for each driver.**
  Only its campus and trip date differ from one trip to the next.
- **A customer's page has a switch, Background check form required,** stored
  in a new column on `customers`, applied with the same migration.
- **A trip for such a customer lists a Background check row for each driver
  on the leg in its Forms list,** opening that driver's current form. A driver
  with no form, or one past its end date on the trip's day, has a warning in
  the row's place.
- **The trip's checklist gains Background check forms under Paperwork,** open
  while any driver on the leg lacks a current form, and naming who.
- **Search matches every word you type** against the kind, who it is issued
  to, the driver, the file name and the note, so "memorial insurance" narrows
  to one row.
- **A customer's page lists the documents issued to it,** each opening the
  same way, under a link to the Documents page narrowed to that customer.
- **Only the current copy shows by default.** A new upload of the same kind
  for the same holder and driver makes the old one "old": it is kept, hidden
  behind a "Show old" switch, and never offered by the Claude app.
- **An end date shows as a mark:** red once it has passed, amber within 30
  days.
- **Opening a document gives a link that lasts 10 minutes,** the same as trip
  files. The browser's own viewer shows the file, with its download and print
  buttons. Every staff account can open one; no link is ever meant for a
  customer, who gets the file as an email attachment.
- **The files live in a new private bucket, `company-documents`,** and the
  facts in a new table, `company_documents`, both staff only, with nothing
  granted to anon. The table and bucket are SQL shown to rux and applied on a
  yes, as a named migration.
- **The page is `documents.html` in the scheduler's side menu,** started from
  a Design template; anything Design lacks is added there with invented
  content.
- **The Claude app gets one more read tool, `find_documents`,** which searches
  the same way and answers with each match's dates and a 10-minute link. It
  cannot upload, replace or delete.
- **A document is deleted only from the page,** after a confirm, for a wrong
  upload; replacing is how a document ages out.
- **rux-ui does not change.**

## Questions

- Is the school district one customer in the list, or is each campus its own
  customer? The switch and the forms hang on whichever it is.
- Should the scheduler write the campus and trip date onto the PDF? One of
  the forms has to be read first, to see whether those are boxes it can fill.
- Is the form printed for the driver to carry, or emailed to the district
  before the trip?

## Tasks

- [ ] Read one background check PDF, kept outside this repository, and say
      whether its campus and date can be filled.
- [ ] Write the table, bucket, the `customers` column and access rules as SQL,
      show it to rux, and apply it on a yes.
- [ ] Build the Documents page: search, kind filter, "Show old", open, upload,
      replace, delete and the end-date marks.
- [ ] List a customer's documents on its page in `customers.html`, with the
      Background check form required switch.
- [ ] Add the Background check rows to a trip's Forms list and the item to
      `scheduler/checklist.js`, with its cases in
      `scheduler/tools/check-checklist.mjs`.
- [ ] Add `find_documents` to the connector and deploy it.
- [ ] Describe the table, bucket, page and tool in the scheduler's database
      and screen inventories and in `working-from-claude.md`.
- [ ] Check it in Chrome on :8641 with an invented test file: upload, search,
      open, replace, delete; then ask the Claude app for it.
- [ ] Upload the current documents, reading each one's end date from the file.
