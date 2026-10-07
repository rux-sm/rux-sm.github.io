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
"the current insurance certificate for this school" with the same link.

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
  finds its certificate under the same name its trips use.
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

- Is everyone a certificate is issued to already in the Customers list? If
  not, should the page let you type a name that is not a customer?
- The background check form sometimes needs a trip's date and location. Is
  that typed into the file by hand and uploaded again, or should the scheduler
  fill it from the trip and print it, as it prints the other forms?
- What is the background check file: a PDF with boxes to type in, a Word
  file, or a scan?

## Tasks

- [ ] Write the table, bucket and access rules as SQL, show it to rux, and
      apply it on a yes.
- [ ] Build the Documents page: search, kind filter, "Show old", open, upload,
      replace, delete and the end-date marks.
- [ ] List a customer's documents on its page in `customers.html`.
- [ ] Add `find_documents` to the connector and deploy it.
- [ ] Describe the table, bucket, page and tool in the scheduler's database
      and screen inventories and in `working-from-claude.md`.
- [ ] Check it in Chrome on :8641 with an invented test file: upload, search,
      open, replace, delete; then ask the Claude app for it.
- [ ] Upload the current documents, reading each one's end date from the file.
