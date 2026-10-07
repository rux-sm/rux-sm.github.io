---
type: reference
---

# Screen inventory

The surfaces of the old `rux-ui` app that this app has not built yet, each
with a verdict and, for a keep, what it becomes. The old app is a
floating-window desktop; this one is a Carbon page, so every movable window
becomes a panel, a modal or a page.

Verdicts: **keep** builds next, **later** builds after the record tables work,
**decide** is open, **drop** is not rebuilt. A drop can be reopened; the commit
that reopens it says why.

A *template* is one of the twelve in `design/templates/`; a *module* is one
of Design's `js/*.js` behaviours; an *app component* is this app's own.

## 1. Views

| Old view | Verdict | Becomes |
|---|---|---|
| Customers | keep | `contacts.html`, the Contacts list, and one contact at `contacts.html?id=` (§7). |
| Itineraries | later | Needs the itinerary editor, an app component, and the AI intake. |
| Settings (`Options`) | keep, trimmed | `settings-page`. Yard, requirements, billing defaults. Saved locations have their own page, `locations.html`. Mapbox and Extract keys move with intake. |

The side nav lists only pages that exist; each view is added when its page is.
Dropped: Documents, Game, the Samsara and Gallery links.

## 2. Editors and panels

| Old surface | Verdict | Becomes |
|---|---|---|
| Trip editor, Itinerary and Files tabs | keep | Tabs in the trip panel. Files is one list of the trip's itineraries, contracts and POs, newest first, earlier itineraries folded under the newest, each replaced or deleted from its row menu, with Add file last; a file dropped anywhere on the tab is taken, its type asked in a dialog, and it writes at once, stored as rux-ui stores it. A trip with no itinerary says so under the list, with Not needed, which the Checklist's itinerary row also offers. The itinerary grid is *later*. |
| Document viewer | keep | A `rux--side-panel--md` column left of the board, framing the PDF beside the trip panel. A file always opens there, never in a browser tab: where the board cannot hold the column beside the week, the panel comes in front of the board instead. |
| Trip editor, bus and driver assignment | keep | The Buses tab: each leg's vehicles, titled Vehicles, or Drop-off vehicles and Pickup vehicles on a split trip, under a warning when the Details tab's Passengers is above the seats of the leg's buses, a tile per vehicle as a Route stop is: its number and the vehicle, or No vehicle yet, with its type and each need's icon at the end of the line, one its bus lacks in the warning colour; then any warning about the vehicle in words; then a line per seat, the driver's status icon, the driver or No driver yet, the seat when it is not the driver's with a relief's swap time, and what clashes on the line under it. Pressing a tile opens the vehicle's window, which edits a copy that Done keeps and Cancel drops: Type, Any or one of the fleet's types; Needs, every vehicle need the office lists; Vehicle, a combo box over every active unit of every type; Driver with its status; Also on board, tags that turn on Co-driver, Relief at start and Relief at end, a relief with Swap time and Note. Each seat's status is a Carbon status icon at the end of its field that opens the five statuses, and changing a driver resets that driver's status to Not sent, as rux-ui does. Right-click or hold on a tile for Edit, Move up, Move down and Remove, which asks first when the vehicle holds a bus or a driver; Add vehicle ends each list. Each vehicle's needs and type are its own `trip_assignments` row's, and Save sets the trip's needs to every need any vehicle has and its vehicle type to the one they all share. The pickers name what clashes on the trip's dates and a picked clash warns. The driver picker lists free drivers first, strictly by priority, and within a priority a driver with no back-to-back trip first, then the fewest days driven in the last four weeks; busy and away drivers follow with the reason, and a picked back-to-back driver warns. Assign best, at the head of each leg's buses, fills only that leg's empty seats on vehicles that have a bus, Driver seats first, each with the first free driver not already on the leg in the automatic order: any driver with no back-to-back trip, whatever their priority, before a back-to-back one, who is taken only with 10 hours from the one trip's return arrival to the other's departure and never when a time is missing, and leaves every chosen driver as it is; Save or Reset decides; a driver in two seats of one leg blocks Save. Saved with the trip, by id. Pay stays in rux-ui. |
| Trip editor, Billing tab | keep | A summary card with the confirmation and billing status, then Price, Quote lines, Quote sent, Contract signed, PO received, Invoice sent and Payments, each milestone a switch on its heading. The switches open as rux-ui opens them, and a milestone the billing workflow turns off is hidden. Quote lines are priced by the quote calculator from the trip's miles, dead miles and days, can be typed over and reordered, and Copy for QuickBooks copies each of them. A line is a Bus rental, Second driver, Discount, Hotel or Other; a Hotel line is the drivers' room the office books, its window holding the leg's confirmation number, which marks that leg booked, and while the trip has one it carries the hotel reminder. |
| Charter or Ticketed, ticket prices | later | With the trip manifest. |
| Trip editor, Route tab | keep | A Summary first: Start, Spot and End as figures, when the bus leaves the yard, is spotted and is back, the way Billing shows Paid and Balance, then a compact table of Miles, Drive, On duty and On duty less rest, on a leg of more than one day a Day column, a row numbered for each day and a Total row adding them up, and on a one-day leg one row of figures with no Day column, flush in one tile; the Summary's menu, at the end of its title line, has Measure drives again, which asks every drive of the leg on screen again as picking its places would, for Save to store or Reset to take back, opens Route times and Fuel card limits, the office's miles and days, and adds or removes the trip's fuel card. Under the Summary, a trip with a fuel card says so, and one past either limit without one offers Add fuel card. Then one list, untitled but headed by its days, or by its date on a one-day leg, and on a split trip titled Drop-off leg or Pickup leg, from a Pickup tile marked P to a Drop-off tile marked D, round marks like the stops' numbers: the Pickup tile shows the place and Departs, the Drop-off tile where the group is let off and Returns or Arrives, with the day on a leg of more than one. Each opens its own dialog: the pickup's Location search, whose pick fills the place's name and address, with a Name field under it when a place just picked is not saved yet, then Spot beside Departs, Spot following Departs by the route times' minutes unless the customer's own time is typed, which then stays; on a round trip the drop-off's note that the group is let off at the pickup with Change drop-off location, which opens a Drop-off search of the same kind, and Returns; on a one-way trip and each leg of a split trip the Drop-off search and Arrives, the drop-off empty until one is picked and never copied from the pickup, and a split trip's pickup leg, while it has neither place, given its drop-off leg's two reversed when the drop-off leg is saved, picked up where the group was let off and taken back to where it started, its drives measured and its times left blank, or filled the same way when opened if the drop-off leg was saved before. A new trip starts with Add pickup and Add drop-off. Between them, always open: the stops, numbered from 1 across every day, one row per place the bus stands still, its place and its times, with its wait under the place, and the drive and miles on a line between rows, from the pickup before the first and on to the drop-off after the last, which on a round trip is back at the pickup and counts whether or not the last stop has a leave time, with a warning on a leg whose typed times leave less than the drive, or on a leg of more than one day reach a stop before leaving the last, when that day's on duty reads Check times; a stop typed and not picked, such as a restroom break, has no location, says so with a warning, and is driven past, the drive measured from the place before it to the place after; pressed to edit in a dialog with the same Location search, and right-clicked or held for Edit, Move up, Move down and Remove, with no menu button on the tile, with Add stop at the end; on a leg of more than one day, under a heading per day; a stop keeps its day with or without times; on such a leg its dialog gives Arrives and Leaves each a day beside its time, the leave's day following the arrival's, or the next day when the leave time is earlier, a night at a hotel, until a later day is picked for a stay of nights, and the tile shows the leave's weekday when it falls on another day; a stop is left on its leave day, its day ending when the bus reaches it and the next starting when the bus leaves it, or with no leave time when the bus must leave for its first stop. A one-day leg reads its times in the order they happen, the yard out to the yard back, and one earlier on the clock than the one before it is past midnight, counted from the group's departure: a stop, the drop-off and End after it show that day's weekday, on duty runs across it, and the board's bar marks the return +1, so a trip back after the hour it left is still one day on the board. The Summary's times say the bus's drives in their tooltip; on duty runs from the pre-trip before the yard departure to the post-trip after the yard return, shown whole and, in brackets, less waits off duty or in the sleeper berth, or "on duty needs times" while a stop lacks its arrival or the day its start or end, since miles and driving need only the places, and the line wraps between figures on a narrow panel. The route times, the spot before departure, the pre-trip and post-trip minutes and how much slower than the map a bus drives, are edited for every trip from the Summary's menu; drives are looked up from Geoapify, its fastest road unless its shortest is at least 5% fewer miles for at most 10% more time, and slowed by that percent when measured, and a leg between stops with a place at both ends and no drive is looked up when the trip opens and stored by its next Save. The search's list marks saved locations with a location icon, ahead of Geoapify's answers, and ends in Geoapify's credit. Estimated and Actual miles are on the Billing tab. Untouched, the tab edits only the leg's pickup, first stop, drop-off and return rows; once the list is touched, Save rewrites the leg's stops in its order and keeps day and sleeper rows where they are. Stops can be added before a trip's first Save, which then writes the leg's pickup, stops, drop-off and yard rows together. |
| Trip editor, Done | new | The Route, Buses and Billing tabs each end with Mark done, pressed once someone has gone back over the tab. It works only when the tab is complete, and until then says what is still needed: Route, every place found, the times in and in order and the drives measured, on both legs of a split trip, the leg not on screen read as saved; Buses, every bus assigned, none short of the trip's needs or booked elsewhere; Billing, a Bus rental line and the Second driver, Relief driver and Hotel lines the trip needs, and Quote sent marked at the price the lines add up to. A tab that is done has a check on its name and says who marked it and when, with Undo; Save writes it after the trip's rows. A change takes the check off at once, and Billing's with the route or the buses, as the database does for a change from any app; the update window names the checks a save takes off. The checklist lists all three, and the History tab records who marked each. |
| Trip editor, checklist | new | A button in the panel head, before Trip actions, reading how many items are left with an open ring, or Ready with a check, on every tab; it opens Carbon's popover over the editor, which Escape or a press outside closes, with the count again, then each leg's items in five groups, Entered (the three Done marks), Customer (confirmed, itinerary received, a trip contact), Buses (every bus assigned and fit, every seat filled, every driver confirmed), Paperwork (itinerary printed, envelopes printed, the hours-of-service record where a part-time driver rides) and Extras (hotel booked, fuel card assigned), showing only what the leg needs; a placeholder shows Entered alone, and a split trip gives each leg its own groups. An item that is done has a check, one that is not an open ring, what is missing under its name, and Open, or Forms, to go and do it, which closes the popover. Itinerary printed, hours of service printed and the fuel card, with its number, are checkboxes here that Save writes, in the columns rux-ui's Tasks list reads. The rules are `scheduler/checklist.js`, which `scheduler/tools/check-checklist.mjs` runs against sample trips in the check. |
| Departures | new | Opened from the board's menu into the panel beside the board, so the week stays in view: the legs leaving today and the next two days, under a heading per day, read fresh from the database whatever week is on screen. Each leg names its destination, customer, leg on a split trip and how many items are left, then only its open items, each with Open, which goes to the trip's tab where it is done, or Forms; legs with nothing left fold under "N ready", and a day with none says Nothing leaves. A placeholder is not listed, and a save redraws it. |
| Customer editor | keep | The Contacts page's record: name, organization, phone and email (§7). |
| Itinerary editor | later | App component, with the Itineraries view. |
| Trip manifest | later | Passengers as a `table-page` section under the trip, edit in a modal. |
| Trip finder results page | keep | `trips.html`, every trip in a data table with search, a Show choice and pagination; a row opens its trip on the board. Results in a data table on a page. The schedule's toolbar has a search button, and Cmd-K, that open a Search trips window; a pick shows its week with the bar selected and in view, without opening the trip. It finds cancelled trips too, tagged Cancelled; one opens a dialog with the date and reason and a Bring back button. Cancelling needs a typed reason. |
| Contact info, Driver week info | later | Modals with a text area and the copy button module. Sending marks each sent driver Pending response unless already confirmed or declined, as rux-ui does. |
| Print schedule | later | An entry in `print.html`'s registry beside the driver envelope's, the driver itinerary's and the customer quote's, naming what it binds to and the paper it takes. |
| Requirements editor | keep | Settings section; a contained list with an add row. Icons come from the rux sprite by a fixed name. |
| Notifications | later | Shell header panel, the one the switcher uses. |
| Driver card | later | Popover from a cell of the availability grid (§7). |

