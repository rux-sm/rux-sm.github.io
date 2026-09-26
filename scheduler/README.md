# Scheduler

Fleet scheduling and dispatch — one app on [design](../design/),
served at **rux-sm.github.io/scheduler/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

A week board: buses down the side, days across, one bar per assignment, behind
a staff log-in. It reads and writes the Supabase tables the `rux-ui` app also
writes — trips and their stops, bus and driver assignments, contacts, payments, POs and
invoices — and runs beside it; rux-ui stays in use.

That database is production and shared with `rux-ui`, so nothing here is
ever tried with a test record.

`trips.html` lists every trip, cancelled ones with their reason, searched,
sorted, filtered to upcoming, needs follow-up, past or cancelled, and paged
fifty at a time. A row opens the trip on the board through
`./?trip=<id>&date=<day>`, and a cancelled one opens its cancelled dialog
there. Its Follow-ups dialog sets the office's follow-up wait and snooze;
`follow-up.js` holds the rules the list and the board share, on the billing
rules in `billing.js`.

`fleet.html` lists every unit, a coach, van or any vehicle, by its type and
then its model year, and edits one at `fleet.html?id=`. Its Vehicle types
dialog edits the office's own list of types, and `vehicles.js` names a unit
everywhere as its type and number. `buses.html` forwards to it.

`drivers.html` lists every driver, flags a licence or medical card that has
run out or will within 45 days, and edits one driver at `drivers.html?id=`:
details, photo and time off. A driver is set Inactive, never deleted, and the
driver's schedule link is shown there but still made in rux-ui. A trip in a
driver's list opens on the board through `./?trip=<id>&date=<day>`.

`contacts.html` lists every contact, the people who book and travel, with
their customer, phone, email and trips, and edits one at
`contacts.html?id=`. A contact on any trip is never deleted, and editing one
never changes a trip, which keeps the phone it was saved with.

`locations.html` lists the saved places a bus goes, which rux-ui's itinerary
search reads too, and edits one at `locations.html?id=`. An address is picked
from the map search in `places.js`, so every place has its map point. A trip
keeps its own copy of each stop, and a location a customer uses as their usual
pickup is never deleted.

`customers.html` lists who pays, each with a usual pickup picked from
Locations and a bill-to address only when bills go somewhere else, and edits
one at `customers.html?id=`. Two customers never share a name, since
QuickBooks matches on it; renaming one renames the organization text its
contacts carry, which rux-ui shows.

Those five pages save through `pair.js`, which also holds what they show and
do alike: the notices, search, sort, field errors, the unsaved-changes and
conflict modals and the staff gate. A new record's id is made before its
insert, and each write that lands is kept as the page's saved state, so a Save
that stops partway says what did not save, and Save again sends only the rest:
never a second bus, a doubled day out or a conflict with the page's own write.
A phone number is shown through `phone.js`, on those pages, the board and the
forms, a ten-digit US number as (956) 994-1169; what is stored stays as typed.
Every page loads `people.js`, which shows who else has the Scheduler open as
faces in the header, each a link to that person's page or open trip; the
board adds which trip each person is on through it.

In the trip editor, Customer is picked from that list and saved with the trip;
a name not in it becomes a new customer on Save. Picking the booking contact
fills an empty customer, a customer fills an empty pickup and drop-off from
its usual pickup, and the address search offers saved locations first. The
quote's bill-to is drawn from the trip's customer.

After a trip saves, Update your lists offers what the edit brought that the
lists lack: a person who is no one's contact yet, a contact's missing or
different phone or email, and a pickup or drop-off no location holds. Nothing
is added to a list unless ticked, and the trip is saved either way.

On the compact board a swipe slides one week of trip cells under fixed date and
bus headers; a week not yet loaded shows a loading mark after 200 ms, slides in
when it lands, and a failed load keeps the current week and offers a retry.

The quote page, `quote.html`, is the quote calculator: the office spreadsheet's
formulas in `quote.js`. Its rates, and the rules the formulas follow such as
the 295-mile line, are edited on `quote-rates.html` and kept in the
`quote_rates` and `quote_mileage_rates` tables, which only a staff session
can read or change. Its Rules tab says how a quote is priced and lists where
it copies the spreadsheet's quirks, each worked out at the saved rates.

`print.html` is the forms this app fills in and prints. On its own it lists
them; with a form named in the query it reads that form's subject and draws it,
filled in. The driver envelope is one copy per seat on a bus, in a standard and
a multi-stop layout, on the 6 by 9 envelope itself. The driver itinerary is one
copy per leg of a trip, on Letter, running onto as many sheets as its stops
need, and every line of it can be typed into before it is printed. The
customer quote is one copy per trip, on two Letter sheets: the QUOTE / PROPOSAL
the office sends, with its estimate number, price and first line item read from the trip, lines
typed under it that the Total adds up, and the Terms and Conditions Agreement
Form behind it; Save as PDF names the file for the trip's first day,
`2026-12-05-qt`. Its wording is `quote-text.js`, which the trip editor's
Copy for QuickBooks button reads too, so a pasted estimate and a printed quote
cannot disagree. `print.js` holds the registry every form is an entry in; a
new form names its group, its short name for the tile, one line under it, a
Material icon from Design's sprite, what it binds to and its paper, and the
page gives it the same tile, frame and fit as the rest. A form leaves as paper
or as Save as PDF in the print dialog, which keeps its type sharp. The page
follows the theme the person keeps and the sheet on it carries the light one,
so the ink drawn there is the ink that prints. After a sent quote: `docs/booking.md`.

The pages in `share/` are for people without a log-in, who arrive by a link:
`share/document.html` opens a trip document, `share/maintenance.html`
shows the maintenance crew two weeks of buses and the recent changes, and
`share/driver.html` shows a driver the trips dispatch sent them to accept or
decline, a card of basics each, whose View itinerary opens the itinerary
file uploaded to the trip and View envelope opens `share/form.html`, which
draws the forms page's envelope from the same link. Staff see the same schedule inside the app at `maintenance.html`,
from the side nav, where they copy the public link to send and replace it
when it has gone further than it should, and a driver's page at
`driver-view.html`, from See their page on the Drivers page, where they tick
the trips to send, copy the message and make, update or revoke the link.

Staff can also work the schedule from the Claude app, which asks the
`scheduler-connector` Edge Function, with its source in `connector/`. It reads the live tables and writes no trip: a trip Claude
fills in comes back as a link that opens the editor at `./?draft=<id>` with
the filled fields marked, and Save there writes it. `docs/working-from-claude.md`
is how to use it, and section 4 of `docs/database-inventory.md` is what it is.
The link pages open a trip document through the other Edge Function,
`trip-document-link/`, which hands back a ten-minute link to the file.

The schedule grid and the trip bar are this app's own; Carbon has neither.
Everything else is Design's, linked live at `/design/…` with no copy here and
no pin to move.

## Run and check it

From the repository root, one level up:

    npm run check        # Design's shared check over this app, plus the sprite

Open it at http://localhost:8641/scheduler/, the always-on preview the root
`README.md` describes; the pages link `/design/…` absolutely, so this folder is
never served alone. The check cannot see whether the page looks right. A push to
`main` publishes it, as the root `AGENTS.md` says.
