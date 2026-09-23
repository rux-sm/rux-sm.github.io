# Scheduler

Fleet scheduling and dispatch — one app on [design](../design/),
served at **rux-sm.github.io/scheduler/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

A week board: buses down the side, days across, one bar per assignment, behind
a staff log-in. It reads and writes the Supabase tables the `rux-ui` app also
writes — trips and their stops, bus and driver assignments, contacts, payments, POs and
invoices — and is that app's replacement, mid-flight.

That database is production and shared with `rux-ui`, so nothing here is
ever tried with a test record.

`drivers.html` lists every driver, flags a licence or medical card that has
run out or will within 45 days, and edits one driver at `drivers.html?id=`:
details, photo and time off. A driver is set Inactive, never deleted, and the
driver's schedule link is shown there but still made in rux-ui. A trip in a
driver's list opens on the board through `./?trip=<id>&date=<day>`.

On the compact board, a swipe moves one week of trip cells while the date and
bus headers stay fixed. Stationary cell viewports clip the moving bars at the
bus-column boundary during both dragging and settling. Further swipes during a slide are ignored. Cached weeks
are ready after the slide; background refreshes wait for a gesture to finish
before repainting. An uncached week keeps the current board visible, shows a
loading indicator after 200 ms, then slides in when ready. The indicator clears
when the week lands; a failed load keeps the current week and offers a retry.

The quote page, `quote.html`, is the quote calculator: the office spreadsheet's
formulas in `quote.js`. Its rates are edited on `quote-rates.html` and kept in
the `quote_rates` and `quote_mileage_rates` tables, which only a staff session
can read or change. `docs/quote-calculator.md` lists where it copies the
spreadsheet's quirks.

`print.html` is the forms this app fills in and prints. On its own it lists
them; with a form named in the query it reads that form's subject and draws it,
filled in. The driver envelope is one copy per seat on a bus, in a standard and
a multi-stop layout, on the 6 by 9 envelope itself. The driver itinerary is one
copy per leg of a trip, on Letter, running onto as many sheets as its stops
need, and every line of it can be typed into before it is printed. The
customer quote is one copy per trip, on two Letter sheets: the QUOTE / PROPOSAL
the office sends, with its price and first line item read from the trip, lines
typed under it that the Total adds up, and the Terms and Conditions Agreement
Form behind it; Save as PDF names the file for the trip's first day,
`2026-12-05-qt`. Its wording is `quote-text.js`, which the trip editor's
Copy for QuickBooks button reads too, so a pasted estimate and a printed quote
cannot disagree. `print.js` holds the registry every form is an entry in; a
new form names its group, its short name for the tile, one line under it, a
Material icon from Design's sprite, what it binds to and its paper, and the
page gives it the same tile, frame and fit as the rest. The page follows the theme the
person keeps and the sheet on it carries the light one, so the ink drawn there
is the ink that prints.

The pages in `share/` are for people without a log-in, who arrive by a link:
`share/document.html` opens a trip document, and `share/maintenance.html`
shows the maintenance crew two weeks of buses and the recent changes. Staff
see the same schedule inside the app at `maintenance.html`, from the side nav,
where they copy the public link to send and replace it when it has gone
further than it should.

Staff can also work the schedule from the Claude app, which asks the
`scheduler-connector` Edge Function, this project's only one, with its source
in `connector/`. It reads the live tables and writes no trip: a trip Claude
fills in comes back as a link that opens the editor at `./?draft=<id>` with
the filled fields marked, and Save there writes it. `docs/working-from-claude.md`
is how to use it, and section 5 of `docs/database-inventory.md` is what it is.

The schedule grid and the trip bar are this app's own; Carbon has neither.
Everything else is Design's, linked live at `/design/…` with no copy here and
no pin to move.

## Run and check it

From the repository root, one level up:

    npm run serve        # the whole site on :8640; this app at /scheduler/
    npm run check        # Design's shared check over this app, plus the sprite

The pages link `/design/…` absolutely, so this folder is never served alone.
The check cannot see whether the page looks right. Open it.

## How it deploys

A push to the repository's `main` runs the full check and deploys the whole
site only if it passes. A failing push stays in git and the last good
deployment keeps serving.