Dropped: dev notes, team chat, and the old profile menu (the Design account
panel replaces it). Presence is kept: faces in the header show who else has
the schedule open, and faces on a bar show who has that trip.

## 3. Schedule view in detail

| Behaviour | Verdict | Note |
|---|---|---|
| Time-aligned mode | later | The grid places by day. |
| Two-week view | decide | The grid fetches one week. |
| Tasks | later | A page (§7). |
| History | keep | `history.html`, every change to a trip, a driver, a bus, a customer, a contact or a location in a data table, newest first, fifty at a time with Show older for the next fifty. Three choices narrow it to one kind, to one person and to today, yesterday or the last 7 or 30 days. `history.html?trip=<id>`, which the bar menu's History opens, narrows it to one trip, and `history.html?record=<id>`, which the History link on a record's own page opens, to one record. A row opens what it is about; an entry for something deleted opens nothing. The database does the narrowing, in `search_history`. |
| Pending marks on the bar | drop | A missing itinerary, purchase order or balance is what the follow-up reminder waits on, so the reminder asks for it; drawn on the bar as well, the itinerary and trip contact marks sat on four in five upcoming trips and said nothing. |
| Newest update on the bar | keep | A row between the times and the drivers holds the trip's newest update on one line, cut where the bar ends, whichever update is pinned; a trip with none leaves it empty. While the trip has anything open, a warning on its card or a confirmation, PO, itinerary or balance the office still waits on, the words take the colour of the update's age, and a settled trip's stay in the bar's ink: green while the card's age reads in minutes, hours or 1d, amber for the rest of its first week, red once the card shows a date, except on an amber bar, where none of the three reads and the words keep the bar's ink. No mark leads the row, since the colour is the mark; the tooltip is the update whole and its stamp. Newest update in the week's More menu turns the row off, as it does the others. The phone's sheet leaves it out, because the updates are read just above the trip there. |
| Bus fit | keep | A bar whose bus is the wrong type for its vehicle, or falls short of a need its vehicle carries, including equipment the Fleet page records, turns the bar's alert count red; its card says what is wrong in a red band above the reminder. |
| Needs and trip contact | keep | On the card's warning band, only what needs doing: a need the bus falls short of in the red band, and a need still to do, Hotel booking pending or HOS form pending; a met need is not shown. Hours of service is a need on a bus with a part-time driver in any seat, done once the Forms page marks that leg's hours-of-service record printed, and printed among the requirements on that driver's own envelope. A trip with no trip contact, and not marked as needing none, says Trip contact missing in the card's warning band. |
| Placeholder bar | keep | Amber is the office's placeholder, a trip not yet quoted, named Placeholder in the colour menu. Its bar is a yellow tint beside the others in a light theme and the warning colour in a dark one, and is never marked as the wrong bus, and draws no empty seat and no Needs a bus; a driver someone has named still shows. |
| Upload itinerary | keep | On the bar's right-click menu, in place of Open itinerary on a trip without one. |
| Driver status marks | keep | The drivers row lists the crew in role order: a small dot for a driver or co-driver and two opposite arrows for relief, then the short name, six pixels between them. The dot or arrows take the status's colour, one step of the run each: white Not sent, amber pending response, green confirmed, red pending assignment or declined. A declined name is struck through, and a role that is on with nobody in it has no status either: its white mark and No driver, No co-driver or No relief, dimmed as No times is. On a leg from today to the end of next week the empty role's mark and words take the warning colour at full strength, so the seats to fill now stand out from those further off; the amber bar keeps its own ink. When the names do not all fit, the row keeps the first and counts the rest, "Raul +1". The tooltip names the role, the status, who set it and when. |
| Assign driver menu | keep | Assign driver, or Change driver, on the bar's right-click menu after the itinerary: the driver on the bus now with Remove driver, which asks first when that driver has been sent the trip or has confirmed it, since removing tells them nothing, then every active driver in the order the Buses tab ranks them for that bus's leg, the free ones first with a back-to-back one marked and one whose licence or medical card runs out before the leg ends marked with a red alert, the busy ones after, greyed and not pickable, and More drivers, which opens the trip on its Buses tab. A pick fills the bus's Driver seat and saves at once, starting the driver at Not sent. Hidden on the trip in the editor. |
| Suggest drivers | keep | Suggest drivers… in the week's More menu opens a modal with one row per bus on the board whose Driver seat is empty, declined or pending assignment, ticked, or not sent while a free driver of better priority exists, unticked. Each row has a select of the free drivers in the Buses tab's order, the first in the automatic order chosen, or a blank when no one is free and rested, planned earliest leg first so one driver never takes two buses on a day. Apply saves the ticked rows at once, starting each driver at Not sent; a row that fails stays with its error. Vehicles with no bus yet, placeholder trips and the trip in the editor are left out. |
| Driver status menu | keep | One item per driver on the bar's right-click menu, after Mark hotel booked, whose submenu sets that driver's status at once. |
| Bar menu | keep | Every action on the bar, in four groups parted by rules: open the trip and its itinerary; Forms, which opens the trip's list of forms, the quote calculator, which opens the trip beside it, and Add update, which opens the trip's Updates window; the trip's colour, hotel and drivers' statuses; Take off this bus and Cancel trip. Each item carries the icon its shortcut carries, and what cannot act on the bar is hidden. |
| Open email thread | keep | In the trip editor rather than on the bar: an open icon on the Booking contact title line once the trip has a thread, whose menu adds, changes or removes it through a small box. The field itself never shows. |
| Saved record mark | keep | In the trip editor, a small Saved contact, Saved customer or Saved location link right after the label of a field picked from the saved lists, opening that record in a new tab; one typed by hand has none. Under a linked contact's phone or email that differs from the saved one, a grey line says the saved value. |
| Realtime refresh | later | |
| Compact board | keep | Where the board itself cannot show three readable days, which is a phone, it draws all seven instead of scrolling to about two. A trip is a 44px block in its colour carrying a code of up to three letters for its destination and nothing else, the same on every block however long; the day band numbers the days; the shortcut bar docks to the bottom edge with the rows the block gave up. `placeRoom` turns it on from the board's own width, never from what the panels leave. |

