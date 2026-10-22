---
name: trips
description: Review, enter or update charter trips in the scheduler with rux. Read the customer's email thread in Missive for the quote, itinerary, PO and requests, check the trip's Route, Buses, Billing and Files against it, make the changes in rux's Chrome and save on his yes. Use for any request to review a trip or a week's trips, enter a trip from an itinerary or email, fix a trip's price, stops, contacts or updates, or draft a customer email about a trip. rux's office rules are in rules.md beside this file, and every new rule he gives is added there.
---

# Working trips with rux

This skill owns one trip, or one customer's thread. The team inbox and the
Tasks list's rows are the `inbox-review` skill's.

**Read `rules.md` first.** It is rux's office policy, and it answers most
questions before they need asking. `emails.md` is how a customer email is
written. `scheduler/docs/booking.md` is what each booking step must say, and
`scheduler/docs/working-from-claude.md` is the scheduler's connector from
rux's side.

## The tools

| Tool | For | Never for |
| :--- | :--- | :--- |
| Scheduler connector: `find_trips`, `get_trip`, `list_buses`, `list_drivers`, `find_availability`, `find_contacts`, `needs_attention` | reading a trip, its buses and drivers, and what the board says it lacks; checking a save landed | saving: it writes drafts only |
| `read_trip_document` | the text of a PDF on the trip's Files tab, by the id `get_trip` lists under `documents` | a scanned page, which has no text: say it could not be read |
| `draft_trip`, `draft_trip_change` | a new trip, or a change, as a link that opens the editor filled in | |
| rux's Chrome, through Claude in Chrome, logged in | the trip editor and the forms on the published site, `https://rux-sm.github.io/scheduler/`, for every real Save, since it runs only checked code | the built-in browser pane, which cannot pass the log-in; `http://localhost:8641/scheduler/`, which is for testing a change with its writes recorded (`scheduler/docs/proving-a-save.md`) |
| Missive connector: `get_conversations`, `search_conversations`, `get_search_results`, `get_conversation_entries` | the customer's emails, quotes and itineraries | `change_labels` and `manage_calendar_events`, which write to Missive |
| Missive's `compose_draft` and `deliver_draft` | sending an email as rux when he asks in chat for it to be sent (see Missive below) | an email he has not asked to send: a reply is drafted in chat |
| Gmail connector | nothing: it is rux's personal mail | |
| Supabase | a read the connector lacks | writing a trip: the editor's Save is the only writer |

## Reviewing a trip

The customer's latest word is what the trip should be: the newest itinerary
on its Files tab, and its email thread, newer mail over an older file. The
scheduler is the office's copy of it, so a review lists where the copy
differs.

1. `get_trip` for the numbers. Note `booking_contact_email`,
   `booking_contact_missive_url` and `documents`.
2. Read the newest Itinerary in `documents` with `read_trip_document`, and
   the newest PO and contract when the trip has them. A page with no text, or
   a trip with no itinerary, is said in the report, never guessed around.
3. Read the whole email thread (see Missive below). Find the latest quote sent,
   any itinerary or change sent after the file was added, what confirms the
   trip (contract, PO, payment) and where that stands, what the customer asked
   for, and who to contact if the booking contact is away. A trip with no
   thread linked is searched for by its booking contact; a trip with neither
   says so.
4. Open the trip: `/scheduler/?trip=<id>&date=<start_date>`. Read
   Route, Buses, Billing, Details and Files, and the bar's card for what
   the trip still lacks: the card opens from the bar's alert count or
   update line, or Space on the bar, and never beside the trip's own
   editor, so read it with the editor closed.
5. List each difference with both values, the trip's and the customer's, and
   where the customer said it: a stop, a time, a day, the headcount, the bus
   count, the price. Then what else disagrees: a typed Estimated miles against
   the route's, the quote lines against the quote sent, Quote sent marked or
   not, Route's notices (second driver, fuel card), contacts, the newest
   update.
6. Report before changing anything: the differences, what you would change,
   and only the questions `rules.md` does not already answer.
