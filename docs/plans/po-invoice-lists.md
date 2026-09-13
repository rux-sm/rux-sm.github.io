---
type: plan
---

# Plan: POs and invoices as lists

## Goal

A trip can carry several POs and several invoices, edited in either app. The
scheduler and rux-ui both stay live and in use throughout, so every step leaves
both working. Both apps now edit PO and invoice lists and write them by id;
the scheduler's change waits on a branch until rux-ui's old tabs are
refreshed.

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
- **Order:** tables and backfill, then rux-ui, then the scheduler. Until
  rux-ui's open tabs run the new editor, the scheduler holds one row of each,
  so no save can collapse a list.
- rux-ui reloads trips on realtime changes, so both tables join the
  `supabase_realtime` publication and its `scheduler-trips-db` channel.
- rux-ui bumps the `?v=` of every file it changes, including versioned imports
  inside JS files that `tools/check-cache-busters.sh` does not see, then rux
  uses Settings, "Force refresh all users".
- No `po_partial` column; that rung is derived from the mirrored `po_amount`.
  Contract stays one switch and one note.
- Each app step reverts with its own commit, and the old columns are never
  dropped, so stopping between steps is safe.
- The scheduler's change is built on the `po-invoice-lists` branch in a
  worktree, because another session is editing `scheduler/`, and merges to
  `main` after rux's refresh.
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

- [ ] rux uses rux-ui's Settings, "Force refresh all users", at least ten
      minutes after rux-ui's deploy, so no open tab keeps the old editor.
- [ ] Merge `po-invoice-lists` into `main` and push, which publishes the
      scheduler's lists, then remove the worktree.
- [ ] Both apps, on rux's real trip: two POs added in the scheduler survive a
      save in rux-ui; one deleted in rux-ui is gone in the scheduler after a
      reload; `po_amount` equals the sum and `po_ref` the first row.