View preferences stay in `localStorage`, read with a try-catch; none goes to
the database. Dropped: the day column width slider, the second bar size, the
now line.

## 4. Public and standalone pages

| Page | Verdict | Becomes |
|---|---|---|
| `../rux-ui/intake.html` | later | Needs the Worker's extract route and the itinerary component. |
| `../rux-ui/m.html`, `../rux-ui/d.html` | keep | Redirect stubs, unchanged. |
| `../rux-ui/doc.html` | keep | Redirect by document id, unchanged. |

Dropped: `../rux-ui/gallery.html` and the four specimen pages.

## 5. Order of building

Each step ends with the page opened in every theme.

5. Print schedule.
6. Everything marked *later*.

## 6. Not verified

The tab and field lists in §2 come from the old markup's element ids, not a
running page.

## 7. Where a surface lives

Three homes, and one rule for choosing.

| Home | What goes there |
|---|---|
| **The panel** | The detail of the thing you opened. One region right of the board, one open at a time. |
| **A page** | A list, a feed or a workspace: something you navigate to. |
| **A menu or a modal** | Options that change how the page draws, and one-off actions. |

- **Trip detail goes in the panel.** One editing surface beats
  two. A driver, a bus, a contact, a customer and a location are each edited
  on their own page, `drivers.html?id=`, `fleet.html?id=`,
  `contacts.html?id=`, `customers.html?id=` and `locations.html?id=`, because
  each is a list you go to and its record opens from that list;
  Design's `list-page.html` and `record-page.html` templates are the shape they
  all take, and `scheduler/pair.js` what they do alike.
