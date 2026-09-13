# Plan — POs and invoices as lists

A trip needs several POs and a split invoice. The Billing tab's Purchase order
and Invoice sections are already `contained-list`s shaped like Payments, capped
at one row (`LIST_CAP` in `sch-data.js`), because `trips` holds one `po_ref`,
one `po_amount` and one `invoice_number`, and `trip_pos` and `trip_invoices` do
not exist. The coverage line already sums the PO rows, and the section switch
stays, because a PO can be expected with nothing typed.

What is left: the two tables, the backfill, the read and write paths, a second
row, and a date on both sections and an amount on invoices.

The tables are a change to the production database shared with rux-ui. They
are applied through the Supabase connection as a named migration, on rux's yes.

---

## Phase 0 — three decisions that are rux's

**0.1 — Row level security.** `trip_payments` has no RLS, so copying it
verbatim would inherit that. The tables without RLS are `settings`,
`trip_documents`, `trip_itineraries` and `trip_payments`. The publishable key ships in page source, so a table
without RLS is open to anyone who loads either app. Decide RLS for the new
tables deliberately.

**0.2 — What the mirror columns hold.** rux-ui reads and writes `po_ref`,
`po_amount`, `po_received`, `invoice_number`, `invoiced` and `invoice_status`
on every save, so they must keep holding something true. Proposed:

| legacy column | mirrored from |
|---|---|
| `po_received` | `count(trip_pos) > 0` |
| `po_ref` | first PO's `ref`, by `position` |
| `po_amount` | **`SUM(trip_pos.amount)`** |
| `invoice_number` | first invoice's `number`, by `position` |
| `invoiced`, `invoice_status` | `count(trip_invoices) > 0` |

`po_amount` is a SUM because rux-ui's `po_partial` rung compares it against the
remaining balance.

**0.3 — Whether rux-ui gets taught the tables.** Unchanged, it keeps working
through the mirror, but a second PO added here and then saved from rux-ui
collapses back to one, because rux-ui writes its single field over the mirror.
Either rux-ui learns the tables, or POs are edited only in this app.

---

## Phase 1 — the migration

Modelled on `trip_payments`, including the `ON DELETE CASCADE` and the
`trip_id` index.

```sql
create table "public"."trip_pos" (
  "id"         uuid not null default gen_random_uuid(),
  "trip_id"    uuid not null,
  "position"   integer not null default 0,
  "ref"        text,
  "amount"     numeric(12,2),
  "date"       date,
  "created_at" timestamp with time zone default now()
);

create table "public"."trip_invoices" (
  "id"         uuid not null default gen_random_uuid(),
  "trip_id"    uuid not null,
  "position"   integer not null default 0,
  "number"     text,
  "amount"     numeric(12,2),
  "date"       date,
  "created_at" timestamp with time zone default now()
);
```

Then, for each: primary key, `trip_id` foreign key to `trips(id)`
`on delete cascade`, an `idx_*_trip_id` btree index, the `anon` grants
matching `trip_payments`, and the RLS decided in 0.1.

`numeric(12,2)` matches `trips.po_amount`; `trip_payments.amount` is the
narrower `numeric(10,2)` and is not the one to copy. The `date` column is where
the `mm/dd/yyyy` rux asked for lands.

---

## Phase 2 — backfill

One statement per table, so no trip loses what it has:

```sql
insert into trip_pos (trip_id, position, ref, amount)
select id, 0, po_ref, po_amount from trips
where po_received = true or po_ref is not null;

insert into trip_invoices (trip_id, position, number)
select id, 0, invoice_number from trips
where invoiced = true or invoice_number is not null;
```

Count the rows each `select` returns before running (about 55 POs and 43
invoices), and check the inserted counts match before any UI ships.

---

## Phase 3 — read path (`sch-data.js`)

Add `trip_pos(id,position,ref,amount,date)` and
`trip_invoices(id,position,number,amount,date)` to the embedded select beside
`trip_payments(…)`. Load both into `poPending` and `invPending`, sorted by
`position`, with their `id`, the way payments load.

---

## Phase 4 — the UI

Raise `LIST_CAP`. Add a Date field to both dialogs and an Amount to the invoice
dialog; the row's middle column is the date's slot.

---

## Phase 5 — write path

`posPatch()` and `invoicesPatch()` beside `paymentsPatch()`, diffing by `id`:
insert new, update changed, delete removed, never delete-all-and-reinsert. They
replace the single-column writes in `EDITS`; the mirror writes from 0.2 follow
in the same save, after the rows land, the way `deposit_amount` follows the
payments. On create, both hang off `made.id` like payments.

---

## Verification

1. `npm run check`.
2. In the browser, per section: add two rows, edit one, delete one, Reset,
   confirm Save arms and disarms.
3. Coverage: two POs of $10,000 against a $25,000 balance reads
   `$5,000 not authorized`; a third for $5,000 reads `Covers the balance`.
4. On a new trip, not only an existing one.
5. Mirror check, read-only: after a save, `po_amount` equals the SUM and
   `po_ref` the first row.
6. Open the same trip in rux-ui and confirm it still shows a PO.

---

## Out of scope

- Teaching rux-ui the tables (0.3 decides whether that follows).
- A `po_partial` column. The rung is derived; storing it adds a second writer
  of a computed value.
- Contract. It stays one switch and one note.

## Rollback

Phases 3–5 are this repository and revert with a commit. Phase 1 is additive
and drops nothing, so reverting the app leaves the tables unread rather than
broken. Tables first, app second, legacy columns never dropped: that order is
what makes stopping halfway safe.
