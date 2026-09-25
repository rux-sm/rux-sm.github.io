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
| Requests | keep | `table-page` with a content switcher for status. Detail opens in the panel. |
| Itineraries | later | Needs the itinerary editor, an app component, and the AI intake. |
| Settings (`Options`) | keep, trimmed | `settings-page`. Yard, requirements, billing defaults. Saved locations have their own page, `locations.html`. Mapbox and Extract keys move with intake. |

The side nav lists only pages that exist; each view is added when its page is.
Dropped: Documents, Game, the Samsara and Gallery links.

## 2. Editors and panels

| Old surface | Verdict | Becomes |
|---|---|---|
| Trip editor, Itinerary and Files tabs | keep | Tabs in the trip panel. Files holds the Itinerary not needed switch, Carbon's file uploader and the trip's itineraries, contracts and POs, newest first, each replaced or deleted from its row menu; a file writes at once, stored as rux-ui stores it. The itinerary grid is *later*. |
| Document viewer | keep | A `rux--side-panel--md` column left of the board, framing the PDF beside the trip panel. A file always opens there, never in a browser tab: where the board cannot hold the column beside the week, the panel comes in front of the board instead. |
| Trip editor, bus and driver assignment | keep | The Fleet tab: Buses needed per leg, then a tile per bus with a bus combo box and a combo box per seat, Driver always and Co-driver, Relief at start and Relief at end from the group's menu, a relief with Swap time and Note. Each seat's status is a Carbon status icon at the end of its field that opens the five statuses, and changing a driver resets that driver's status to Not sent, as rux-ui does. The pickers name what clashes on the trip's dates and a picked clash warns. The driver picker lists free drivers first, strictly by priority, and within a priority a driver with no back-to-back trip first, then the fewest days driven in the last four weeks; busy and away drivers follow with the reason, and a picked back-to-back driver warns. Assign best, at the head of each leg's buses, fills only that leg's empty seats, Driver seats first, each with the first free driver not already on the leg in the automatic order: any driver with no back-to-back trip, whatever their priority, before a back-to-back one, who is taken only with 10 hours from the one trip's return arrival to the other's departure and never when a time is missing, and leaves every chosen driver as it is; Save or Reset decides; a driver in two seats of one leg blocks Save. Fewer buses asks first when a bus that goes holds a bus or a driver. Saved with the trip, by id. Pay stays in rux-ui. |
| Trip editor, larger size | keep | A button beside the panel's close button swaps Carbon's medium panel, 30rem, for its extra-large one, 65rem, in front of the dimmed week, with each tab's sections in two columns; the choice is kept in this browser. |
| Trip editor, Billing tab | keep | A summary card with the confirmation and billing status, then Price, Quote lines, Contract signed, PO received, Invoice sent and Payments, each milestone a switch on its heading. The switches open as rux-ui opens them, and a milestone the billing workflow turns off is hidden. Quote lines are priced by the quote calculator from the trip's miles, dead miles and days, can be typed over and reordered, and Copy for QuickBooks copies each of them. |
| Charter or Ticketed, ticket prices | later | With the trip manifest. |
| Trip editor, Route tab | keep | One section: Pickup location, Depart beside End, and Drop-off location when the trip is not a round trip; its overflow menu opens Padding and the drive fields. A Times section lists yard depart, spot time, depart, end and yard return, each with what it was worked out from; drives are looked up from Mapbox. Under them a closed Full itinerary section lists the stops between the pickup and where the group is let off, each with its times, drive and wait, and a dialog adds, edits, moves or removes one; a round trip is let off at its pickup. Untouched, the tab edits only the leg's pickup, first stop, drop-off and return rows; once the list is touched, Save rewrites the leg's stops in its order and keeps day and sleeper rows where they are. |
| Customer editor | keep | The Contacts page's record: name, organization, phone and email (§7). |
| Request detail | keep | Panel with a Create draft trip button. |
| Itinerary editor | later | App component, with the Itineraries view. |
| Trip manifest | later | Passengers as a `table-page` section under the trip, edit in a modal. |
| Trip finder results page | keep | `trips.html`, every trip in a data table with search, a Show choice and pagination; a row opens its trip on the board. Results in a data table on a page. The schedule's toolbar search, always open, and Cmd-K exist. It finds cancelled trips too, tagged Cancelled; one opens a dialog with the date and reason and a Bring back button. Cancelling needs a typed reason. |
| Contact info, Driver week info | later | Modals with a text area and the copy button module. Sending marks each sent driver Pending response unless already confirmed or declined, as rux-ui does. |
| Print schedule | later | An entry in `print.html`'s registry beside the driver envelope's, the driver itinerary's and the customer quote's, naming what it binds to and the paper it takes. |
| Requirements editor | keep | Settings section; a contained list with an add row. Icons come from the rux sprite by a fixed name. |
| Notifications | later | Shell header panel, the one the switcher uses. |
| Driver card | later | Popover from a cell of the availability grid (§7). |