- **Tasks and History are pages.** Neither is the detail of anything, and as
  panels they would hold the panel open. History is last in the nav:
  it is consulted, not worked in.
- **View options go in the toolbar's overflow menu.** Start on Sunday and the
  bar-row toggles are there; time-aligned and two weeks join when the grid can
  draw them. It hangs under its ⋮ and opens attached to it, one surface.
- **The week label is the date-picker trigger.** A permanent mini calendar
  spends standing space on an occasional action. On a phone the label is the
  week's months and year, "Sep – Oct 2026", so Driver availability fits beside
  it; the day header numbers the days.
- **A trip's file reads in its own panel left of the board,** beside the trip
  panel, because it is read while the trip is edited. Any file opens there,
  with its type above the destination, and so does a form `print.html` draws.
- **A panel is beside the week or in front of it, never over it.** Every open
  panel sits beside the week while the board holds them and the week's 19.5rem
  minimum; past that the newest comes in front of the board, dimming what it
  covers, and the rest wait behind it. The viewer shown something new is the
  newest again. Nothing closes itself and nothing is refused. A panel in front
  sits 16px in from the header and every edge, and Escape, its close button or
  the dim leave it; `placeRoom` in `scheduler/data.js` decides which is front.
- **A generated form is a page, not a modal.** `print.html` draws it and the
  document viewer frames it, so nothing has to hide the board in order to
  print, and two forms on different paper never argue over one `@page`.
  A form with a mark, the envelope, the itinerary and the hours-of-service
  record, carries a Printed box beside the panel's Print, ticked by hand,
  which the trip's checklist reads; a trip's Forms list says Printed on such a form's row once
  every copy is ticked, and "1 of 2 printed" until then. The itinerary's Layout picks Simple, the
  driver's sheet, which says Rest in sleeper on a stop whose wait is sleeper berth, or Detailed, the office's, with Destination, Client and Contact on one line
  under the bar, the yard at both ends, each wait marked On duty, Off duty or Sleeper berth, and the Route tab's Miles, Drive, On
  duty and Less rest, each day's on its heading and the total after the
  stops, then the Billing tab's saved quote lines: the rental's miles, days,
  mileage rate and dead miles, flagged when the route's miles have moved
  since, each second driver, relief, hotel and discount line and the total,
  the two tables kept together and moved to the next sheet rather than cut;
  Detailed has no Printed box and is never offered on a blank form.

