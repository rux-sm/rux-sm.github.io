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
  profile, then routes,** each waiting on the one before it.
- **A rule goes in a small file with sample cases,** never in `data.js`.
- **A database change or a deploy is its own step,** applied on rux's yes
  before the code that reads it is pushed.

### The connector and the skills

- **The fields a draft may fill are one table, `scheduler/draft-fields.js`,**
  read by the connector and the editor, with each field's kind checked
  before a draft is parked.
- **A draft cannot carry a PO or a deposit.** A person enters money on
  Billing; Claude writes the PO number in the draft's note.
- **A drafted bus count adds empty vehicles on the Buses tab.**
- **The connector answers with the pages' rule files,** joined into one
  generated file at build, so a trip's warnings are its gaps on Prep, and one
  read tool, `needs_attention`, lists them and a day's departures.
- **A session presses a real Save on the published site,** which runs only
  checked code; :8641 is for testing with the page's writes recorded.
- **A review reads the office email as text, never from pictures, and only
  reads.** Claude drafts a reply in chat.
- **A draft link stays its maker's.**
- **`trips` owns one trip or one customer's thread and `inbox-review` owns
  the team inbox and the To do rows.** The `trip-email` skill is deleted.
- **A To do row's thread key is an id the mail itself carries.**
- **A Save Claude presses is named as the person alone,** as if they made it
  by hand.

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
- **The past-midnight rule's six copies wait for the routes plan,** which
  rewrites every one of those readers.
- **A change to a rate or a setting is not recorded,** because each quote
  line already keeps the rate it was priced at.
- **The two-week board and Print week stay,** since both are built.

## Questions

None open.

## Tasks


### The connector and the skills

- [ ] Build `scheduler/draft-fields.js` as the one list, with each field's
      kind checked before a draft is parked, and read it in the connector and
      in `applyDraft` in place of their two lists.
- [ ] Add `scheduler/tools/build-connector-rules.mjs`, an office-day helper,
      and `get_trip` warnings from the rules; add `needs_attention`; change
      the To do plan's line in the same commit; deploy.
- [ ] Reconnect the connector, read a new session's tool list, and write the
      step into `working-from-claude.md`.
- [ ] Give each skill its job, key a row by the mail's own id, and name the
      published site for a real Save.

### Records

- [ ] Build `scheduler/trip-history.js` with its check, so any difference in
      a trip's rows makes a line.
