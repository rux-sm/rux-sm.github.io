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

The quote page, `quote.html`, is the quote calculator: the office spreadsheet's
formulas in `quote.js`. Its rates are edited on `quote-rates.html` and kept in
the `quote_rates` and `quote_mileage_rates` tables, which only a staff session
can read or change. `docs/quote-calculator.md` lists where it copies the
spreadsheet's quirks.

The pages in `share/` are for people without a log-in, who arrive by a link:
`share/document.html` opens a trip document, and `share/maintenance.html`
shows the maintenance crew two weeks of buses and the recent changes. Staff
see the same schedule inside the app at `maintenance.html`, from the side nav,
where they copy the public link to send and replace it when it has gone
further than it should.

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