### The driver availability grid

A compact grid left of the board, turned on by the toolbar's Driver
availability toggle. Dispatch reads the schedule and availability together, so
it is a companion view, not panel content, and it stays on until turned off.

| | |
|---|---|
| **In the trip panel** | Nothing. The panel carries the trip's own drivers. |
| **On the Drivers page** | The same grid, nothing highlighted. |
| **A popover** | The per-driver card (photo, city, phone, licence and medical expiry), from a cell. |

The grid and the panel can both be open. Only the panel is one at a time.

A driver's name is a toggle: pressed, it puts down the selected trip and its
card, every bar but that driver's dims on the board, and their name is set in
semibold on their own bars. Selecting one of their trips keeps them picked;
selecting a dimmed trip, the same name again, Escape, or hiding the grid puts
the board back. Right-click or hold a name for its menu: Send trips opens the
Driver view for that driver and Open driver their record, each in a new tab;
Call and Text, shown with a number, reach them as a trip's Contacts do; and
Pick out trips, or Show every trip while they are picked, is the name's own
press. A busy day selects its
trip, the next one each click on a day of two. A busy day after a trip the day
before shows the hours off between them, from the earlier trip's return to the
yard to the later one's departure: "15h", in the warning tone under 10 hours,
"!" where the two overlap, and "?" until both trips have times.

