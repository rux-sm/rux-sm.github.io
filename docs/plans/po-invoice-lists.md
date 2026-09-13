---
type: plan
---

# Plan: POs and invoices as lists

## Goal

A trip can carry several POs and several invoices, edited in either app. The
scheduler and rux-ui both stay live and in use throughout, so every step leaves
both working. Today the scheduler's Billing tab shows Purchase order and
Invoice as lists capped at one row by `LIST_CAP` in `scheduler/data.js`, and
rux-ui edits one PO and one invoice on the `trips` row.

## Decisions

- **Two new tables, `trip_pos` and `trip_invoices`, shaped like
  `trip_payments`.** Numbered columns cap the count and change every reader;
  rux-ui's unused `payment_ref_1/2/3` columns are that approach, already
  abandoned.
- The database is production and shared by both apps. Each change is applied
  through the Supabase connection as a named migration, on rux's yes. The
  tables, their access rules, their realtime publication and the backfill are
  applied: `create_trip_pos_and_trip_invoices` and
  `backfill_trip_pos_and_trip_invoices`.
- The tables copy `trip_payments`: primary key, `trip_id` foreign key with
  `on delete cascade`, a `trip_id` index. Amounts are `numeric(12,2)`, matching
  `trips.po_amount`. The `date` column holds the date.
- **Both apps learn the lists**, so a save in either app keeps every row.
- **Both apps write rows by `id`:** insert new, update changed, delete removed.
  rux-ui's payments delete everything and reinsert, which changes every id; the
  new lists do not copy that, because the scheduler edits rows by id.
- **The old single columns stay, and both apps keep them true on every save**,
  from the rows. An old copy of either app in an open browser tab
  still reads and writes them until it reloads.
- **Order:** tables and backfill, then rux-ui, then the scheduler raises
  `LIST_CAP`. Until rux-ui ships, no app can hold a second row, so no save can
  collapse a list.
- rux-ui reloads trips on realtime changes, so both tables join the
  `supabase_realtime` publication and its `scheduler-trips-db` channel.
- rux-ui bumps the `?v=` of every file it changes, including versioned imports
  inside JS files that `tools/check-cache-busters.sh` does not see, then rux
  uses Settings, "Force refresh all users".
- No `po_partial` column; that rung is derived from the mirrored `po_amount`.
  Contract stays one switch and one note.
- Each app step reverts with its own commit, and the old columns are never
  dropped, so stopping between steps is safe.
- The scheduler step works in a worktree, because another session is editing
  `scheduler/`.
- **Access:** both tables have row level security on, with one `dev_all`
  policy matching `trips`, so closing access later is one change across every
  trip table.
- **Mirror:** `po_received` is at least one PO row, `po_ref` the first PO's
  `ref` by `position`, `po_amount` the sum of PO amounts (rux-ui's `po_partial`
  rung compares it with the balance), `invoice_number` the first invoice's
  `number`, and `invoiced` and `invoice_status` at least one invoice row.
- **rux-ui's editor** gets PO and Invoice lists with add, edit and delete, like
  its Payments card. The trip bar, printed schedule and history show the first
  PO or invoice and a count, such as `PO 4471 +1`.
- **Testing without test records:** automated tests and every check short of
  saving run first; rux then adds, edits and deletes POs on one real trip of
  their choosing in both apps, with SQL confirming the rows after each step.

## Questions

None open.

## Tasks

- [ ] rux-ui load: `fetchTrips` in `js/data/trip-db.js` loads both tables beside
      `trip_payments`, grouped per trip and sorted by `position`.
- [ ] rux-ui editor: PO and Invoice lists in their billing steps in `index.html`
      and `js/panels/trip-panel.js`. The PO coverage output reads the sum, and
      each step's switch is on when it has rows.
- [ ] rux-ui save: after the `trips` upsert, write both lists by `id`; the
      `trips` payload carries the mirror columns; `trip-history-db.js` records
      a list change the way it records payments.
- [ ] rux-ui readers: `trip-bar.js` and `print-schedule.js` show the first PO or
      invoice and a count; the status ladder, finder, notifications and tasks
      keep reading the mirror columns.
- [ ] rux-ui realtime: add both tables to the `scheduler-trips-db` channel.
- [ ] rux-ui verify: tests for the sum and the row diff, `npm test`,
      `tools/check-cache-busters.sh`, every `?v=` bumped, the editor opened on
      a trip with a PO without saving; push, then Force refresh all users.
- [ ] Scheduler read: add `trip_pos(id,position,ref,amount,date)` and
      `trip_invoices(id,position,number,amount,date)` beside `trip_payments` in
      the embedded select, loaded by `position` with their `id`.
- [ ] Scheduler editor: raise `LIST_CAP`; add a Date to both dialogs and an
      Amount to the invoice dialog.
- [ ] Scheduler save: `posPatch()` and `invoicesPatch()` beside
      `paymentsPatch()`, replacing the single-column writes, with the mirror
      columns in the same save; on create both hang off `made.id`.
- [ ] Scheduler verify: `npm run check`; two POs of $10,000 against a $25,000
      balance read `$5,000 not authorized`, and a third of $5,000 reads
      `Covers the balance`, without saving.
- [ ] Both apps, on rux's real trip: two POs added in the scheduler survive a
      save in rux-ui; one deleted in rux-ui is gone in the scheduler after a
      reload; `po_amount` equals the sum and `po_ref` the first row.
