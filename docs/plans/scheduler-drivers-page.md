---
type: plan
---

# Plan: a Drivers page in the scheduler

## Goal

Staff see every driver on one page and edit a driver's details from the
scheduler, as rux-ui's Driver Roster and driver editor do today, so nobody
opens rux-ui to change a phone number, an expiry date or time off.

## Decisions

- **Two pages, both centred.** `scheduler/drivers.html` lists the drivers;
  `scheduler/drivers.html?id=<driver id>` edits one, and New driver opens it
  with no id. A driver's form is long and edited now and then, which Carbon's
  forms pattern gives a page rather than a side panel.
- **The list is centred in twelve of the sixteen columns at lg**, as
  `scheduler/quote-rates.html` is; the editor is centred in eight. Both use
  the scheduler's collapsible side nav, so neither needs the 18rem offset.
- **The board's rule that a driver opens in the panel changes to this page**,
  and `scheduler/docs/screen-inventory.md` changes with it.
- **The list is Carbon's data table at medium density, sortable**, with a
  toolbar holding the search, a content switcher for Active, Inactive and All
  with counts, and a primary New driver button. No checkboxes, batch actions or
  pagination: there are 40 drivers and nothing to do to several at once.
- **Five fixed columns, with no column picker:** Driver (avatar with photo or
  initials, name, short name beneath), Phone, CDL class, Employment (full or
  part time and priority), Compliance. A whole row opens the driver.
- **Compliance is one status icon per row**, Carbon's icon indicator, since
  Carbon has no yellow tag: for whichever of the licence and medical card
  expires first, red for expired, yellow within 45 days as rux-ui's newer
  roster warns, otherwise the date, gray for not on file. The default sort
  puts the soonest first. A phone shows the driver, phone and compliance only.
- **The editor is one form in sections, no tabs**, each a fieldset with a
  legend: Profile, Emergency contact, Licence, Employment, Time off, Schedule
  link, Trips. Tabs would hide which section holds unsaved changes.
- **Components in the editor:** breadcrumb back to Drivers; the title with the
  avatar and a status tag; text inputs; selects for state, CDL class,
  employment type and priority; checkboxes for endorsements; date pickers for
  birth, hire and both expiries, with a warning under an expiry that is soon;
  radio buttons for Active and Inactive; a text area for notes; a tertiary
  button that opens the file picker for the photo; and form-page.html's button
  set, Cancel then Save, stacked on a phone.
- **Time off is a contained list** of date ranges with an Add row; a modal
  adds or edits one range with a date range picker, a reason select and notes.
- **The schedule link section is read-only:** the link's state and dates, and
  Copy link. Making, changing and deactivating links stays in rux-ui until the
  plan for making links in the scheduler.
- **Trips is a contained list** of the driver's upcoming assignments, each
  opening the trip on the board through `./?trip=<id>&date=<day>`.
- **Status is Active or Inactive.** The database holds only those two, and
  rux-ui's On leave is never saved.
- **A driver is never deleted here, only set Inactive,** so past trips keep
  the driver's name.
- **The Workload view waits for a later plan,** so this one builds the list
  and the editor.
- **Fields and storage are rux-ui's**, so both apps read the same driver: the
  `drivers` columns, `driver_time_off` rows, and photos in the public
  `driver-photos` bucket at `<driver id>/photo-<milliseconds>.<ext>`. A new
  driver's `driver_ref` comes from the database's `set_driver_ref` trigger.
- **Save writes the driver and its time off together.** `drivers` has no
  `updated_at`, so Save first compares the row with the values the page
  loaded, and asks before it replaces a change saved elsewhere. A photo writes
  at once and needs a saved driver first.
- **Leaving with unsaved changes asks first**, as the trip panel does.
- **No database change.** Signed-in staff already read and write `drivers`,
  `driver_time_off` and the photo bucket.
- **A Drivers link joins the side nav** between Schedule and Quote.

## Questions

None open.

## Tasks

- [ ] rux saves one real driver edit and opens both pages on a phone, since
      the database is live and the page was tried only with invented drivers.