With two weeks on the board the grid shows one of them: the week the selected
trip starts in, or with nothing selected the week holding today, else the
first. Its head's days button shows both weeks, widening the pane from 20rem to
40rem so each day keeps its size, and the browser keeps that choice.

### Time at the yard

A view option in the board's overflow menu, off until turned on and kept by
the browser. On, a card the trips' own height sits between two trips of one
bus on days side by side, and the two trips pull their facing ends back to make
room: a clock, the hours from the earlier trip's return to the yard to the
later one's departure, and "yard", for cleaning and fuel. Under 4 hours, "?"
until both trips have times, or "!" where they overlap, the card takes the
warning tone. A day or more at the yard draws no card. The compact board's
days are too narrow to give up room, so it shows none.

### The trip bar does not expand

A bar growing on click re-stacks the lanes beside it. Its information is the
panel's job; its actions go in the panel header and on the bar's right-click
menu. On the compact board a block has no writing to grow into either: the
docked shortcut bar carries it at the bottom edge, and the block itself is the
same size selected or not.

### Selecting is not opening

A click selects a trip bar, its outline and its days in the driver grid, kept
through any read of the same week, such as a save or a live change. A
right-click selects it too, its card waiting until the menu shuts. The Open trip slot on the selected bar's shortcut bar, a double-click,
Enter or the bar's right-click menu loads it into the panel, and the board
scrolls across to show that trip whole beside it. A trip opens on the tab the
last one was on. New trip is the toolbar's last button, its + alone where the
words do not fit, and a row of the overflow menu where the toolbar has no room; it puts down the selected trip and opens
on Details. The shortcut bar floats clear of the
trip, placed the way a calendar's event popover is: beside the trip's first
day, where everything the trip says is written, over the two days after it,
the trip's own or the board's, with its arrow at that day's middle; over the
two days before it where the two after are not both on screen, as at the
week's end or on a board scrolled sideways; and above or below the trip only where neither side has room, slid back inside
the board at either edge with its arrow still pointing at the trip. Nothing is taken from the trip, so the
slots are the same on every trip however short or narrow. The card is a raised
surface a step lighter than the board inside a hairline, so it stands off the
week on a dark theme as well as a light one. It is sized to the week: two
days wide and two buses tall, or up to five where the trip's updates need the room, 16px inside the cells it
covers, centred on the trip, so it covers about half the trips above and below
it. Each slot carries its word under its icon, the four in one 40px row; each
warning and each one-line update is a 32px row in 14px type, the warnings
bold, 16px in from the card's sides, as a Carbon popover's content is; a
warning's leave day drops under its words where both do not fit one line. When the card opens above the
trip the slots come last, next to it. The card opens with its warnings, plain
rows on the card's own surface with no tint: a bus that does not fit behind a
red bell, then the follow-up reminder, Trip contact missing, and each need
still to do, Hotel booking pending or HOS form pending, each a line of its own
in bold behind the bar's yellow bell. A warning is a press that goes to its
fix: the Itinerary slot, Forms, or the editor on Buses, Details or Billing
with the cursor in the field it names.
No warning has a dismiss; each stays until it is put right. Needs that are
met are not shown.
Then the updates: Updates in Carbon's 14px heading, its count in a grey tag,
and + Add, a ghost button, at its end, over every update in
full, the pinned one first, led by a pin where an update's avatar stands, and
the rest newest first, each with its age at the right (45m, 2h, 3d, or its
date, Sep 22, past a week), scrolling past the card's height and fading at its
foot while there is more below; a line from the old notes shows a note icon.
An update is a press that opens it in the Updates window; its pin, over the
age on hover, pins or unpins it, with Undo in the toast. Add opens a box under
the title that adds a typed line on Enter; Escape or leaving it empty closes it.
The docked sheet has the same rows and presses but shows two updates, the
pinned and the newest, cut to one line; a press elsewhere on the section, or
its title's arrow, opens every update in full. Add is its own button. An
update's author is its avatar's tooltip. With none, the title says No updates.
In the Updates window each update has a pin at its corner, on hover or lit blue when pinned, and Pin this update under the box, ticked for a new trip, pins what is written as it is added;
a trip has one pinned update, and pinning another lets the first go. The trip
has no notes of its own: a note saved in rux-ui becomes the pinned update.
Only the selected trip has a
card. Every trip has the same four slots: Open trip, the itinerary,
opened or uploaded, Forms and Contacts; every other action is on the
right-click menu. Contacts opens Contact list, a centred window as Updates is,
of one Carbon contained list: the booking contact, the trip contacts, then
every driver on the leg, this bar's bus first. Each row names who they are
to the trip ("Booking contact", "Trip contact", "Booking and trip contact" for
one person who is both, "Bus 218 Driver") over their name and number, with
Call and Text, on a phone each its word under its icon beside the person. A ⋮ beside the close button holds the rest: Text all drivers,
one group message from two drivers up; once a driver has confirmed, Email
driver details and Copy driver details, the letter to the booking contact of
every bus with its confirmed drivers' names and numbers, each leg under its
date when their crews differ; Email for a contact who has an address; Remind
for each driver, a text with their reminder of the leg typed in: "Hi Oscar,
a reminder for your trip tomorrow:", then the leg in the Driver week info
message's own lines, from `scheduler/driver-text.js`, and the newest
itinerary's link; and Add number for a person with none. On a screen md or wider Remind is a button
in its driver's row, and the booking contact's holds Driver info, which copies the driver details, and
Email, each before Call and Text; the menu holds what is left. A driver's Text opens their Google
Messages link on a computer where the Drivers page holds one; there, Remind copies the reminder first, to paste. A call, text
or email to the customer's people, and the driver details, offer to add it to the trip's updates,
and writes nothing if the offer is ignored. A shortcut that cannot act on the trip, such as the
envelope on a bus with no driver, shows faint with the reason as its label. Escape clears the
selection and takes the bar with it. The panel keeps its trip through week changes and other selections, so a call
about another trip does not cost an edit in progress, and it asks before
unsaved changes are lost.

While a trip is in the panel its bars are locked on the board: they do not
drag, and their bus, colour and hotel are the panel's to change, so each
changes in one place. The bar the panel holds loses its shortcut bar, because
the editor is showing that trip. The editor has no shortcut row:
the itinerary is on the Files tab, Forms is in the panel head's Trip actions menu, and the
quote calculator is Open calculator on the Billing tab. Every bar of the open
trip — the return leg, or the same leg on another bus, too — wears the
selection's ring with a brighter arc running round it, which costs none of
its writing; with reduced motion the ring stands still. The other bars of a
trip merely selected wear the selection's still ring, as the selected bar does. Save checks the trip's `updated_at` against the value
the panel opened with and asks before replacing a change someone else saved
in between.