7. On rux's go, draft the fixes as one `draft_trip_change`: fields by name,
   saved stops' times, days and waits by `stop_changes`, each stop named by
   the `id` `get_trip` answers, and `booking_contact_missive_url` when the
   review found the thread and the trip has none, so the next review has it.
   Open its link on the published site, check the fields and stops with a
   blue bar and the notice, press each tab's Done once it is reviewed, say
   exactly what Save will write, and save on his yes (see Saving). Where the
   stops themselves differ, a place added, gone or moved, draft `stops` in
   place of `stop_changes`: every stop of the leg, each with its day, which
   replace the leg's once the editor's question is answered Yes. A PO or a
   signed contract on the paper goes in as `purchase_order` or `contract`.
   One link is one trip.

## Entering a quote

The order is the editor's tabs, Details, Route, Buses, Billing, and each step
reads only the ones before it. Nothing is written until step 10.

1. **Read.** The whole Missive thread and any itinerary: who is asking, the
   day, every timed stop, the headcount, and what they asked for.
2. **Look up.** `find_trips` for a placeholder on the same customer and day
   (`rules.md`) and for the customer's other trips; `find_contacts` for the
   saved booking contact; `find_availability` for the day's free buses.
3. **Draft.** `draft_trip` with the fields you are sure of: `passengers`,
   the conversation's `link` as `booking_contact_missive_url`, and `stops`, the
   places between the pickup and the drop-off in order, each with its name,
   address and arrive and leave times. Anything with no field goes in its
   notes. Open the link it returns, on the published site. The link opens
   once, so the tab stays open until the save.
4. **Details.** Check each field with a blue bar against the email.
5. **Route.** Pick the pickup, by name first. Set Spot when the itinerary
   gives a meeting time. The drafted stops are laid out, each with a blue
   bar: check each against the itinerary and press Done in its window. One
   marked No location opens with its address searched, to choose from the
   list. A night of 8 hours or more starts off duty by itself. Read the
   Summary. On a second-driver notice follow `rules.md`: press Count as off
   duty when it is offered for hotel nights, or Rest in the sleeper, which
   sets that wait to sleeper berth and the Sleeper need on the leg's
   vehicles, and bring the
   second driver to rux only when the notice offers the co-driver alone. Add
   the fuel card when the tab offers it.
6. **Buses.** In the vehicle's window turn on any other need the route gave
   it, and Co-driver when rux chose a second driver. Pick the bus by `rules.md`. An unconfirmed trip gets
   no driver.
7. **Billing.** Press the Quote card's No quote lines yet row, which adds the
   bus rental and opens its window, and Done. It prices the line at the rate
   the Settings page's Calendar gives the trip's month, and the line names
   the rate; set another rate on the line only when `rules.md` asks for one
   the Calendar does not give. Take the dead-mile discount when the tab
   offers it. An Addt'l Driver line follows a co-driver seat by itself.
   Leave Estimated miles blank: it shows the route's miles and Save writes
   them. Open the calculator only for another rate or a price match.
8. **Review.** Read the Route tab's stops, each wait's status and the
   Summary's hours and miles, and the Billing tab's rate and price, against
   the email. No sheet shows them yet, because Forms draws the saved trip.
9. **Report.** Tell rux what the emails say, the route's figures, the price
   and what made it, the bus, exactly what Save will write, and only the
   questions `rules.md` leaves open. Wait for his yes.
10. **Save.** Add the itinerary on the Files tab, where a new trip's file
    waits and goes up with the save. Press Mark route done and Mark buses
    done, press Save, keep the update box's line, "Quote not sent", and
    answer the lists prompt by `rules.md`.
11. **After the save.** Read it back with `get_trip`, then Forms on the
    bar's right-click menu, Itinerary, Detailed: one sheet with the stops, each wait's status,
    the hours, the miles, the rate and the price, as the save wrote them.
12. **Reply.** Draft the email in chat by `emails.md`. rux prints the quote
    from Forms, Quote, which is two sheets, and sends it himself.
13. **Quote sent.** Press the Billing tile's Quote sent row and mark it sent, then Mark billing done and
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
| What the checklist counts | `scheduler/checklist.js` | the Departures panel's lines for a leg leaving soon, and the to-do rules for one further out |
| What confirms a trip, and what goes out with a quote | `scheduler/docs/booking.md` | the Billing tab's summary tile |
| The rates and what each is for | the Settings page, `scheduler/settings.html`, never this repository | the Mileage rate select in the calculator |


