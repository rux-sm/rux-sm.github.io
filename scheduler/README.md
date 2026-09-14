# Scheduler

Fleet scheduling and dispatch — one app on [design](../design/),
served at **rux-sm.github.io/scheduler/**.

The repository root's `AGENTS.md` is the policy. The site's `docs/status.md`
lists what is unfinished here.

## What it is

A week board: buses down the side, days across, one bar per assignment. It
reads and writes the Supabase tables the `rux-ui` app already writes — trips,
assignments, stops, drivers, buses — and is that app's replacement, mid-flight.

That database is production and shared with `rux-ui`, so nothing here is
ever tried with a test record.

Its second page, `quote.html`, is the quote calculator: the office spreadsheet's
formulas in `quote.js`, with rates kept in the `quote_rates` and
`quote_mileage_rates` tables, which only a staff session can read or change.

The schedule grid and the trip bar are this app's own, prefixed `sch-`; Carbon
has neither. Everything else is Design's, linked live at `/design/…` with no
copy here and no pin to move.

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
