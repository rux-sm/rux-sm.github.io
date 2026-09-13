---
type: plan
---

# Plan: POs and invoices as lists

## Goal

A trip can carry several POs and a split invoice. The scheduler's Billing tab
already shows its Purchase order and Invoice sections as lists shaped like
Payments, capped at one row by `LIST_CAP` in `rux-scheduler/sch-data.js`,
because `trips` holds one PO and one invoice and the `trip_pos` and
`trip_invoices` tables do not exist yet.

## Decisions

- The tables change the production database shared with rux-ui. They are
  applied through the Supabase connection as a named migration, on rux's yes.
- The tables copy `trip_payments`, including `on delete cascade` and the
  `trip_id` index. Amounts are `numeric(12,2)`, matching `trips.po_amount`,
  not the narrower `trip_payments.amount`. The `date` column holds the
  `mm/dd/yyyy` date.
- Writes diff rows by `id`: insert new, update changed, delete removed, and
  never delete everything and reinsert.
- No `po_partial` column, because that rung is derived. Contract stays one
  switch and one note.
- Tables go first and the app second, and the old single columns are never
  dropped, so stopping halfway is safe. The app work reverts with a commit.

## Questions

1. **Row level security.** `trip_payments` has none, so copying it verbatim
   inherits that. The publishable key ships in page source, so a table without
   it is open to anyone who loads either app. Which rules do the new tables get?
2. **What the old columns mirror.** rux-ui reads and writes them on every save,
   so they must stay true. Proposed:

   | Old column | Mirrored from |
   |---|---|
   | `po_received` | `count(trip_pos) > 0` |
   | `po_ref` | first PO's `ref`, by `position` |
   | `po_amount` | `SUM(trip_pos.amount)`, because rux-ui's `po_partial` rung compares it with the balance |
   | `invoice_number` | first invoice's `number`, by `position` |
   | `invoiced`, `invoice_status` | `count(trip_invoices) > 0` |

3. **Whether rux-ui learns the tables.** Unchanged, it keeps working through
   the mirror, but a second PO added here collapses back to one when rux-ui
   saves the trip. Either rux-ui learns the tables, or POs are edited only in
   the scheduler.

## Tasks

- [ ] Create both tables with a primary key, a `trip_id` foreign key to
      `trips(id)` `on delete cascade`, an `idx_*_trip_id` index, the `anon`
      grants `trip_payments` has, and the security answered in question 1:

      ```sql
      create table "public"."trip_pos" (
        "id" uuid not null default gen_random_uuid(),
        "trip_id" uuid not null,
        "position" integer not null default 0,
        "ref" text,
        "amount" numeric(12,2),
        "date" date,
        "created_at" timestamp with time zone default now()
      );
      create table "public"."trip_invoices" (
        "id" uuid not null default gen_random_uuid(),
        "trip_id" uuid not null,
        "position" integer not null default 0,
        "number" text,
        "amount" numeric(12,2),
        "date" date,
        "created_at" timestamp with time zone default now()
      );
      ```

- [ ] Backfill one row per trip that has a PO or an invoice. Count what each
      `select` returns first, then check the inserted counts match:

      ```sql
      insert into trip_pos (trip_id, position, ref, amount)
      select id, 0, po_ref, po_amount from trips
      where po_received = true or po_ref is not null;

      insert into trip_invoices (trip_id, position, number)
      select id, 0, invoice_number from trips
      where invoiced = true or invoice_number is not null;
      ```

- [ ] Read path: add `trip_pos(id,position,ref,amount,date)` and
      `trip_invoices(id,position,number,amount,date)` beside `trip_payments`
      in the embedded select, and load them sorted by `position` with their
      `id`, the way payments load.
- [ ] UI: raise `LIST_CAP`, add a Date field to both dialogs and an Amount to
      the invoice dialog. The row's middle column is the date's slot.
- [ ] Write path: `posPatch()` and `invoicesPatch()` beside `paymentsPatch()`,
      replacing the single-column writes. The mirror writes follow in the same
      save after the rows land, and on create both hang off `made.id`.
- [ ] Verify: `npm run check`; in the browser add two rows, edit one, delete
      one, Reset, and confirm Save arms and disarms; two POs of $10,000 against
      a $25,000 balance read `$5,000 not authorized`, and a third of $5,000
      reads `Covers the balance`; repeat on a new trip; after a save
      `po_amount` equals the sum and `po_ref` the first row; the trip still
      shows a PO in rux-ui.
