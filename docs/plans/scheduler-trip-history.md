---
type: plan
---

# Plan: record trip edits in the scheduler's history

## Goal

Every change the scheduler makes to a trip writes a `trip_history` entry that
rux-ui's History panel shows exactly as it shows its own, under the name of
the person logged in. Today the scheduler writes history only for documents.

## Decisions

- **The same entries rux-ui writes, through `record_trip_history`.** Same
  actions, same `{field, label, before, after}` changes with display strings,
  same snapshot, so the two apps' entries read alike in one list.
- **No database change.** The function, the table and its allowed actions
  already cover every case below.
- **One field table in `scheduler/data.js`, `HISTORY_FIELDS`,** ported from
  rux-ui's `TRIP_FIELDS` with its labels and value kinds: Yes/No booleans,
  the two inverted "not needed" flags, Ticketed or Charter, dollars, numbers,
  trip type labels, raw dates, followed by the columns this app edits that
  rux-ui's table lacks: vehicle, needs, hotels, PO and invoice numbers. A
  column not in the table is not recorded.
- **Combined values are summarised as rux-ui does:** requirements, fleet
  assignments with bus numbers and driver names, the route as stop names
  joined by arrows, payments as a count and a total.
- **The actor is `actorName()`,** which the document entries already use: the
  logged-in account's `public.profiles` name, then its platform name.
- **Where each entry is written:**
  - the editor's Save: `created` with one Trip change, or `updated` with the
    diff of the trip and its fleet, route, payments, POs and invoices, read
    just before and just after the writes, as one entry, so what is recorded
    is what landed;
  - Cancel: `cancelled`, Trip "Active" to "Cancelled — reason";
  - a bus drag, a drop on an empty slot, and Take off this bus:
    `assignment_changed`, Bus before to after;
  - the bar menu's Color and hotel booked picks: `updated`, one change each;
  - a driver status set from the bar menu: `driver_status_changed`, one change
    naming the driver, old status to new.
- **An entry that fails is logged and never undoes the save,** as for
  documents and as in rux-ui. An entry with no changes is not sent.
- **Viewing history in the scheduler is not part of this plan.** The History
  page is listed as later in `scheduler/docs/screen-inventory.md`, and rux-ui
  shows the entries meanwhile.

## Questions

None open.

## Tasks

- [ ] rux edits, recolours, moves and cancels a trip in the scheduler, sets a
      driver status, and checks each entry in rux-ui's History panel.
