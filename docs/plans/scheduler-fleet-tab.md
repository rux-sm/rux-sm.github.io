---
type: plan
---

# Plan: assign buses and drivers from the trip editor's Fleet tab

## Goal

Dispatch sets how many buses a trip needs, puts a bus on each, and fills each
bus's driver, co-driver and relief seats from the Fleet tab, and a save
leaves the trip exactly as a save from rux-ui would, so both boards and the
driver pages show the same crew.

## Decisions

- **The fields and storage are rux-ui's,** so both apps edit one crew:
  `trips.bus_count` and `return_bus_count`; one `trip_assignments` row per bus
  with `leg`, `position`, `bus_id` and `active_roles`; one `trip_drivers` row
  per filled seat with `role`, `report_time` and `instructions`; and the
  status through `sync_trip_driver_statuses`. No database change.
- **The seats are rux-ui's four:** Driver, always on; Co-driver; Relief at the
  start; Relief at the end. The database accepts only these, and relief is per
  bus and per leg, not per day.
- **The tab is one section per leg.** Outbound, then Return, which shows only
  while Type is Split, as the return dates do on Details. A trip that is not
  Split has one section, titled Buses. Each section's head holds Carbon's
  small number input, Buses needed, from 1 to 20.
- **Each bus is a group titled Bus 1, Bus 2…** with the Day-of contacts
  overflow menu: Add co-driver, Add relief at start, Add relief at end, and
  Remove bus. Inside it, top to bottom: the bus, then the driver, then each
  seat that is on, each a combo box across the row, and for a relief seat,
  Swap time beside Note. A seat's menu item turns into Remove co-driver or
  Remove relief while it is on.
- **Pay is not on the Fleet tab.** It waits for a later plan, perhaps a
  section on Billing; the save never writes `trip_drivers.pay`, so pay set in
  rux-ui stays as it is.
- **Each filled seat shows its status and sets it,** as the bar does: the role
  icon in the status colour, which opens the bar's status menu. Choosing a
  different driver sets that seat to Off, as rux-ui does and the driver status
  plan asks.
- **The pickers are Carbon combo boxes over active buses and drivers,** plus
  whoever the trip already has, so an inactive driver stays readable. An option
  that clashes says so beneath its name and can still be picked: "On trip
  <destination>", "Time off", or "Out of service". The clashes are read once
  when the tab opens, for the trip's own dates, not the board's week.
- **A field that clashes after it is picked shows Carbon's warning** under it
  with the same words, and Save still saves, as a drag onto a busy row does
  today. A driver in two seats of the same trip is the one error that blocks
  Save.
- **Fewer buses removes the last buses.** An empty bus goes at once; a bus
  with a bus or a driver on it asks first in a small modal that names them.
  Remove bus in a group's menu removes that bus and lowers the count.
- **The tab saves with the trip's Save,** and counts toward unsaved changes
  like the lists on Billing. A bus left with no bus chosen is kept, with its
  seats, and draws in the Unassigned row, where rux-ui would drop it.
- **Save writes by id, not by deleting everything,** so the board's bars keep
  their assignment ids and a driver's reminder and envelope flags survive:
  update the rows that changed, insert the new ones, delete the removed ones,
  then number each leg's positions from 0. Then it syncs every seat's status
  in one call, since the function deletes any seat the list leaves out.
- **The Needs line stays at the top of the tab,** naming the trip's
  requirements and vehicle type, as the vehicle type plan asks; a chosen bus
  that lacks one gets the bar's warning chip words under its field.
- **Relief keeps rux-ui's Swap time and Note,** because the driver's page
  shows the swap time as the relief driver's report time.
- **Sending driver info, share links and pay stay in rux-ui** for now; this
  plan only assigns.

## Questions

None open.

## Tasks

- [ ] Read `trip_drivers.id`, `report_time` and `instructions`, and each
      trip's clashing assignments, time off and out-of-service spans for its
      dates.
- [ ] Build the leg sections, bus groups and seat rows with the number input,
      combo boxes and overflow menus, at the panel's small size.
- [ ] Add the clash notes and warnings, the duplicate-driver error, and the
      fewer-buses modal.
- [ ] Save the counts, assignments, seats and statuses by id, and mark the tab
      dirty.
- [ ] Change the Fleet rows in `scheduler/docs/screen-inventory.md` from
      read-only and later to this, and remove the Fleet survey question and
      task from `docs/plans/scheduler-editor-layout.md`.
- [ ] Try it with invented trips at desktop and phone width, including a Split
      trip and a trip rux-ui saved.
- [ ] rux assigns a bus, a driver and a relief on one real trip and checks
      rux-ui shows the same crew.
