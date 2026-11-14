---
type: plan
---

# Plan: One pattern for each thing the Scheduler repeats

## Goal

A person who has learned one Scheduler page has learned them all. Wherever
two pages show or do the same thing, a record's trips, a date, an empty
value, saving a form, they do it one way, Carbon's way where Carbon has one.
Pages say less: a mark or a word that is the same on every row is taken off,
and the side nav is grouped. Nothing a page can do today is removed.

## Decisions

- **A record's trips are one row, drawn by one function.** The driver, unit,
  customer, partner and contact records each list trips their own way. One
  row replaces them: the trip's day or days, its destination over its
  customer, its number as `#101041`, and at the row's end what that record
  alone adds, a driver's answer, a partner's price, a contact's role. It
  lives in `scheduler/pair.js`, which the record pages already share.
- **A date a person reads is `Nov 13, 2026`.** Numeric dates stay only inside
  date inputs. The board's short forms, `Fri 13` and `11:07a`, stay, because
  a bar has no room for more.
- **An empty value is Carbon's dash.** Words stand in its place only where
  the gap asks for something, as `None on file · Upload` does.
- **A record's tabs are in one order:** Details, Contacts, Drivers, Trips,
  Documents, Maintenance, each record showing the ones it has.
- **History and Send to chat have one place in a record's header,** a pair
  at the end of the title's line, on every record that has them.
- **A status tag marks the exception.** A list where nearly every row is
  Active shows no tag on those rows and tags the Inactive ones.
- **A warning true of most rows is said once, over the table,** with its
  count, and the rows keep their own mark without the words.
- **The side nav is grouped with Carbon's dividers,** in the order the
  office works: the schedule and what is out, the records, the money, the
  office's own pages.
- **The Billing tab's second section is not also named Billing,** and what
  is filled in once the trip is back, Miles and Driver pay, stands under its
  own heading, so Mark billing done ends the part it marks.
- **A form's Cancel and Save are in a foot that stays in view,** as the trip
  editor's are, on every record page and on Settings, so Save is never
  scrolled away. The words are Cancel and Save everywhere.
- **Every page keeps its header and its content to the set width, pulled
  in,** and the board alone runs to the window's edges, header and all,
  while its View menu's Fill the window is on.
- **Delete is in an overflow menu in a record's header, shown only when the
  record can be deleted.** A record that cannot be says to set it Inactive
  where its Status is.
- **Decline on the driver's page keeps its size and is an outline,** Accept
  the one solid button, since the confirmation already catches a wrong tap.
- **Follow-ups, Vehicle types and Kinds are Carbon's ghost buttons,** their
  words kept.
- **Every rule a page needs is Design's or the app's own under
  `scheduler-`,** as the policy says; no change here edits a Carbon file.
- **Each task is checked in Chrome on :8641 in every theme before its
  commit,** and each is its own commit and push.

## Questions

1. **The side nav's groups.** Proposed: Schedule, Live map, Trips,
   Maintenance schedule; then Fleet, Drivers, Partners, Contacts, Customers,
   Locations, Documents; then Quote calculator, QuickBooks; then Forms,
   History, Settings. Is that the office's order?
2. **The Live map and the Maintenance schedule.** Both fill the window
   today. Do they keep to the set width like every other page, or are they
   wide like the board in Fill the window?

## Tasks

- [ ] Write the shared trip row in `scheduler/pair.js` and use it on the
  driver, unit, customer, partner and contact records' Trips tabs.
- [ ] Give every read date the one format, through one function, on the
  Billing tab's steps, the Files tab and the driver record's trips.
- [ ] Replace `None` and the like with the dash wherever the gap asks for
  nothing, on the pages after the Customers list, which has it.
- [ ] Give History and Send to chat their one place in every record's
  header.
- [ ] Say a warning most rows share once over the table, on Documents and
  on the Drivers list's medical card column.
- [ ] Group the side nav, in the block every page carries, once question 1
  is answered.
- [ ] Rename the Billing tab's second section and set Miles and Driver pay
  under their own heading.
- [ ] Give the Live map's panel Carbon's skeleton while Samsara is asked
  the first time.
- [ ] Give the record pages and Settings the foot that stays in view, with
  Cancel and Save.
- [ ] Hold the board's header and content to the set width while Fill the
  window is off, and the Live map and the Maintenance schedule as question
  2 is answered.
- [ ] Move Delete to an overflow menu in each record's header.
- [ ] Make Decline an outline on the driver's page.
- [ ] Make Follow-ups, Vehicle types and Kinds ghost buttons.
- [ ] Bring `scheduler/README.md` and `scheduler/docs/screen-inventory.md`
  to what each task changed, in that task's commit.
