# Plan — POs and invoices as lists

Turning the Billing tab's Purchase order and Invoice sections from one field
each into `contained-list`s with an add button, the way Payments already
works, so a trip can carry several POs and a split invoice.

Written 2026-09-10. The request behind it is
`docs/schema-requests.md`, "one PO and one invoice per trip is not enough";
this is the sequence for doing it once that is answered.

**PHASE 4 IS BUILT AS OF 2026-09-11, CAPPED AT ONE ROW PER SECTION.** rux
asked for the layout to be finalised ahead of the tables, so both sections are
`contained-list`s now, with the add button disabled at the row `trips` can
store (`LIST_CAP` in `sch-data.js`) and its tooltip saying so. Phase 4's two
options were settled the way this plan recommends: the switch stays, because
12 of the 55 PO trips are `po_received` with nothing typed. What is NOT built
is everything the cap stands in for -- no second row, no `date` field on
either section and no invoice amount, because those are columns rather than
markup. Phases 1, 2, 3, 5 and 6 are untouched; Phase 6's arithmetic is already
written as a SUM over the rows, so it needs no second pass.

---

## The blocker, stated first

**No UI work is possible until the tables exist.** `trips` holds one `po_ref`,
one `po_amount` and one `invoice_number`, and there is no `trip_pos` or
`trip_invoices` table — probed live, all 404. An add button before the
migration would be a control that cannot add a second row.

The migration is a change to a **production database shared with rux-ui**, on
a project this repository does not own. It belongs in `rux-backend`
(`supabase/migrations/`), applied by rux. Nothing in this plan writes to the
database from this app's tooling.

---

## Phase 0 — three decisions that are rux's, not this app's

**0.1 — Row level security.** `trip_payments` has **no RLS**, and copying it
verbatim would inherit that. Counted in the schema migration: 31 of 35 public
tables enable RLS; the four that do not are `settings`, `trip_documents`,
`trip_itineraries` and `trip_payments`. The publishable key ships in page
source, so a table without RLS is readable and writable by anyone who loads
either app — which `CLAUDE.md` already says in as many words. New tables
should get RLS by decision rather than by copy-paste. This plan does not
assume which way that goes; it only insists the choice is made deliberately.

**0.2 — What the mirror columns hold.** rux-ui reads and writes `po_ref`,
`po_amount`, `po_received`, `invoice_number`, `invoiced` and `invoice_status`
on every save. They must keep holding something true or the old app breaks.
Proposed, and needing rux's yes:

| legacy column | mirrored from |
|---|---|
| `po_received` | `count(trip_pos) > 0` |
| `po_ref` | first PO's `ref`, by `position` |
| `po_amount` | **`SUM(trip_pos.amount)`** |
| `invoice_number` | first invoice's `number`, by `position` |
| `invoiced`, `invoice_status` | `count(trip_invoices) > 0` |

`po_amount` as a SUM rather than the first row is the one that matters:
rux-ui's `po_partial` rung compares `poAmount` against the remaining balance
(`billing-config.js:105`), so the total is the only value that keeps its
status correct.

**0.3 — Whether rux-ui gets taught the tables.** If it stays unchanged it
keeps working through the mirror, but a second PO edited in rux-scheduler and
then saved from rux-ui would collapse back to one — rux-ui would write its
single field over the mirror. That is a real data-loss path and it is a
product decision, not a technical one: either rux-ui learns the tables, or
POs are edited only in this app.

---

## Phase 1 — the migration (`rux-backend`)

Modelled on `trip_payments` exactly (`20260903160350_remote_schema.sql:476`),
including the `ON DELETE CASCADE` and the `trip_id` index.

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
matching `trip_payments`, and whatever Phase 0.1 decided about RLS.

`numeric(12,2)` matches `trips.po_amount`, which is already `numeric(12,2)`.
Note `trip_payments.amount` is `numeric(10,2)` — the narrower of the two, and
not the one to copy here.

**A `date` column is included for both**, which the current schema has nowhere
for. rux asked for `mm/dd/yyyy` on these sections; this is where it lands.