## Where each fact is in the editor

- **Details:** the leg on screen's dates and type, Round trip or One way,
  destination, Passengers (the headcount, which the Buses tab holds against
  the buses' seats), booking contact (Add email thread follows its Email
  label), trip contacts. A split is a trip whose first leg is one way with a
  later leg, the pickup. On a trip of more than one leg the switch over the
  tabs picks the leg: its dates, type, route, vehicles, own contacts and
  itinerary are entered with that leg on, and a pickup with none takes the
  drop-off's.
- **Updates:** the trip has no notes; what has been said about it is its
  updates, newest first on its card, `updates` in `get_trip`. Add one with
  the card's Add, which opens a box that adds what is typed on Enter, or in
  the Updates window, opened from the bar's menu with Add update; pressing an
  update opens its editor.
- **Route:** the Summary (Start, Spot, End; Miles, Drive, On duty, Less rest,
  a row a day), its menu's Measure drives again for a leg saved with old
  drives, the fuel card and second-driver notices, the stops with their
  waits, Mark route done.
- **Buses:** each bus, its driver and co-driver or relief seats, a warning
  when Passengers is above the seats, Mark buses done.
- **Billing:** a tile of Quoted, Paid and Balance over confirmed or not;
  Quote: one card, a row per line and their total, each row opening that line's
  window and its right-click menu holding Move, Use calculator price and
  Remove: the bus rental (it shows the calculator's price), the Addt'l
  Driver line a co-driver seat adds, Add line (Discount, Second driver,
  Hotel, Other); a trip saved with a price and no line shows it on one
  tile, and its rental starts from it; and Calculator and Copy for QuickBooks in its ⋮; Billing: Quote
  sent, the contract, purchase orders, invoices and payments as one tile, a
  row each, each row opening its window; Miles: Estimated miles, blank while it
  follows the route, beside Actual miles, then each driver's miles, and Get
  from Samsara in its ⋮; Mark billing done.
- **Files:** the uploaded itineraries, contracts and POs; a file opens in a viewer.
- **Forms,** on the bar's right-click menu: Quote for the customer, and
  Envelope, Hours of service and Itinerary for the drivers. The Quote offers
  to mark it sent the moment it is opened: leave the offer alone. The
  itinerary's Simple layout is the driver's sheet, which says Rest in sleeper
  on a stop whose wait counts as sleeper berth, and Detailed the office's,
  with the yard, each wait's status, the day totals and the price.

## Saving

- Every Save needs rux's yes in chat for that trip, after you have said what it
  will write. "Save", "press Done" or "yes" from him is that yes; approval of
  one trip is not approval of the next.
- A save, its update, Done marks and History entry are named rux alone, as
  if he made the change by hand, because he wants every update to read as his.
- Save opens Updates: replace its suggestion with a few general words by
  `rules.md`, such as Updated itinerary.
- "Update your lists?" after a save offers to add new places to Locations:
  answer it by `rules.md`, and name in the report each place saved.
- Check with `get_trip` that it landed: `quote_lines`, `quote_sent_price`,
  the three `_done_at` marks and `passengers` are in it, and a time past
  midnight on a one-day leg has `arrive_on` or `depart_prev_on`, its real day.
- If Chrome disconnects mid-save, look at the page before doing anything
  again, so nothing is saved twice.

## Missive

- Missive is read through its connector, which reads as rux and leaves his
  unread marks as they are. A session that has no Missive tools says so and
  asks rux to connect Missive in the Claude app under Settings, Connectors.
- Open the trip's thread from `booking_contact_missive_url` when it is set:
  the id at the end of that address goes to `get_conversations` as
  `conversation_ids`, with `include_content` true.
- Otherwise `search_conversations` with the booking contact's full email
  address as both `query` and `email`. The search answers in parts: call
  `get_search_results` with its `search_id` until `done` is true, keeping
  each call's threads, because a call gives only the ones found since the
  last. Then read the thread with `get_conversations`.
- A thread's messages come oldest first, each with its sender, its time,
  which is in UTC, and its `direction`; the team's comments follow under
  `internal`. `Status: Completed` in the metadata is a closed conversation.
  A thread cut short carries `next_entries_before`, and
  `get_conversation_entries` reads the older part.
- A message's body ends at `* * *` where the sender quoted earlier mail.
  When that mail is not among the thread's messages it is another thread
  with the same person, found by the search above.
- `include_attachments` true gives each attachment's file name, type and
  size, and a link that works for a short time; it does not hand over the
  file, and a picture in a message shows as `(image)`. Look for the same
  itinerary on the trip's Files tab first. Otherwise ask rux before fetching
  the file, naming it, who sent it and its size.
- A PDF is read with no download in rux's Chrome: open the conversation's
  `link`, press Open in browser if "Opening in Missive app" shows, and press
  the eye icon on the attachment. Opening a thread there clears its unread
  mark.
- Link the thread while reviewing: Details, Booking contact ⋮, Add email
  thread. The dialog's field has the focus and takes the conversation's
  `link`.
- An email rux asks in chat to send goes out from Missive as him, written
  by `emails.md`. `compose_draft` in `reply` mode drafts it in the
  customer's thread, replying to their last message, with `to` set to the
  people the thread writes to and `reply_all` false. `get_conversations`
  then reads the draft back: its author is rux, its sender the office's
  address, and its recipients the customer's. `deliver_draft` sends it only
  once all three are right, because a sent email cannot be taken back.

## Traps in the editor

- A place search shows its list only after a click in the field following the
  typing. A saved location, marked with a location icon, is found by its
  name or by its street address however the street is written, and the
  map's copy of the same address is not listed beside it. A hotel not found by name is
  found by its street address, with the Name field set to the hotel.
- A street address typed alone lists the same street in other towns first: type the town and ZIP after it. The right one may name a colonia where the customer names the town, and a place the map has no name for is named in the Name field that shows once it is picked.
- Set a time input with `form_input` as `HH:MM`, and read the dialog back before Done.
- A long route goes in at a stop a batch, with no `ref` to read: a place's list can take several seconds to come back from the map, and ArrowDown then Enter in the Location field picks from it, the first press landing on the first place; the page's script then sets the window's `#scheduler-f-stopday` select and its Arrival time and Leave time inputs with `input` and `change` events and reads them back, and after Done each stop tile's `aria-label` gives its times, drive and miles.
- A stop's "The wait counts as" is a plain select: set it with `form_input` as `on`, `off` or `sleeper`, because a click shows no menu in a screenshot.
- Done in a quote line's window keeps whatever its Cost field holds as a typed cost, so a rental opened to change its Mileage rate stops following the route: clear the Cost before Done, or afterwards choose Use calculator price from the line's menu, which is offered only when the two figures differ, and read the line back.
- A dialog may be closing as you click, and a stop's window moves the focus to its Close button a moment after it opens, so a place typed at once goes nowhere: click in the Location field and check what has the focus before typing.
- A tab whose editor holds unsaved changes does not close: Chrome waits on its leave-page question and the close call times out. Press Reset first when the changes are to be dropped, such as a draft opened only to measure a route.
- A draft's stop named like a saved location takes that location, wherever it is, so a chain restaurant can land in another city: read each leg's miles on the Route tab, and search the stop again by its street address when a leg is far too long. Two saved locations can share an address, and the draft may take the wrong one's name: read each stop's name too, and pick the right one by name.
- A round trip's `stops` in a draft leave out the return to the pickup, which is the drop-off already: listed, it becomes a second stop beside the drop-off, and the drop-off's own time stays blank.
- The editor has no field for a driver's instructions, so a note such as where to meet the group or a call-on-arrival rule cannot be entered there: name it in the report.
- `scroll_to` can shift the whole page; reset the window's scroll before a
  click by coordinates.
- Leaving the editor drops unsaved changes; Reset takes them back.
- An editor tab left open while waiting on rux's yes can be gone when he answers, with every unsaved change: check with `get_trip` that nothing was saved, then draft the change again and rebuild it.
- Quote sent, from the Billing tile's Quote sent row, records today's date, not the day the quote went out.
- Mark billing done stays off until Quote sent is marked, so a trip saved before its quote goes out has Billing left open.
- On a new trip, Save's Updates box opens on "Quote not sent", or "Quote sent" with the price once it is marked: save that line as it stands, with a few words added only when the trip waits on something else. A new trip's update is never a summary of the trip.
- The "Saved" notice sits over the lists prompt's buttons, and a click on it closes the prompt with nothing saved: press Save to lists from the page's script, then check the place is on the Locations page.
- Save's Updates box shows "Reading updates…" before it lists the trip's updates, and the list pushes the new-update field down as it lands, so a click made meanwhile opens an old update for editing: wait for the list, click the field under the line that says what changed, and read it back before Save with update.
- After a save, Add update is on the bar's own menu, a right-click on the bar; Forms is on that menu too, and the bar's colour is Trip bar color in the ⋮ menu of Details' Trip information heading.
- On a new trip the Files tab holds a file until Save sends it; on a saved trip the file goes up as soon as its type is chosen, with no Save, and an older file of the same type stays as an earlier version. The upload tool cannot read the Desktop: copy the PDF to the session's scratch folder, press Add file from the page's script so no file dialog opens, give the copy to the hidden file input, choose its type, then delete the copy.
- The Files tab refuses a file over 20 MB. A PDF made of full-page pictures shrinks under it with no quality a driver would miss: `pdftoppm -r 200 -jpeg -jpegopt quality=82` renders its pages, and a PDFKit script in Swift joins the JPEGs onto 792 by 612 point pages, because `sips` keeps each picture's pixel size as its page size.
- Forms draws the saved trip, never what the editor holds: it is off on a new trip until its first save, and on a placeholder being filled in its sheets leave out every change not yet saved.
- A click by `ref` on a tab that is not showing does nothing: take a screenshot to see which tab is open before pressing a button on it.
- `draft_trip_change`'s `stops` replace only the leg the link opens, its first, after a Yes to the editor's question, so a drop-off and pickup trip's pickup leg is changed on its own bar. Its `stop_changes` changes saved stops only, and a stop on the leg the link does not open, or the drop-off, is named in the notice and left for the Route tab.
- A draft's `stops` carry no wait status, so a saved stop they replace comes back on duty and the second-driver notice returns: press Rest in the sleeper or Count as off duty again, and read each wait's status in its window after changing its times.
- A Bus rental line with no typed Cost follows the route, so stops added to a signed trip move its price and the quoted price with it: read `quote_lines` back, and type the agreed Cost on the line when the price is fixed.
- The Route tab redraws its list as each drive is measured, so a `ref` read before a stop's Done is gone after it: scroll the tab to its end and press Add stop from a fresh screenshot.
- Add stop pressed while the Route tab is still redrawing can open no window, and a click by coordinates then lands on the board, where it opens another trip's card and Escape asks to save or discard the whole editor: check the stop's window is showing before clicking or typing in it.
- A vehicle comes off a trip from its tile's own menu, a right-click on the tile, then Remove, which asks first: pressing the tile opens its window, which has no remove.
- The No quote lines yet row on a trip with a quoted price starts the bus rental at that price, spread over the buses now on it: after the bus count changes, open the line and type the Cost for one bus that the PO or the quote sent gives.
- A trip saved with its quoted price apart from its lines opens with The lines and the quoted price differ, and the price follows the lines only once one of them changes: in a line's window change a typed Cost by a dollar and back, or switch a following line's Mileage rate and back, pressing Done each time, then read Quoted back.
- Changing a round trip's pickup leaves the old pickup behind as an extra stop before the return, and it shows only after the save: read the Route tab again once it is saved, remove the leftover stop from its tile's menu, and save once more.
- `draft_trip_change` fills only the fields the panel shows as one input: `bus_count` is named in the note at the top and left for the Buses tab.
- A draft's `departure_time` fills Departs, but a Spot saved apart from it stays, since the editor keeps a customer's own spot time: set Spot in the pickup's window and read the Summary's Start back.
- Any Save on a trip whose Estimated miles is blank writes the route's miles into it, even a route with a stop not yet measured, so a save made only to link a thread can write a wrong figure: check the Route tab's miles before such a save.

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
