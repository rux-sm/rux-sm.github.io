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
- **Every rule a page needs is Design's or the app's own under
  `scheduler-`,** as the policy says; no change here edits a Carbon file.
- **Each task is checked in Chrome on :8641 in every theme before its
  commit,** and each is its own commit and push.

## Questions

1. **Saving a form.** Record pages end in Cancel and Save, Settings has
   Discard changes and Save at its top, and the trip editor has Reset and
   Save in a fixed foot. Should all three be one pattern, and which: the
   record pages' buttons at the form's end, or a foot that stays in view?
   The recommendation is a foot that stays in view, worded Cancel and Save,
   since a long form's Save is otherwise off screen.
2. **The header on a wide screen.** List and record pages inset the menu
   button and logo to the content column, and the board has them at the
   screen's edge. Carbon's shell keeps them at the edge. Is the inset
   deliberate?
3. **Delete on a record.** A disabled Delete with its reason is always on
   the page. Should it move to an overflow menu in the header and show only
   when the record can be deleted, or stay, so the reason is always read?
4. **The side nav's groups.** Proposed: Schedule, Live map, Trips,
   Maintenance schedule; then Fleet, Drivers, Partners, Contacts, Customers,
   Locations, Documents; then Quote calculator, QuickBooks; then Forms,
   History, Settings. Is that the office's order?
5. **Decline on the driver's page.** Decline is as large and as solid as
   Accept. Should it be quieter, to make a wrong tap less likely, or stay
   as large, since a driver's page keeps its actions big and obvious?
6. **Toolbar links.** Follow-ups, Vehicle types and Kinds are links in a
   table's toolbar. Should they be Carbon's ghost buttons, or one settings
   button on each list?

## Tasks

- [ ] Write the shared trip row in `scheduler/pair.js` and use it on the
  driver, unit, customer, partner and contact records' Trips tabs.
- [ ] Give every read date the one format, through one function, on the
  Billing tab's steps, the Files tab and the driver record's trips.
- [ ] Replace `Not picked`, `None` and the like with the dash wherever the
  gap asks for nothing, on the Customers list first.
- [ ] Put every record's tabs in the one order.
- [ ] Give History and Send to chat their one place in every record's
  header.
- [ ] Take the Active tag off the Fleet and Partners lists' active rows.
- [ ] Say a warning most rows share once over the table, on Documents and
  on the Drivers list's medical card column.
- [ ] Group the side nav, in the block every page carries, once question 4
  is answered.
- [ ] Rename the Billing tab's second section and set Miles and Driver pay
  under their own heading.
- [ ] Give the Live map's panel Carbon's skeleton while Samsara is asked
  the first time.
- [ ] Make saving one pattern, once question 1 is answered.
- [ ] Settle the header's inset, Delete's place, Decline's weight and the
  toolbar links, once questions 2, 3, 5 and 6 are answered.
- [ ] Bring `scheduler/README.md` and `scheduler/docs/screen-inventory.md`
  to what each task changed, in that task's commit.
