---
type: plan
---

# Plan: company documents in the scheduler

## Goal

The office's own paperwork, such as insurance certificates and the W-9, is
kept in the scheduler. Typing part of a name, like a school, narrows the list
to that school's certificate. A click opens it to view, download or print, and
the Claude app answers "the current insurance certificate for this school"
with the same link.

## Decisions

- **A document is a file plus four facts:** its kind, who it is issued to, the
  date it ends, and a note. "Issued to" is blank for a general document, like
  the W-9 or the plain insurance certificate.
- **"Issued to" is picked from the Customers list,** so a search for a school
  finds its certificate under the same name its trips use.
- **Search matches every word you type** against the kind, who it is issued
  to, the file name and the note, so "memorial insurance" narrows to one row.
- **Only the current copy shows by default.** A new upload of the same kind
  for the same holder makes the old one "old": it is kept, hidden behind a
  "Show old" switch, and never offered by the Claude app.
- **An end date shows as a mark:** red once it has passed, amber within 30
  days.
- **Opening a document gives a link that lasts 10 minutes,** the same as trip
  files. The browser's own viewer shows the file, with its download and print
  buttons. Only staff can open one; no link is ever meant for a customer, who
  gets the file as an email attachment.
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

- Which kinds do you keep besides the insurance certificate and the W-9? For
  example a business licence, operating authority or safety rating.
- Is everyone a certificate is issued to already in the Customers list? If
  not, should the page let you type a name that is not a customer?
- Should every staff account see these documents, or only you? A W-9 carries
  the company's tax number.

## Tasks

- [ ] Write the table, bucket and access rules as SQL, show it to rux, and
      apply it on a yes.
- [ ] Build the Documents page: search, kind filter, "Show old", open, upload,
      replace, delete and the end-date marks.
- [ ] Add `find_documents` to the connector and deploy it.
- [ ] Describe the table, bucket, page and tool in the scheduler's database
      and screen inventories and in `working-from-claude.md`.
- [ ] Check it in Chrome on :8641 with an invented test file: upload, search,
      open, replace, delete; then ask the Claude app for it.
- [ ] Upload the current documents, reading each one's end date from the file.