Dropped: dev notes, team chat and presence, and the old profile menu (the
Design account panel replaces it).

## 3. Schedule view in detail

| Behaviour | Verdict | Note |
|---|---|---|
| Time-aligned mode | later | The grid places by day. |
| Two-week view | decide | The grid fetches one week. |
| Tasks, History | later | Pages (§7). |
| Pending marks on the bar | drop | A missing itinerary, purchase order or balance is what the follow-up reminder waits on, so the reminder asks for it; drawn on the bar as well, the itinerary and day-of contact marks sat on four in five upcoming trips and said nothing. |
| Bus fit | keep | A bar whose bus is the wrong type, or falls short of a need the trip carries, has a red edge inside it, the shape of the selection ring; its card says what is wrong in a red band above the reminder. |
| Needs and day-of contact | keep | On the card, at the Notes heading's end: each need's icon, quiet where the bus meets it, red where it falls short, with its name on hover and written beside it on the phone; then a phone in the warning colour when the trip has no day-of contact. |
| Placeholder bar | keep | Amber is the office's placeholder, a trip not yet quoted, named Placeholder in the colour menu. Its bar is a yellow tint beside the others in a light theme and the warning colour in a dark one, and is never marked as the wrong bus, and draws no empty seat and no Needs a bus; a driver someone has named still shows. |
| Upload itinerary | keep | On the bar's right-click menu, in place of Open itinerary on a trip without one. |
| Driver status marks | keep | The drivers row lists the crew in role order: a person icon for a driver or co-driver and two opposite arrows for relief, then the short name. The icon sits on a disc in the status's colour, one step of the run each: grey Not sent, amber pending response, green confirmed, red pending assignment or declined. A declined name is struck through, and a role that is on with nobody in it is its red icon alone. The tooltip names the role, the status, who set it and when. |
| Assign driver menu | keep | Assign driver, or Change driver, on the bar's right-click menu after the itinerary: the driver on the bus now with Remove driver, which asks first when that driver has been sent the trip or has confirmed it, since removing tells them nothing, then the five free drivers the Fleet tab would list first for that bus's leg, a back-to-back one marked, and More drivers, which opens the trip on its Fleet tab. A pick fills the bus's Driver seat and saves at once, starting the driver at Not sent. Hidden on the trip in the editor. |
| Suggest drivers | keep | Suggest drivers… in the week's More menu opens a modal with one row per bus on the board whose Driver seat is empty, declined or pending assignment, ticked, or not sent while a free driver of better priority exists, unticked. Each row has a select of the free drivers in the Fleet tab's order, the first in the automatic order chosen, or a blank when no one is free and rested, planned earliest leg first so one driver never takes two buses on a day. Apply saves the ticked rows at once, starting each driver at Not sent; a row that fails stays with its error. Placeholder trips and the trip in the editor are left out. |
| Driver status menu | keep | One item per driver on the bar's right-click menu, after Mark hotel booked, whose submenu sets that driver's status at once. |
| Bar menu | keep | Every action on the bar, in five groups parted by rules: open the trip and its itinerary; Forms, a submenu of each form and All forms; the trip's colour, hotel and drivers' statuses; Take off this bus and Cancel trip; Customize shortcuts. Each item carries the icon its shortcut carries, and what cannot act on the bar is hidden. |
| Open email thread | keep | In the trip editor rather than on the bar: an open icon on the Booking contact title line once the trip has a thread, whose menu adds, changes or removes it through a small box. The field itself never shows. |
| Realtime refresh | later | |
| Compact board | keep | Where the board itself cannot show three readable days, which is a phone, it draws all seven instead of scrolling to about two. A trip is a 44px block in its colour carrying two lines and no icons, the destination and the departure, the same on every block however long; a double booking is a band across its foot; the day band numbers the days; the shortcut bar docks to the bottom edge with the rows the block gave up. `placeRoom` turns it on from the board's own width, never from what the panels leave. |

View preferences stay in `localStorage`, read with a try-catch; none goes to
the database. Dropped: the day column width slider, the second bar size, the
now line.

## 4. Public and standalone pages

| Page | Verdict | Becomes |
|---|---|---|
| `../rux-ui/driver.html`, token in the query | keep | Header-only shell, mobile first, trip legs as tiles with Accept and Decline, through the existing RPCs. |
| `../rux-ui/maintenance.html` | later | Same shell, a read-only bus by day grid; may reuse the week grid. |
| `../rux-ui/request.html` | keep, with Requests | Public `form-page`, submits through the existing RPC. |
| `../rux-ui/intake.html` | later | Needs the Worker's extract route and the itinerary component. |
| `../rux-ui/m.html`, `../rux-ui/d.html` | keep | Redirect stubs, unchanged. |
| `../rux-ui/doc.html` | keep | Redirect by document id, unchanged. |

