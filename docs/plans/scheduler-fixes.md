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

### The driver

- **What a driver's job reads as is one file, `scheduler/driver-job.js`,**
  used by the driver's page and the office, so both name the same changes.
- **A decline, and a change after a driver accepted, are each a bar alert
  and a gap on Prep.** The gap covers legs leaving within 30 days.
- **The flag clears when the driver accepts again, or when the office
  answers Yes to Mark the driver as told** in the Contact list, because many
  changes are told by phone.
- **Copy message asks before it marks trips as sent,** as Remind does, since
  a copied text is not a sent one.
- **A change to a stop's time or place takes Printed and Reminded off,** as
  a bus or date move does, because the paper now carries an old time.
- **The driver's link shows each stop, folded,** so Stops changed can be
  read. The page already holds them and the driver carries them on paper.
- **A cancelled trip stays on the driver's page as a Cancelled card** until
  its day passes, and Cancel names the drivers to tell.
- **A file is the itinerary only when its type is Itinerary,** for the
  driver as for the office, and the driver's link is handed no other file.

### Links without a log-in

- **A driver's link can be replaced with a new address, and setting a driver
  Inactive revokes it,** so an old text stops opening trips.
- **A trip document's address stops two days after the trip's last day, or
  when the trip is cancelled.** Staff still open old files signed in.
- **The two open live channels go.** The maintenance page and the old board
  refresh every 30 seconds without them.
- **The maintenance page shows a bus's days out as Out of service,** never
  the reason typed, because the link needs no log-in.

### Money and the route

- **The prices on a quote drawn from a trip are locked,** so a discount is
  a Billing line and the trip holds what the customer signs.
- **A sent quote stays on the board until the customer cancels or the office
  takes it off.** The one-week hold stays in `booking.md` as what the office
  says and is on no signed sheet, because it is not enforced.
- **An unanswered quote is chased from 60 days before its trip.** Quote sent
  is read as a date where it is marked, never as proof a quote is unsent,
  because most quotes out carry no mark.
- **After a trip has run, a confirmed trip with money owed asks for it,
  unless a PO covers it,** because a PO's payment is recorded on the printed
  schedule and not in the scheduler.
- **Two days are parted by any overnight wait of 8 hours,** whatever its
  mark, in the second-driver test; 8 is the quote's own printed figure.
- **A line that follows the calculator keeps following it** after its window
  is opened and closed. Only a figure typed in Cost makes a typed price.
- **A settled price holds.** Once a PO is in or the trip is paid in full, a
  line nobody typed stops repricing and offers the calculator's figure.
- **The customer quote's Total is the sum of the lines it prints.**
- **A draft never changes a Quoted price the editor keeps locked.**
- **A trip paid past its price counts as paid** when deciding Confirmed.
- **A placeholder is an amber trip that is not confirmed and has no quote
  marked sent;** past either, every reminder applies.
- **A card payment carries a 4% fee, written into the agreement's Payment
  Policy,** so the customer signs it.
- **`emails.md` owns how a quote email is written.** `booking.md` keeps what
  a customer must know before a trip is confirmed and links to it.

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

### The driver and the links

- [ ] Take out the two open channels and their senders.
- [ ] Draw a bus's days out on the maintenance page from `outOfService`, and
      name the bus in Recent changes.

### Money and the route

- [ ] Define a placeholder once, in `billing.js`, and read it in the
      follow-up, To do, checklist and Departures rules, the board and the
      connector.
- [ ] Ask for a balance after a trip with no PO has left, in `follow-up.js`.
- [ ] Teach `follow-up.js` the chase window and when the customer was last
      told, with the window in the Follow-ups dialog.
- [ ] Hold a settled price in `syncLines`.
- [ ] Test each stretch between real rests in `route-figures.js`, with cases
      for a run through the night on two dates.

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
