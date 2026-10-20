---
type: plan
---

# Plan: Scheduler fixes

## Goal

A trip never says less than the scheduler knows. A clash, a driver who has
to be told, and a price that differs from the one sent each show where the
office already looks: the bar, its card and Prep.
What a driver or a customer holds is what the trip holds. An agent's tools
answer with the pages' own rules. A script that cannot run never reaches the
site.

## Decisions

### Order

- **The tasks are in building order,** group by group.
- **The other plans follow as retiring rux-ui, documents with the customer
  profile, then `scheduler-trip-shapes.md`,** each waiting on the one before it.
- **A rule goes in a small file with sample cases,** never in `data.js`.
- **A database change or a deploy is its own step,** applied on rux's yes
  before the code that reads it is pushed.

### Checks

- **Every page script is parsed, and every scheduler page's scripts are
  loaded in order against a stand-in page,** in the fast check.
- **No check keeps an exception list.** A finding is fixed by renaming.
- **No browser is added to the check;** a session proves a real Save in
  Chrome.
- **The price check proves the written rules in `quote-calculator.md`,** on
  invented rates, not the office spreadsheet.

### Left as it is

- **Save stays many separate writes,** because it says what landed and one
  transaction means moving Save into the database.
- **QuickBooks stays typed by hand,** with Copy for QuickBooks as the bridge.
- **The past-midnight rule's six copies wait for `scheduler-trip-shapes.md`,** which
  rewrites every one of those readers.
- **A change to a rate or a setting is not recorded,** because each quote
  line already keeps the rate it was priced at.
- **The two-week board and Print week stay,** since both are built.

## Questions

None open.

## Tasks


### Records

- [ ] Build `scheduler/trip-history.js` with its check, so any difference in
      a trip's rows makes a line.
