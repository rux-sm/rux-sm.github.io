# rux-scheduler

Fleet scheduling and dispatch — one app on [rux-ds](https://github.com/rux-sm/rux-ds),
served at **rux-sm.github.io/rux-scheduler/**.

The repository root's `AGENTS.md` is the policy. `docs/status.md` here is
where this app stands. `docs/log.md` is every dated pass.

## What it is

A week board: buses down the side, days across, one bar per assignment. It
reads and writes the Supabase tables the `rux-ui` app already writes — trips,
assignments, stops, drivers, buses — and is that app's replacement, mid-flight.

The schedule grid and the trip bar are this app's own, prefixed `sch-`; Carbon
has neither. Everything else is rux-ds's, linked live at `/rux-ds/…` with no
copy here and no pin to move.

## Run and check it

From the repository root, one level up:

    npm run serve        # the whole site on :8640; this app at /rux-scheduler/
    npm run check        # rux-ds's shared check over this app, plus the sprite

The pages link `/rux-ds/…` absolutely, so this folder is never served alone.
The check cannot see whether the page looks right. Open it.

## How it deploys

A push to the repository's `main` runs the full check and deploys the whole
site only if it passes. A failing push stays in git and the last good
deployment keeps serving.
