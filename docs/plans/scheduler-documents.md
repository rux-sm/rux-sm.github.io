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
"the current insurance certificate for this school" with the same link. A
customer can ask for a kind of driver form, and a trip for that customer lists
each of its drivers' forms of that kind among its own forms, and warns about a
driver who has none.

## Decisions

- **A document is a file plus five facts:** its kind, who it is issued to, the
  driver it is about, the date it ends, and a note. "Issued to" is blank for a
  general document, like the W-9 or the plain insurance certificate, and the
  driver is blank on everything but a background check form.
- **The kinds are a list of their own, in the table `document_kinds`,**
  starting as insurance certificate, W-9 and driver background check. The
  Documents page adds and renames them, so a rename reaches every document
  and every customer that asks for the kind.
- **A kind is marked "one for each driver" or not.** A document of such a kind
  asks for its driver on upload, picked from the Drivers list, so it is found
  under the driver's name.
- **"Issued to" is picked from the Customers list,** so a search for a school
  finds its certificate under the same name its trips use. A holder not in the
  list is added on the Customers page first.
- **A background check form is a PDF, uploaded once a year for each driver.**
  Only its campus and trip date differ from one trip to the next.
- **A customer's page has Driver forms required,** a pick of the kinds marked
  one for each driver, none by default, stored in
  `customer_required_kinds`. This is the link between a customer and a form.
- **A trip for such a customer lists a row for each driver on the leg and
  each kind asked for in its Forms list,** opening that driver's current form
  of that kind, whoever it is issued to. A driver with no form, or one past
  its end date on the trip's day, has a warning in the row's place.
- **Opened from a trip, a background check form has the campus and the trip
  date written into their fields,** on a copy; the stored file never changes.
  The campus is the trip's customer's name.
- **The form is printed for the driver to carry,** and its row in the Forms
  list says Printed once it is, as an envelope's does.
- **The trip's checklist gains Driver forms under Paperwork,** open while any
  driver on the leg lacks a current form of a kind asked for or has one not
  yet printed, and naming who and which.
- **Search matches every word you type** against the kind, who it is issued
  to, the driver, the file name and the note, so "memorial insurance" narrows
  to one row.
- **A customer's page lists the documents issued to it on a Documents tab,**
  each opening the same way, under a link to the Documents page narrowed to
  that customer.
- **Only the current copy shows by default.** A new upload of the same kind
  for the same holder and driver makes the old one "old": it is kept, hidden
  behind a "Show old" switch, and never offered by the Claude app.
- **An end date shows as a mark:** red once it has passed, amber within 30
  days.
- **Opening a document gives a link that lasts 10 minutes,** the same as trip
  files. The browser's own viewer shows the file, with its download and print
  buttons. Every staff account can open one; no link is ever meant for a
  customer, who gets the file as an email attachment.
- **The files live in the private bucket `company-documents`,** and the
  facts in the table `company_documents`, both staff only, with nothing
  granted to anon.
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

None open.

## Tasks

- [ ] Read one background check PDF, kept outside this repository, and decide
      how its campus and date are written: into its own boxes, or as text
      placed on the page.
- [ ] Write the campus and trip date onto the form's copy when it is opened
      from a trip.
- [ ] Add the driver form rows to a trip's Forms list and the item to
      `scheduler/checklist.js`, with its cases in
      `scheduler/tools/check-checklist.mjs`.
- [ ] Add `find_documents` to the connector, deploy it, and describe it in
      the database inventory and `working-from-claude.md`.
- [ ] Check in Chrome on :8641 a trip's driver form rows and checklist item,
      then ask the Claude app for a document.
- [ ] Upload the current documents, reading each one's end date from the file.