---

## Phase 2 — backfill

One statement per table, so no trip loses what it already has:

```sql
insert into trip_pos (trip_id, position, ref, amount)
select id, 0, po_ref, po_amount from trips
where po_received = true or po_ref is not null;

insert into trip_invoices (trip_id, position, number)
select id, 0, invoice_number from trips
where invoiced = true or invoice_number is not null;
```

Expected counts, measured on the live table 2026-09-10: **55** PO rows (43
with a `ref`, 12 flagged received with none) and **43** invoice rows. Verify
those two numbers after running, before any UI ships.

---

## Phase 3 — read path (`sch-data.js`)

Add `trip_pos(id,position,ref,amount,date)` and
`trip_invoices(id,position,number,amount,date)` to the embedded select beside
`trip_payments(…)`. Capture both into `editing` at load, sorted by `position`,
exactly as `editing.payments` already is.

---

## Phase 4 — the UI

The three sections become structurally identical to Payments. The section
heading keeps its switch; the list carries the `+`.

- `poPending` and `invPending` arrays, module-scoped beside `payPending`.
- `openPoDialog(index)` / `openInvoiceDialog(index)`, modelled on
  `openPaymentDialog` — a modal with Reference/Number, Amount, Date, a
  **Done** button that commits to the array and writes nothing.
- Two more modals in `index.html` beside `#sch-payment-modal`.
- Rows reuse `.sch-payment-row`'s three-column grid: a tag, the date, the
  amount right-aligned. The PO tag can carry the coverage state.

**The switch changes meaning and this is the part to get right.** Today it
gates fields; with a list, "at least one row" IS the switch — rux said so.
Two options, and this plan does not pick one blind:

1. **Switch drives the list.** Off hides the list and clears the rows; on
   reveals it. Consistent with Contract, and keeps one interaction.
2. **Switch goes away.** `po_received` becomes `count > 0`, and the section
   is just a list with a `+`, like Payments. Fewer controls, but no way to
   mark "a PO is coming" without a row — and 12 of the 55 existing PO trips
   are exactly that state.

Those 12 rows are the argument for keeping the switch. Option 1.

---

## Phase 5 — write path

`posPatch()` and `invoicesPatch()` alongside `paymentsPatch()`, diffing by
`id` — insert new, update changed, delete removed, never delete-all-and-
reinsert. Then the mirror writes from Phase 0.2 in the same save, after the
rows land, the way `deposit_amount` is already written after the payments.

On create, both hang off `made.id` like payments now do.

---

## Phase 6 — the ladder

`drawSummary` reads `SUM(poPending.amount)` where it now reads
`#sch-f-poamount`, and `poReceived` becomes `poPending.length > 0` (or the
switch, per Phase 4). `deriveStatus` itself does not change — only where
`poAmount` comes from. The coverage line already says
`max(0, (quoted − paid) − poAmount)`, which becomes correct for several POs
without being rewritten.

---

## Verification

1. `node tools/check.mjs`.
2. In the browser, per section: add two rows, edit one, delete one, Reset,
   confirm Save arms and disarms.
3. Coverage: two POs of $10,000 against a $25,000 balance reads
   `$5,000 not authorized`; a third for $5,000 reads `Covers the balance`.
4. On a **new** trip, not only an existing one — the bug `paymentsPatch` had.
5. Mirror check, read-only: after a save, `po_amount` equals the SUM and
   `po_ref` the first row.
6. Open the same trip in rux-ui and confirm it still shows a PO.

---

## Out of scope

- Teaching rux-ui the tables (Phase 0.3 decides whether that is a follow-up).
- A `po_partial` column. The rung is derived; storing it would add a second
  writer of a computed value, which is the mistake undone on 2026-09-10.
- Contract. It stays one switch and one note — there is one contract.

## Rollback

Phases 3–6 are this repository and revert with a commit. Phase 1 is the
shared database: the tables are additive and nothing drops, so reverting the
app leaves them unread rather than broken. That ordering — tables first, app
second, legacy columns never dropped — is what makes this safe to stop
halfway.
