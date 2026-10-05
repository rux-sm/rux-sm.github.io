---
type: plan
---

# Plan: A History page in the scheduler

## Goal

The office opens one page in the scheduler and sees what changed on trips
lately and who changed it, newest first, and can narrow it to one person, a
span of days or one trip.

## Decisions

- **It is a page, `history.html`, last in the side menu.** It is
  consulted, not worked in, so it sits under every page the office works in.
- **It reads what is already recorded.** Every trip change either app makes
  is a row in `trip_history`, with the name, the time, the trip and each
  field's before and after. The page adds no new recording.
- **Trips only.** A change to a driver, a bus, a customer, a contact or a
  location records no name today, so the page cannot show one.
- **A table shaped like the Trips page,** with four columns: When, Who, Trip
  and What changed. Trip is the reference, the customer and the destination.
  What changed is the kind of change, then one line per field, `Label: before
  → after`.
- **Three filters in the toolbar:** a person, a first day and a last day.
  The people listed are the names the history holds, drivers included,
  because a driver accepting a trip is an entry too.
- **One trip's history is the same page, filtered:** `history.html?trip=<id>`,
  with the trip shown as a tag that clears the filter. The bar's right-click
  menu on the schedule gets a History item that opens it. The trip editor
  gets no sixth tab.
- **A row opens its trip on the schedule,** as a row on the Trips page does.
  An entry whose trip was deleted is plain text, because there is nothing to
  open.
- **Fifty rows, and a Show older button under the table.** The history grows
  every working day, so the page never reads it all the way the Trips page
  reads every trip.
- **The database does the filtering,** through one new read function,
  `search_trip_history`, which takes the person, the two days, the trip and
  the place to carry on from, and says whether each entry's trip still
  exists. A second, `trip_history_people`, returns the names for the filter.
  Both ask `is_staff()`, are granted to signed-in accounts by name and to
  nobody else.
- **Each new entry also saves the account that made it,** in a new
  `actor_id` column that `record_trip_history` fills from the log-in, so a
  name can be checked against an account. An entry made before the column,
  or by a driver from a link with no log-in, has the name only. The page
  shows and filters by the name.
- **`get_trip_history` is left alone,** because the old trips app reads it
  and is still in use.
- **Every staff member sees the page,** as every staff member already sees
  the History tab in the old trips app.
- **Times are the reader's local time,** and the page shows what was there
  when it loaded; a reload brings in newer entries.
- **Not built here:** a filter by kind of change, a search of the text, an
  export, and undoing a change from the page.

## Questions

None open.

## Tasks

- [ ] Write the SQL for the `actor_id` column, `record_trip_history` filling
      it, `search_trip_history` and `trip_history_people`, try it offline
      against a copy of the table's shape, show it to rux and apply it on a
      yes as one named migration.
- [ ] Confirm the grants afterwards by `docs/database-access.md`'s check:
      `anon` can run neither function.
- [ ] Give Design a history icon if it has none, with its glyph snapshot.
- [ ] Build `history.html` and `history.js` from Design's
      `table-page.html`, with the table, the three filters, the trip tag,
      Show older, and the empty and failed states.
- [ ] Add History as the last item of the side menu on every scheduler page
      that has one.
- [ ] Add History to the bar's right-click menu on the schedule.
- [ ] Update `scheduler/README.md`, `scheduler/docs/screen-inventory.md`
      and `scheduler/docs/database-inventory.md` in the same commits.
- [ ] Check it in Chrome on :8641: the newest entries, each filter alone and
      together, a deleted trip's row, a cancelled trip's row, Show older past
      the first fifty, and the page at phone width.
