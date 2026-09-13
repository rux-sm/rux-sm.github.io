---
exchange: {kind: requests, from: rux-scheduler, to: rux-backend}
---

# Requests to the shared schema

What this app has asked the **database** for, and why. Distinct from
`docs/rux-ds-requests.md`, which asks the design system for components: this
file asks for columns and tables.

The database at `udnmqhayzhrbltxzzhjw` is shared with the old app, `rux-ui`.
Neither app owns it, so a shape change here is a change to a contract two
readers depend on, and every entry has to say what happens to the other one.
`docs/backend-inventory.md` is the description of the schema as it stands;
this is the list of what it is missing.

Open requests are listed first.

**Since 2026-09-12 this is a record, not a queue.** A schema change is
prepared in rux-backend as a new migration in the same session as the app
change; applying it to the live project stays a separate, deliberate step.
What is still open is listed in the hub's `docs/status.md`.

---

## Open — an overpaid trip reports itself unconfirmed, 2026-09-10

**Asked for:** a decision on whether `overpaid` belongs in the `confirmWhen`
array of the `billing-workflow-v1` row of the `settings` table. Either add it,
or record that its absence is deliberate so both apps stop treating it as an
oversight.

**Why:** `deriveStatus` is first-match-wins and tests `overpaid` before
`paid_full` (`rux-ui/js/core/billing-config.js:103-104`), so a trip that has
been paid MORE than its quoted price never reaches the `paid_full` rung. The
live `confirmWhen` is
`["contract_signed","po_received","deposit_received","paid_full"]`, which does
not contain `overpaid`, and `isStatusConfirmed` therefore returns false
(`:190-195`).

**MEASURED ON THE SERVED PAGE.** A trip quoted $45,500 with $46,000 of
payments entered renders, in the same tile, at the same moment:

| line | value |
|---|---|
| Paid | $46,000 / $45,500 |
| Balance | −$500 |
| Status | Overpaid |
| **Confirmed** | **Not yet** |

A customer who has paid 100.1% of the price is as committed as one who has
paid exactly 100%, and the trip flips from confirmed to unconfirmed on the
last dollar arriving.

**IT IS ALREADY CONFIGURABLE, which is why this is a decision and not a bug
report.** rux-ui's settings panel offers `overpaid` as one of five
`confirmWhen` checkboxes (`js/panels/settings-panel.js:572`), so somebody
chose the current four. This entry only asks whether that choice was about
this case or whether `overpaid` was passed over as an edge that would not
come up.

**What this app is doing meanwhile:** mirroring the rule exactly, including
this outcome. The Billing tab shows what rux-ui would compute, and writes
none of it -- so a divergence here would be this app inventing a second
answer to a question the other app owns. Nothing is worked around.

---

## Open — one PO and one invoice per trip is not enough, 2026-09-10

**Asked for:** two tables, `trip_pos` and `trip_invoices`, each holding many
rows per trip, so a charter can carry more than one purchase order and an
invoice can be split. Shape mirroring `trip_payments`, which already solves
this exact problem for money received:

```
trip_pos       id, trip_id, ref (text), amount (numeric),
               date (date), position (int), created_at
trip_invoices  id, trip_id, number (text), amount (numeric),
               date (date), position (int), created_at
```

Optionally a `date` for the contract too — `trips.contract_signed_date` or a
`contract_date`. There is no date column for any of the three milestones
today.

**Why:** rux asked for it directly, describing the workflow this app cannot
draw: a school district sends a PO for part of a trip and a second PO later,
or an invoice is split across two departments. The current Billing tab shows
one PO reference, one PO amount and one invoice number, because that is all
there is to show.

**MEASURED AGAINST THE LIVE DATABASE, not inferred from the old app's forms.**
Probed 2026-09-10 with `select=…&limit=0`, which returns no rows:

| probed | result |
|---|---|
| `trip_pos`, `trip_purchase_orders`, `purchase_orders` | 404 |
| `trip_invoices`, `invoices`, `trip_contracts`, `contracts` | 404 |
| `trips.po_date`, `po_received_date` | 400 |
| `trips.contract_date`, `contract_signed_date` | 400 |
| `trips.invoice_date`, `invoiced_date`, `invoice_sent_date` | 400 |
| `trip_documents` | 200 — but see below |

`trip_documents` exists with 134 rows and is **not** a home for this: its
columns are `id`, `trip_id`, `file_name`, `file_path`, `label`, `created_at`.
It is an attachment table for uploaded files, with no amount and no date, so
a PO with a value cannot live in it.

**THE CONFIRMATION RULE GENERALISES CLEANLY, which is the reason this is worth
doing rather than working around.** rux's rule is "at least one PO confirms
the trip, and it is flagged partial when the POs do not cover the balance".
Against the current single columns that is `po_received` and one comparison.
Against a table it is:

```
po_received  =  count(trip_pos) > 0
shortfall    =  max(0, (quoted_price - paid) - SUM(trip_pos.amount))
```

The same two facts, summed instead of read. Nothing about rux-ui's status
ladder (`js/core/billing-config.js:94-110`) has to change shape — only where
`poAmount` comes from.

**YES, rux-ui KEEPS WORKING, AND THERE IS ALREADY A PRECEDENT FOR HOW.** This
was rux's first question and it is the condition the request stands on.

New tables are additive: rux-ui never selects `trip_pos`, so its existence
changes nothing over there. The risk is not the new tables, it is the OLD
columns. `rux-ui` reads and **writes** `po_ref`, `po_amount`, `po_received`,
`invoice_number`, `invoiced` and `invoice_status` on every save
(`js/data/trip-db.js:377-379, 445-458`), and derives its billing status from
`po_amount` (`js/core/billing-config.js:105`). If this app moved POs into a
table and stopped maintaining those columns, rux-ui would show a trip with no
PO and would overwrite the columns from its own empty fields.

So the legacy columns **stay, as a derived mirror** written on every save:

| legacy column | mirrored from |
|---|---|
| `po_received` | `count(trip_pos) > 0` |
| `po_ref` | first PO's `ref` (by `position`) |
| `po_amount` | `SUM(trip_pos.amount)` — the total is what the ladder compares |
| `invoice_number` | first invoice's `number` |
| `invoiced`, `invoice_status` | `count(trip_invoices) > 0` |

**THE PRECEDENT IS `deposit_amount`, ALREADY WORKING IN THIS REPOSITORY.**
`trip_payments` is many rows; `trips.deposit_amount` is the one number rux-ui
reads for "paid". This app writes the sum back on every save (`sch-data.js`,
the payments block of the trip save path) precisely so the old app keeps
seeing a true total without knowing the rows exist. `trip_pos` would be the
same arrangement for money authorised rather than money received.

**WHAT WOULD MAKE THIS UNSAFE, said plainly:** dropping any of those six
columns, or adding a NOT NULL constraint to the new tables that a rux-ui save
cannot satisfy. Neither is part of the ask.

**WHAT THIS APP IS DOING MEANWHILE.** The Billing tab's Contract, Purchase
order and Invoice sections each carry their switch as a heading action, which
is the layout a `+` would slot into. No `+` is drawn, because a button that
can never add a second row is a promise the schema cannot keep — the same
rule this project applies to inventing a Carbon variant. The single PO and
single invoice are edited as fields, gated by their switch.

**Not asked for:** a `po_partial` column. The rung is derived from amounts on
both sides, and storing it would add a second writer of a computed value —
the mistake this app already made and undid on 2026-09-10, when `confirmed`,
`balance_paid` and `date_paid` were toggles here and were being overwritten
by rux-ui as fast as they were set. That reasoning is recorded in the
`EDITS` block of `sch-data.js`, above `req_sleeper`.
