---
type: plan
---

# Plan: work the scheduler from the Claude app

## Goal

rux adds the scheduler to the Claude app as a custom connector, on the Max
plan, and asks in plain words from the desktop, web or phone: "what does bus
12 have next week", "who is free to drive on the 3rd", or, with an itinerary
PDF attached, "enter this trip". Claude answers questions from live data. A
new trip or a change comes back as a link that opens the scheduler's trip
editor already filled; rux checks it and saves it there. Nothing is changed
without rux saving it.

## Decisions

- **Everything runs on rux's Max plan,** because Claude runs in Anthropic's
  own app and only calls the connector for data. There is no Anthropic API
  account, key or bill, and no chat panel inside the scheduler.
- **The connector is a Supabase Edge Function, `scheduler-connector`,**
  serving MCP, the protocol the Claude app's custom connectors speak. Its
  source is committed here, under `scheduler/connector/`, so it changes in the
  same commit as the documents that describe it; the site serves the file,
  which holds no key and no trip detail.
- **It signs in through Supabase's OAuth server as rux's own account,** and
  queries with that session, so the database's access rules apply. It serves
  only an account the site lock plan (`docs/plans/site-lock.md`) lets open
  the scheduler. This waits on `docs/plans/staff-sign-in.md`.
- **Its tools read directly:** `find_trips`, `get_trip`, `find_availability`
  (buses and drivers free on dates, from the same tables as the board),
  `find_contacts`, `list_buses` and `list_drivers`.
- **Its only writes are drafts.** `draft_trip` (new) and `draft_trip_change`
  (a patch to an existing trip) store the draft, with Claude's notes on what
  it could not find, in a new `trip_drafts` table only its author can read,
  and return a link to `/scheduler/?draft=<id>`. The link carries only the id,
  so no trip detail travels in a URL.
- **The scheduler opens a draft in the trip editor,** marks the fields the
  draft filled, shows Claude's notes, and deletes the draft once saved or
  discarded. The save path in `data.js` stays the only writer of trips.
- **An unused draft is deleted after 14 days,** so the table holds no stale
  client details.
- **An itinerary is read by Claude in the app,** which passes the connector
  only the details it found; the PDF itself never reaches the connector, so
  rux attaches it as the trip's Itinerary in the editor, as
  `docs/plans/scheduler-trip-files.md` builds.
- **The site shows the consent screen,** because Supabase's OAuth server
  sends the person to the site's own address to approve the Claude app. It is
  a page at `/oauth/consent/`, built from Design like the log-in page, which
  reads the authorization id from the address, names the app and what it is
  asking for, and approves or denies. `funnel.js` guards it like any other
  page, so a signed-out person logs in first and lands back on it.
- **Staff can use the same connector** from their own Claude plans, and
  nothing else is needed for them.

## Questions

None open.

## Tasks

- [ ] Open `?draft=<id>` in the scheduler's trip editor, new or existing,
      with the filled fields marked and Claude's notes shown; delete the draft
      on save or discard.
- [ ] Describe the function and its tools in
      `scheduler/docs/database-inventory.md`, and the everyday use in a
      how-to in `scheduler/docs/`.
- [ ] rux tries a trip from a real itinerary and a change to an existing
      trip, from the desktop and the phone. Lookups, a draft and a
      signed-out request are checked.
