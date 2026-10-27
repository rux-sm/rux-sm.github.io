---
type: plan
---

# Plan: maintenance logs in the vehicle profiles

## Goal

The paper binder kept for each bus lives in its Fleet profile: the monthly
checklist, the quarterly emergency exit inspection and every repair or
service are entered there, and the office sees what is due or broken without
opening a binder.

Today the profile has `mileage`, `last_service`, `next_service` and three
expiry dates on `buses`, all empty, and Samsara's odometer is already read by
`scheduler/samsara-miles`.

## Decisions

- **A Maintenance tab joins Details and Trips in the bus editor.** It holds a
  header strip (odometer as of a date, what is due, open defects), the
  history, and Add inspection and Add repair.
- **Three tables, each its own named migration, applied on rux's yes.**
  `bus_inspections` (bus, kind monthly, exit or annual, date, inspector,
  odometer, each item's result OK, watch or now, tire readings by position,
  comments), `bus_maintenance_records` (bus, date, kind, summary, odometer,
  vendor, cost, the inspection item that found it, a file) and
  `bus_service_rules` (item, every N miles and or N months, per type or per
  bus).
- **Each fact has one home.** `mileage`, `last_service` and `next_service` on
  Details become read-only, worked out from the records; the annual
  inspection record sets `inspection_exp`.
- **The odometer is prefilled from Samsara and the inspector confirms it,** so
  a typed figure is a check on the engine's, never the only source.
- **A watch or now result opens a defect.** A now result offers days out of
  service, which the schedule already keeps off trips.
- **The form follows the paper's layout** and is built for a phone at the bus:
  one tap per item, the six tire positions drawn as on the form, tread in
  32nds.
- **Tires are tracked by identity** (brand, serial, position), so a rotation
  from the front axle to the tag axle can be followed.
- **A scan or shop invoice attaches through the Documents page,** not a new
  store.
- **Reports, in this order:** the due board, each bus's printable history, the
  inspection grid of bus by month and exit inspection by quarter, open
  defects, cost per bus and per mile, the tire log. The schedule's clash check
  warns when an assigned bus is overdue on a rule or has a now defect.
- **A driver's Report a problem button comes last,** one large action on the
  driver page that opens a defect on the same list.

## Questions

- What are the real service intervals for oil, fuel filters, A/C and tires,
  and do they differ by bus age?
- Is the company covered by FMCSA, or intrastate only? That decides whether
  the annual inspection and a driver defect report are required.
- Who enters data: one inspector, or drivers and shops as well?
- Is the 2026 paper backfilled for every bus, or does the log start fresh?
- Is a tire pressure outside a range worth flagging, and what range?

## Tasks

- [ ] Add service rules and the due board.
- [ ] Make Details' mileage and service dates read-only and derived.
- [ ] Backfill the other buses' paper logs as they are scanned, each figure checked against the page.
- [ ] Add the annual inspection record and the remaining reports.
- [ ] Warn in the clash check about an overdue bus or an open now defect.
- [ ] Add the driver page's Report a problem button.
