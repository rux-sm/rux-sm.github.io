---
name: trips
description: Review, enter or update charter trips in the scheduler with rux. Read the customer's email thread in Missive for the quote, itinerary, PO and requests, check the trip's Route, Buses, Billing, Files and checklist against it, make the changes in rux's Chrome and save on his yes. Use for any request to review a trip or a week's trips, enter a trip from an itinerary or email, fix a trip's price, stops, contacts or pinned update, or draft a customer email about a trip. rux's office rules are in rules.md beside this file, and every new rule he gives is added there.
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
4. List what disagrees: stops and times against the itinerary, a typed
   Estimated miles against the route's, the quote lines against the quote sent,
   Quote sent marked or not, Route's notices (second driver, fuel card),
   contacts, the pinned update, the email thread linked or not.
5. Report before changing anything: what the emails say, what you would
   change, and only the questions `rules.md` does not already answer.
6. On rux's go, make the changes, press each tab's Done once it is reviewed,
   say exactly what Save will write, and save on his yes (see Saving).

## Entering a quote

The order is the editor's tabs, Details, Route, Buses, Billing, and each step
reads only the ones before it. Nothing is written until step 10.

1. **Read.** The whole Missive thread and any itinerary: who is asking, the
   day, every timed stop, the headcount, and what they asked for.
2. **Look up.** `find_trips` for a placeholder on the same customer and day
   (`rules.md`) and for the customer's other trips; `find_contacts` for the
   saved booking contact; `find_availability` for the day's free buses.
3. **Draft.** `draft_trip` with the fields you are sure of: `passengers`,
   the thread's address as `booking_contact_missive_url`, and `stops`, the
   places between the pickup and the drop-off in order, each with its name,
   address and arrive and leave times. Anything with no field goes in its
   notes. Open the link at
   `http://localhost:8641/scheduler/?draft=<id>`. The link opens once, so the
   tab stays open until the save.
4. **Details.** Check each field with a blue bar against the email.
5. **Route.** Pick the pickup, by name first. Set Spot when the itinerary
   gives a meeting time. The drafted stops are laid out, each with a blue
   bar: check each against the itinerary and press Done in its window. One
   marked No location opens with its address searched, to choose from the
   list. Read the Summary. On a second-driver notice follow `rules.md`:
   press Rest in the sleeper when it is offered, which sets that wait to
   sleeper berth and the Sleeper need on the leg's vehicles, and bring the
   second driver to rux only when the notice offers the co-driver alone. Add
   the fuel card when the tab offers it.
6. **Buses.** In the vehicle's window turn on any other need the route gave
   it, and Co-driver when rux chose a second driver. Pick the bus by `rules.md`. An unconfirmed trip gets
   no driver.
7. **Billing.** Press Add the bus rental. It prices the line at the rate
   the Settings page's Calendar gives the trip's month, and the line names
   the rate; set another rate on the line only when `rules.md` asks for one
   the Calendar does not give. Take the dead-mile discount when the tab
   offers it. An Addt'l Driver line follows a co-driver seat by itself.
   Leave Estimated miles blank: it shows the route's miles and Save writes
   them. Open the calculator only for another rate or a price match.
8. **Review.** Trip actions, Forms, Itinerary, Detailed: one sheet with the
   stops, each wait's status, the hours, the miles, the rate and the price.
   Read it against the email.
9. **Report.** Tell rux what the emails say, the route's figures, the price
   and what made it, the bus, exactly what Save will write, and only the
   questions `rules.md` leaves open. Wait for his yes.
10. **Save.** Add the itinerary on the Files tab, where a new trip's file
    waits and goes up with the save. Press Mark route done and Mark buses
    done, press Save, keep the update box's line, "Quote not sent", and its
    Pin this update tick, which pins it in the same save, and answer the
    lists prompt by `rules.md`.
11. **After the save.** Read it back with `get_trip`.
12. **Reply.** Draft the email in chat by `emails.md`. rux prints the quote
    from Forms, Quote, which is two sheets, and sends it himself.
13. **Quote sent.** Mark it on the Billing tab, then Mark billing done and
    Save, only when rux asks for the mark in words. "Done" or "sent" alone is
    not that, because the mark records what the customer was sent.

### Where each step's facts are written

| The fact | Written in | Seen in the editor as |
| :--- | :--- | :--- |
| What each tab holds, and what its Done needs | `scheduler/docs/screen-inventory.md`, section 2 | each tab's Mark done line says what is still needed |
| The quote lines follow the route's miles and the Buses tab's seats | `scheduler/docs/quote-calculator.md` | turning a co-driver seat on adds the Addt'l Driver line |
| Add the bus rental and the calculator give one price | `scheduler/docs/quote-calculator.md`, Rounding | the same route shows the same total in both, for one driver and for two |
| A second driver is needed over 10 hours driving or 15 on duty less rest | `scheduler/docs/quote-calculator.md` | the Route Summary's Second driver notice |
| A saved location is listed first and carries a location icon | `scheduler/docs/screen-inventory.md`, the Route tab's row | the icon beside the result, and Saved location over the field |
| A return after midnight stays on a one-day trip | `scheduler/docs/screen-inventory.md`, the Route tab's row | Returns with the next weekday, and +1 on the board's bar |
| What the checklist counts | `scheduler/checklist.js` | the ring in the panel's head, with Open beside each open item |
| What confirms a trip, and what goes out with a quote | `scheduler/docs/booking.md` | the Billing tab's summary card |
| The rates and what each is for | the Settings page, `scheduler/settings.html`, never this repository | the Mileage rate select in the calculator |


