---
type: plan
---

# Plan: maintenance logs in the vehicle profiles

## Goal

The paper binder kept for each bus lives in its Fleet profile: the monthly
checklist and the quarterly emergency exit inspection are entered there, and
the office sees what is due or broken without opening a binder or Samsara.
Services and their schedules stay where the office already keeps them, in
Samsara, and the profile shows them.

The Fleet profile's Maintenance tab is built: Add inspection, the defects an
inspection opens and Close, and a history that holds the inspections and the
repairs entered from the paper binder. Samsara keeps an oil-change schedule
for every bus and the service log, and `scheduler/samsara-now` already reads
each bus's odometer and inspections.

## Decisions

- **What is due comes from Samsara.** Its upcoming preventive maintenance,
  `GET /maintenance/preventive/upcoming`, gives each bus's items with
  `status` overdue or upcoming, the miles, engine hours or days still to go,
  and when each was last done; the schedules are kept in Samsara and nowhere
  else. The unused `bus_service_rules` table is dropped.
- **Services are logged in Samsara and shown here, read only.** The
  Maintenance tab's Add repair goes; its history keeps the repairs already
  entered from the binder, and shows Samsara's service log beside them where
  its API gives it, else a link to the bus in Samsara.
- **The binder's checklists stay the scheduler's own form,** built for a
  phone at the bus: one tap per item, the six tire positions drawn as on the
  paper, tread in 32nds. A watch or now result opens a defect on the bus's
  list, and a now result offers days out of service, which the schedule
  already keeps off trips.
- **Each fact has one home.** `mileage`, `last_service` and `next_service` on
  Details become read-only: the odometer is Samsara's, and the last and next
  service are Samsara's upcoming maintenance. The annual inspection record
  sets `inspection_exp`.
- **The odometer is prefilled from Samsara and the inspector confirms it,** so
  a typed figure is a check on the engine's, never the only source.
- **Tires are tracked by identity** (brand, serial, position), so a rotation
  from the front axle to the tag axle can be followed.
- **A scan or shop invoice attaches through the Documents page,** not a new
  store.
- **The board warns about a bus that is overdue,** on its tile as a mark in
  amber, and in the clash check when it is assigned to a trip, as it warns
  about an open now defect.
- **Reports, in this order:** each bus's printable history, the inspection
  grid of bus by month and exit inspection by quarter, open defects, the tire
  log.
- **A driver's Report a problem button comes last,** one large action on the
  driver page that opens a defect on the same list.
- **Each database change is its own named migration,** applied on rux's yes
  before the code that reads it is pushed.

## Questions

- Is the company covered by FMCSA, or intrastate only? That decides whether
  the annual inspection and a driver defect report are required.
- Who enters the checklists: one inspector, or drivers as well?
- Is the 2026 paper backfilled for every bus, or does the log start fresh?
- Is a tire pressure outside a range worth flagging, and what range?

## Tasks

- [ ] Read Samsara's upcoming preventive maintenance and work orders once
      with the key, to see whether it has their read permissions and
      whether the service log comes through work orders.
- [ ] Show what is due on the Maintenance tab and mark an overdue bus on
      its tile, from Samsara.
- [ ] Take Add repair off the Maintenance tab and show Samsara's service log
      in its history, or link to it.
- [ ] Make Details' mileage and service dates read-only, from Samsara.
- [ ] Drop `bus_service_rules`.
- [ ] Backfill the other buses' paper checklists as they are scanned, each
      figure checked against the page.
- [ ] Add the annual inspection record and the remaining reports.
- [ ] Warn in the clash check about an overdue bus or an open now defect.
- [ ] Add the driver page's Report a problem button.
