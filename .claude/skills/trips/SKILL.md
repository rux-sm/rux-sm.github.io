---
name: trips
description: Review, enter or update charter trips in the scheduler with rux. Read the customer's email thread in Missive for the quote, itinerary, PO and requests, check the trip's Route, Buses, Billing, Files and checklist against it, make the changes in rux's Chrome and save on his yes. Use for any request to review a trip or a week's trips, enter a trip from an itinerary or email, fix a trip's price, stops, contacts or notes, or draft a customer email about a trip. rux's office rules are in rules.md beside this file, and every new rule he gives is added there.
---

# Working trips with rux

**Read `rules.md` first.** It is rux's office policy, and it answers most
questions before they need asking. `emails.md` is how a customer email is
written. `scheduler/docs/booking.md` is what each booking step must say, and
`scheduler/docs/working-from-claude.md` is the connector from rux's side.

## The tools

| Tool | For | Never for |
| :--- | :--- | :--- |
| Scheduler connector: `find_trips`, `get_trip`, `list_buses`, `list_drivers`, `find_availability`, `find_contacts` | reading a trip, its buses and drivers; checking a save landed | saving: it writes drafts only |
| `draft_trip`, `draft_trip_change` | a new trip, or a change, as a link that opens the editor filled in | |
| rux's Chrome, through Claude in Chrome, logged in | the trip editor at `http://localhost:8641/scheduler/`, the forms, Missive | the built-in browser pane, which cannot pass the log-in |
| Missive, in that Chrome | the customer's emails, quotes and itineraries | sending, replying, archiving, labelling or snoozing |
| Gmail connector | nothing: it is rux's personal mail | |
| Supabase | a read the connector lacks | writing a trip: the editor's Save is the only writer |

## Reviewing a trip

1. `get_trip` for the numbers. Note `booking_contact_email` and `booking_contact_missive_url`.
2. Read the whole email thread (see Missive below). Find the latest quote sent,
   the itinerary (in the email, an attachment, or the trip's Files tab), what
   confirms the trip (contract, PO, payment) and where that stands, what the
   customer asked for, and who to contact if the booking contact is away.
3. Open the trip: `/scheduler/?trip=<id>&date=<start_date>`. Read Route, Buses,
   Billing, Details, Files and Checklist.
4. List what disagrees: stops and times against the itinerary, the route's
   miles against Estimated miles, the quote lines against the quote sent,
   Quote sent marked or not, Route's notices (second driver, fuel card),
   contacts, notes, the email thread linked or not.
5. Report before changing anything: what the emails say, what you would
   change, and only the questions `rules.md` does not already answer.
6. On rux's go, make the changes, press each tab's Done once it is reviewed,
   say exactly what Save will write, and save on his yes (see Saving).

## Entering a trip

Look for a placeholder first (`rules.md`). Otherwise `draft_trip` with what the
email or itinerary says, open the link in Chrome, pick every address from its
list, check the fields with a blue bar, then review it as above and save on
rux's yes.

## Where each fact is in the editor

- **Details:** dates, destination, type, notes, booking contact (its ⋮ menu
  has Add email thread), trip contacts.
- **Route:** the Summary (Start, Spot, End; Miles, Drive, On duty, Less rest,
  a row a day), the fuel card and second-driver notices, the stops with their
  waits, Mark route done.
- **Buses:** each bus, its driver and co-driver or relief seats, Mark buses done.
- **Billing:** confirmed or not; the quoted price, which is the sum of the
  quote lines; Add the bus rental (it shows the calculator's price); Add line
  (Discount, Second driver, Hotel, Other); Quote sent; Estimated miles;
  contract, PO, invoice, payments; Mark billing done.
- **Files:** the uploaded itineraries, contracts and POs; a file opens in a viewer.
- **Checklist:** what is left on each leg.
- **Forms, Driver trip itinerary:** Simple is the driver's sheet, Detailed the
  office's with the yard and the day totals.

## Saving

- Every Save needs rux's yes in chat for that trip, after you have said what it
  will write. "Save", "press Done" or "yes" from him is that yes; approval of
  one trip is not approval of the next.
- Save opens Updates: replace its suggestion with one line saying what changed
  and why.
- "Update your lists?" after a save offers to add new places to Locations:
  choose Not now unless rux asked for it.
- Check with `get_trip` that it landed. Quote lines and Done marks are not in
  the connector; the bar's check mark shows all three Done.
- If Chrome disconnects mid-save, look at the page before doing anything
  again, so nothing is saved twice.

## Missive

- Open the trip's thread from `booking_contact_missive_url` when it is set.
- Otherwise search the booking contact's full email address and pick the
  person under **Past recipients**. A plain text search spins and finds nothing.
- Before typing, check that `document.activeElement` is the search input. A
  missed click sends the keys to the team chat box at the bottom, and Delete
  outside a text field opens "Archiving from team inbox": press Cancel.
- A collapsed message opens on a click; older ones load as you scroll up slowly.
- The eye icon on an attachment previews a PDF without downloading it. A
  spreadsheet cannot be previewed: look for the same itinerary on the trip's
  Files tab, or ask rux before downloading it.
- Link the thread while reviewing: Details, Booking contact ⋮, Add email
  thread. The dialog's field has the focus; type the address and press Enter.

## Traps in the editor

- A place search shows its list only after a click in the field following the
  typing. A hotel not found by name is found by its street address, with the
  Name field set to the hotel.
- Set a time input with `form_input` as `HH:MM`, and read the dialog back before Done.
- A dialog may be closing as you click. Check what has the focus before typing.
- `scroll_to` can shift the whole page; reset the window's scroll before a
  click by coordinates.
- Leaving the editor drops unsaved changes; Reset takes them back.
- Mark sent records today's date, not the day the quote went out.

## When rux teaches something new

When rux states a rule, corrects you, or a trap costs a step:

1. Add one line, or fix the wrong one, in `rules.md` for office policy, or in
   the traps above for how a tool behaves. Write it in the present tense, with
   its reason in the same line.
2. Quote the line to rux in your reply.
3. Commit it with the session's work when he says to commit, scope
   `scheduler`. Do not keep it only in memory, which stays on one computer.

A rule that turns out wrong is replaced, never annotated.

## One source: memory folds into this skill

This skill and its two files are the only home for how rux works trips,
customers and their emails, because memory stays on the computer it was
written on and this folder reaches every computer through git.

The first time this skill is used on a computer, and whenever a memory about
trips, customers, quotes, drivers, the scheduler's editor, Missive or customer
emails turns up in the memory index:

1. Read each such memory in full.
2. Fold what it says into `rules.md`, `emails.md` or this file: a fact already
   here is left as it is, a fact that disagrees with a line here is asked
   about, and a new one is added where it belongs. Leave out anything that
   names a customer, a person or a vendor document, since this repository is
   public; keep the rule, not the example.
3. Show rux what changed and commit it on his say-so.
4. Once it is committed, delete those memory files and their lines in the
   memory index, MEMORY.md, leaving one line there that points to this skill,
   so no second copy is left to drift.