Dropped: `../rux-ui/gallery.html` and the four specimen pages.

## 5. Order of building

Each step ends with the page opened in every theme.

5. Print schedule. Requests and `../rux-ui/request.html`. Driver page.
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

- **Trip and request detail go in the panel.** One editing surface beats
  two. A driver, a bus, a contact, a customer and a location are each edited
  on their own page, `drivers.html?id=`, `fleet.html?id=`,
  `contacts.html?id=`, `customers.html?id=` and `locations.html?id=`, because
  each is a list you go to and its record opens from that list;
  `docs/plans/site-page-pair.md` decides the shape they all take.
- **Tasks and History are pages.** Neither is the detail of anything, and as
  panels they would hold the panel open. History sits below Settings in the nav:
  it is consulted, not worked in.
- **View options go in the toolbar's overflow menu.** Start on Sunday and the
  bar-row toggles are there; time-aligned and two weeks join when the grid can
  draw them.
- **The week label is the date-picker trigger.** A permanent mini calendar
  spends standing space on an occasional action. On a phone the label is the
  week's months and year, "Sep – Oct 2026", so Driver availability fits beside
  it; the day header numbers the days.
- **A trip's file reads in its own panel left of the board,** beside the trip
  panel, because it is read while the trip is edited. Any file opens there,
  with its type above the destination, and so does a form `print.html` draws.
- **A panel is beside the week or in front of it, never over it.** Every open
  panel sits beside the week while the board holds them and the week's 17rem
  minimum; past that the newest comes in front of the board, dimming what it
  covers, and the rest wait beside the week behind it. Nothing closes itself
  and nothing is refused. `docs/plans/scheduler-panel-placement.md` decides it.
- **A generated form is a page, not a modal.** `print.html` draws it and the
  document viewer frames it, so nothing has to hide the board in order to
  print, and two forms on different paper never argue over one `@page`.

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

With two weeks on the board the grid shows one of them: the week the selected
trip starts in, or with nothing selected the week holding today, else the
first. Its head's days button shows both weeks, widening the pane from 20rem to
40rem so each day keeps its size, and the browser keeps that choice.

### The trip bar does not expand

A bar growing on click re-stacks the lanes beside it. Its information is the
panel's job; its actions go in the panel header and on the bar's right-click
menu. On the compact board a block has no writing to grow into either: the
docked shortcut bar carries it at the bottom edge, and the block itself is the
same size selected or not.

### Selecting is not opening

A click selects a trip bar: its outline, and its days in the driver grid. The
Open trip slot on the selected bar's shortcut bar, Enter or the bar's
right-click menu loads it into the panel. The shortcut bar floats clear of the
trip, placed the way a tooltip is: above it where there is room, below it where
the day band is in the way, and slid back inside the board at either edge with
its arrow still pointing at the trip. Nothing is taken from the trip, so the
slots are the same on every trip however short or narrow. It holds Open trip,
then the person's own choices in the order they set them — the itinerary,
opened or uploaded, the driver envelope, the driver itinerary, the customer
quote, all forms, Assign driver, Color, Mark hotel booked, Take off this bus or Cancel trip —
set from the right-click menu's Customize shortcuts and saved on their
profile. An empty
choice is left out, and an empty slot only pads the row up to three, the
fewest it ever shows: three slots at 40px come to 120px, which is exactly what
a one-day trip bar is at the narrowest day column, because that column is
sized from this bar. A padding slot
shows a dashed circle and opens Customize shortcuts; a fourth action and
beyond are added from the right-click menu. Contacts and Add update close
every row: Contacts opens a small window of cards in three parts, the
customer's people, the crew on that bus and the crew on the trip's other
buses for that leg, each with its role, number, and Call and Text buttons,
Email for a booking contact who has one, and a driver's status and report
time. A person with no number says so, with Add number. Two drivers or more
add Text all drivers, one group message. A driver's Text opens their Google
Messages link on a computer where the Drivers page holds one. A call, text
or email to the customer's people offers to add it to the trip's updates,
and writes nothing if the offer is ignored. A shortcut
that cannot act on the trip, such as the envelope on a bus with no driver, shows faint
with the reason as its label. Escape clears the selection and takes the bar
with it. The
panel keeps its trip through week changes and other selections, so a call
about another trip does not cost an edit in progress, and it asks before
unsaved changes are lost.

While a trip is in the panel its bars are locked on the board: they do not
drag, and their bus, colour and hotel are the panel's to change, so each
changes in one place. The bar the panel holds keeps the shortcut bar, whose
first slot turns into an X and closes the trip; the slots the panel has taken
over stay in place and say to change it in the editor. Its other bars — the
return leg, or the same leg on another bus — wear a dashed ring in the
selection's colour, which says they belong to the open trip without costing
any of their writing. Save checks the trip's `updated_at` against the value
the panel opened with and asks before replacing a change someone else saved
in between.
