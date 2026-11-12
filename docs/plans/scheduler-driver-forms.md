---
type: plan
---

# Plan: driver forms, filled in and signed on the phone

## Goal

Every form a driver must fill in and sign has a signed copy on that driver's
profile. The office sends a driver any form from the scheduler, the driver
signs it with a finger from the link the office already texts them, and the
signed PDF lands on their Documents tab without anyone printing, scanning or
typing it. The office chooses which forms are on which driver's link, and
sees for each form who has signed, who is waiting and what ends soon,
however many forms there are. The first forms are the Texas Education Agency's
Pre-employment or Pre-service Affidavit (TEC §22A.055) and the school
background check form; the next are added by setting them up, not by new
code.

## Decisions

- **A form is a row of `driver_forms`:** its title in English and Spanish,
  its version, the document kind its signed copy is filed as, the blank PDF in
  a staff-only bucket `driver-forms`, whether it is signed once or every
  year, and its fields. A form is never edited in place once signed: a new
  version is a new row, and it asks every driver to sign again.
- **A form is on a driver's link only while that driver is asked for it.**
  A row of `driver_form_asks`, the form and the driver, asks one driver; a
  form's `ask_everyone` asks every active driver, a driver added later
  included. A new form and a new driver start with nothing asked. While a
  form asks everyone, each driver's switch reads on and is not offered;
  turning Ask every driver off leaves every driver asked, one row each, so
  nothing leaves a link unseen.
- **A form not asked is nowhere on the driver's link,** signed or not: My
  documents does not list it, `share/sign.html` does not open it and the
  `driver-form` Edge Function refuses it, all through `driver_forms_for`,
  which hands back only the forms a driver is asked for. The signed copy
  stays on the driver's file. Sending a form asks for it.
- **The forms live before the switches keep a driver asked only where a
  send or a signing exists,** one row for each such pair, and none asks
  everyone.
- **A yearly form ends a year from its signing,** and the Documents page's
  30-day warning shows it before.
- **The office can send any form to any driver at any time,** signed or not;
  the new signing becomes the current copy, and the one before is kept as an
  old copy, as the Documents page keeps every replaced paper.
- **A field is one of five types:** Yes or No, a line of text, a box of text,
  a date, and a read-and-sign, which shows the form's own pages and asks only
  for the signature. A field can be required when another is answered a way,
  as the affidavit's facts box is when any Section 2 answer is Yes, and can
  flag the signing to the office on that answer. Each field names where on
  the PDF it is written.
- **A field can be filled in from the profile:** the driver's name, date of
  birth, address, licence and phone from `drivers`. The driver checks and
  corrects it; a correction is not written back to the profile.
- **Every question shows its Spanish translation under the English** when
  the driver's link is in Spanish, and the page's own words follow the link's
  language. The English is what is signed, and the signed PDF is the form as
  issued.
- **A new form is set up by a session with rux,** who names the PDF: the
  session reads it, writes the fields, their places and their Spanish,
  uploads the blank and adds the row by SQL shown to rux and applied on a
  yes, then signs it as an invented driver to check every field lands. A page
  for setting up forms waits until that is done often enough to be worth it.
- **The signed copy is a `company_documents` row with its `driver_id`,** of
  the form's kind, as `scheduler-driver-documents.md` keeps every driver
  paper, so a trip's Forms list and the checklist flag a driver without one
  as they already do.
- **The background check form is PSJA's vendor packet,** six pages: the
  request, TASB's criminal history request, DPS's CCH verification, the TB
  questionnaire, the confidentiality statement and a page for the licence
  copy, revised 6/2026. Its blank is rux's 2026-2027 template with the typed
  notes taken off, which leaves PSJA's pages as issued. It is yearly and filed
  as `PSJA background check`, the kind PSJA T-STEM requires, renamed from
  `Driver background check` so another district's packet can be its own form.
- **The company's own lines are the form's `fixed` fields:** its name,
  service, office phone and email, Yes to school grounds and Yes to
  fingerprinted under Senate Bill 9, written at signing, so the driver is
  asked only for their own. Its last page is a `licence_copy` box, and its
  campus and event dates are `trip_customer` and `trip_dates`, which the
  office's copy fills in when it opens.
- **The background check form's campus and trip date are left blank,**
  because it goes to many schools. Opened from a trip's Forms
  list, at `documents.html?open=<document id>&trip=<trip id>`, the campus and
  the trip date are written onto a copy shown in the browser's viewer, the
  campus being the trip's customer's name; the stored file never changes.
- **The driver's link lists what waits for them,** in a card at the top of
  `share/driver.html`, and each opens `share/sign.html?s=<token>&form=<id>`,
  drawn from the form's fields. A driver with no trips sent still has a link,
  which the Drivers page copies.
- **The signature is drawn, never typed or wet-inked:** a finger or stylus on
  a phone, or a mouse or touchpad on a computer, through pointer events, with
  Clear to start again; the districts take an electronically signed form. The
  box is a component Carbon lacks, so it is the scheduler's own, under
  `scheduler-`, every colour a `--rux-*` token.
- **Signing goes through one Edge Function, `scheduler/driver-form/`,** for
  every form: it checks the link's token, fills the PDF with pdf-lib, stores
  it in `company-documents` and adds the row, so the page writes nothing and
  the database still admits only staff.
- **Each signing is a row of `driver_form_signings`:** the form and version,
  the driver, the document, the time, the link, the IP address, the browser
  and whether it is flagged. That record is what makes the signature hold
  under the Texas Uniform Electronic Transactions Act. The answers live only
  in the signed PDF.
- **The office's view is a Forms tab on the Drivers page, a list of forms,**
  not a table of drivers against forms, which no screen holds past a few
  forms. A row is a form: its title, Once or Yearly, how many drivers are
  asked or Every driver asked, how many of those have signed, as a count
  and a bar, and how many have it to sign. A flagged signing heads the tab
  until Mark as read, so it is read before the PDF goes to a school.
- **A form opens on its own view, `drivers.html?form=<id>`:** Ask every
  driver, Send to all who owe it, and its drivers in four groups, To sign
  with the day it was sent or Not sent yet, Ends soon, Signed
  with Open, and Not asked. Every driver's row has the switch that puts the
  form on their link, saved as it is flipped. Send writes the text through
  `driver-text.js` as the week info message is written.
- **To sign is asked and not signed, sent or not,** the one count the
  office reads and the word the driver's link uses; a row says the day it
  was sent, or Not sent yet.
- **A driver's profile lists the forms on their link,** on its Documents
  tab: every current form with its switch, where it stands, and Send or
  Open, so one driver is set up without leaving their page.
- **Both views are lists, so a phone shows them as a desk does.**
- **After signing, the driver's link says only that a form is signed and
  when.** The answers, date of birth and address stay staff only and never
  reach a share page or a customer; the connector's `find_documents` finds
  the row but never reads its pages, as with a medical card.
- **No driver's answers, name or signature, and no blank form, go into this
  repository.** Tests use an invented driver and an invented form in Chrome
  on :8641.

## Questions

- TEA publishes its own Spanish affidavit. Should the Spanish under each
  question be TEA's wording rather than ours?

## Tasks

- [ ] Check in Chrome on :8641 with a test driver what the first round left:
      the form on a Spanish link, a second signing replacing the first as the
      current copy, and Send's Copy the text; then delete the test driver,
      its signings and its files.
