---
type: plan
---

# Plan: a Contacts page in the scheduler

## Goal

Staff see every customer contact on one page and edit one from the scheduler,
as rux-ui's Customers view and its editor do today, so nobody opens rux-ui to
fix a phone number or an email. The page looks and works like the Drivers and
Buses pages, and anything it changes in their shared shape changes on all
three.

## Decisions

- **Two views in one file.** `scheduler/contacts.html` lists the contacts,
  `contacts.html?id=<contact id>` edits one, and `contacts.html?new` makes one,
  as the page pair plan names it.
- **Both take the page pair's layout**, which `docs/plans/site-page-pair.md`
  decides and this plan does not restate.
- **This corrects the screen inventory.** `scheduler/docs/screen-inventory.md`
  puts the customer editor in the panel, in §1, §2 and §7; it becomes a page
  like a driver's and a bus's, and the inventory changes with this page.
- **The page is called Contacts, and a contact is a person.** The school or
  business they book for gets its own page later, from
  `docs/plans/scheduler-customers-and-locations.md`; until then it is the
  contact's typed `client` text, shown as Organization.
- **The shared shape has one home:** the `scheduler-pair-*` classes in
  `scheduler/app.css`, which Contacts carries as Drivers and Buses do, adding
  only what a contact has and they do not.
- **Any shared part Contacts changes changes on Drivers and Buses in the same
  commit**: the table box, filter strip, toolbar, count note, title, tabs,
  button set, notices and the leave guard.
- **The list is Carbon's data table at large density, sortable**, with the
  toolbar's search and a primary New contact button. No checkboxes, batch
  actions or pagination, as on the other two: search finds any of the 253
  contacts in a few letters, and a pager would be a control only this page has.
- **Five fixed columns, with no column picker:** Contact (the name, with the
  organization beneath, as a driver's short name sits beneath the name),
  Phone, Email, Trips (how many), Next trip (its date, or the last one's in
  the quiet colour when none is coming). A whole row opens the contact. A phone
  shows the contact and the next trip only.
- **The list opens sorted by name, A to Z,** as rux-ui's does. Every column
  sorts.
- **No filter strip.** A contact has no status, and a filter hiding the ones
  with no trip coming would hide them from the search too; sorting by Next
  trip gives the same view without hiding anyone.
- **Search reads the name, organization, phone and email,** and a phone
  number matches by its digits, however it was typed.
- **The editor has two line tabs, Details and Trips,** as a bus's does.
  Details is one form: Name, Organization, Phone and Email on the one
  three-column grid, then Cancel and Save. A new contact shows no tabs.
- **Name is required and says so** under the field in Carbon's error state,
  and an email that is not an email blocks Save the same way. rux-ui only
  moves the cursor, which says nothing.
- **A new contact warns when it matches one already there** by phone, email
  or name, the same rule the trip editor's save uses to find a person, with a
  link to that contact and a button to save anyway. A second row for the same
  person splits their trips between two contacts.
- **Trips lists every trip the contact is on, newest first,** in any of the
  six slots, each saying the date, trip number, destination and whether they
  booked it or are the day-of contact, and opening it on the board through
  `./?trip=<id>&date=<day>`. A customer's past trips are what staff look up,
  unlike a bus's.
- **Delete is offered only for a contact with no trips.** The database clears
  a trip's link when its contact goes, so deleting one with trips would
  quietly unlink them; 13 contacts have none, and they are the mistakes.
- **Merging two duplicates is not in this plan.** Four names appear twice,
  and joining them needs the trips moved as well.
- **Fields are rux-ui's**, so both apps edit the same row: `name`, `client`,
  `phone` and `email`. rux-ui's Customers view stays as it is.
- **One phone, the number to reach them on.** The trip copies it for the
  driver and the autofill offers it, and both need the one number that
  answers. A second, optional Office phone is a column added later only if
  it is missed; splitting now changes the matching rule, rux-ui and every
  trip's copy for a number nobody has asked to store.
- **A trip save fills a contact's blanks.** When the contact a trip names, or
  one picked from the trip editor's suggestions, has no phone or no email and
  the trip has one,
  saving the trip writes it to the contact. It never replaces a value already
  there, and a contact matched by name alone is left untouched, since two
  people can share a name. 70 contacts have no phone and 73 no email.
- **Editing a contact never changes a trip.** Each trip keeps the name and
  phone it was saved with, which is what its driver was given.
- **Save compares before it writes.** `contacts` has no `updated_at`, so Save
  first checks the row against what the page loaded and asks before it
  replaces a change saved elsewhere, as the Buses page does.
- **Leaving with unsaved changes asks first**, as the other pages do.
- **No database change.** Signed-in staff already read and write `contacts`.
- **A Contacts link joins the side nav after Drivers.** The nav is copied into
  seven pages, which all change together.

## Questions

None open.

## Tasks

- [ ] rux saves one real contact edit and opens both views on a phone.