## Where each fact is in the editor

- **Details:** dates, destination, type, Passengers (the headcount, which
  the Buses tab holds against the buses' seats), booking contact (its ⋮
  menu has Add email thread), trip contacts.
- **Pinned update:** the trip has no notes; what everyone should know is the
  update pinned to the top of its card, `pinned_update` in `get_trip`. Write
  it in the Updates window, opened from the bar's menu with Add update, then
  press the pin at its tile's corner, which shows on hover; pressing the tile
  itself opens its editor. Pinning one unpins the last. The window's Pin
  this update tick pins what is written as it is added; Save's box has it
  ticked for a new trip.
- **Route:** the Summary (Start, Spot, End; Miles, Drive, On duty, Less rest,
  a row a day), its menu's Measure drives again for a leg saved with old
  drives, the fuel card and second-driver notices, the stops with their
  waits, Mark route done.
- **Buses:** each bus, its driver and co-driver or relief seats, a warning
  when Passengers is above the seats, Mark buses done.
- **Billing:** confirmed or not; the quoted price, which is the sum of the
  quote lines; Add the bus rental (it shows the calculator's price); the
  Addt'l Driver line a co-driver seat adds; Add line (Discount, Second
  driver, Hotel, Other); Quote sent; Estimated miles, blank while it follows
  the route; contract, PO, invoice,
  payments; Mark billing done.
- **Files:** the uploaded itineraries, contracts and POs; a file opens in a viewer.
- **Checklist:** the ring in the panel's head; what is left on each leg under
  Entered, Customer, Buses, Paperwork and Extras, each with Open.
- **Forms,** in the panel's Trip actions menu: Quote for the customer, and
  Envelope, Hours of service and Itinerary for the drivers. The Quote offers
  to mark it sent the moment it is opened: leave the offer alone. The
  itinerary's Simple layout is the driver's sheet, which says Rest in sleeper
  on a stop whose wait counts as sleeper berth, and Detailed the office's,
  with the yard, each wait's status, the day totals and the price.

## Saving

- Every Save needs rux's yes in chat for that trip, after you have said what it
  will write. "Save", "press Done" or "yes" from him is that yes; approval of
  one trip is not approval of the next.
- Save opens Updates: replace its suggestion with one line saying what changed
  and why.
- "Update your lists?" after a save offers to add new places to Locations:
  choose Not now unless rux asked for it.
- Check with `get_trip` that it landed: `quote_lines`, `quote_sent_price`,
  the three `_done_at` marks and `passengers` are in it, and a time past
  midnight on a one-day leg has `arrive_on` or `depart_prev_on`, its real day.
- If Chrome disconnects mid-save, look at the page before doing anything
  again, so nothing is saved twice.

## Missive

- A Missive link first shows "Opening in Missive app": press Open in browser to read the thread in Chrome.
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
  typing. A saved location, marked with a location icon, is found by its
  name or by its street address however the street is written, and the
  map's copy of the same address is not listed beside it. A hotel not found by name is
  found by its street address, with the Name field set to the hotel.
- Set a time input with `form_input` as `HH:MM`, and read the dialog back before Done.
- A stop's "The wait counts as" is a plain select: set it with `form_input` as `on`, `off` or `sleeper`, because a click shows no menu in a screenshot.
- After setting a line's Mileage rate with `form_input`, the Cost keeps the old figure: choose Use calculator price from the line's menu, and read the line back.
- A dialog may be closing as you click. Check what has the focus before typing.
- `scroll_to` can shift the whole page; reset the window's scroll before a
  click by coordinates.
- Leaving the editor drops unsaved changes; Reset takes them back.
- Mark sent records today's date, not the day the quote went out.
- Mark billing done stays off until Quote sent is marked, so a trip saved before its quote goes out has Billing left open.
- On a new trip, Save's Updates box opens on "Quote not sent", or "Quote sent" with the price once it is marked: save that line as it stands, with a few words added only when the trip waits on something else. A new trip's update is never a summary of the trip.
- After a save, Add update is on the bar's own menu, a right-click on the bar; the editor's ⋮ has only Forms and Color.
- On a new trip the Files tab holds a file until Save sends it. The upload tool cannot read the Desktop: copy the PDF to the session's scratch folder, press Add file from the page's script so no file dialog opens, give the copy to the hidden file input, choose its type, then delete the copy.
- A click by `ref` on a tab that is not showing does nothing: take a screenshot to see which tab is open before pressing a button on it.

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
