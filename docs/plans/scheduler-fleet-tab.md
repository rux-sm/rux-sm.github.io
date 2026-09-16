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
- **The tab is one section per leg.** A trip that is not Split has one,
  Buses; a Split trip has Drop-off buses and Pick-up buses, named as Details
  names its dates, and the second shows only while Type is Split. Each opens
  with Carbon's small number input, Buses needed, from 1 to 20. Leaving Split
  deletes the pick-up buses on Save, as rux-ui does.
- **Each bus is a tile titled Bus 1, Bus 2…,** Carbon's tile on layer two as
  the Billing summary is, 16px apart, so each crew has an edge of its own. Its
  fields take `field-03`, since the side panel's `field-02` is the tile's own
  colour. The title line holds the Day-of contacts overflow menu: Add
  co-driver, Add relief at start, Add relief at end, and Remove bus. Inside,
  top to bottom: the bus, then the driver, then each seat that is on, each a
  combo box across the row, and for a relief seat, Swap time over Note, which
  the tile leaves too narrow to pair. A seat's menu item turns into Remove
  co-driver or Remove relief while it is on.
- **Pay is not on the Fleet tab.** It waits for a later plan, perhaps a
  section on Billing; the save never writes `trip_drivers.pay`, so pay set in
  rux-ui stays as it is.
- **Each filled seat shows its status and sets it** from a small ghost button
  at the end of its field, which opens the five statuses; a status picked here
  saves with the trip. The icon is Carbon's icon indicator rather than the
  bar's role icon on a disc, since the label already names the role: a dashed
  circle for Off, caution major for Pending assignment, caution minor for
  Pending response, a check for Confirmed and an error for Declined, each a
  shape as well as a colour, and the yellow one legible in the light themes. Choosing a different driver sets that seat to Off,
  as rux-ui does and the driver status plan asks.
- **The pickers are Carbon combo boxes over active buses and drivers,** plus
  whoever the trip already has, so an inactive driver stays readable. An option
  that clashes says so beneath its name and can still be picked: "On trip
  <destination>", "Time off", or "Out of service". The clashes are read when
  the editor opens and again when Fleet is chosen, for the trip's dates as
  Details holds them, not the board's week.
- **A field that clashes after it is picked shows Carbon's warning** under it
  with the same words, and Save still saves, as a drag onto a busy row does
  today. The same bus twice on one leg warns too. A driver in two seats of
  one leg is the one error that blocks Save.
- **Fewer buses removes the last buses.** An empty bus goes at once; a bus
  with a bus or a driver on it asks first in a small modal that names them.
  Remove bus in a group's menu removes that bus and lowers the count.
- **The tab saves with the trip's Save,** and counts toward unsaved changes
  like the lists on Billing. A bus with no bus chosen but a driver or a seat
  turned on is kept and draws in the Unassigned row, where rux-ui would drop
  it; a bus with nothing on it is only the count.
- **Save writes by id, not by deleting everything,** so the board's bars keep
  their assignment ids and a driver's reminder and envelope flags survive:
  update the rows that changed, insert the new ones and delete the removed
  ones, numbering a leg's positions from 0 only when its buses were added,
  removed or reordered, so a trip opens with nothing to save. Then it syncs
  every seat's status in one call, since the function deletes any seat the
  list leaves out.
- **The Needs line stays at the top of the tab,** naming the trip's
  requirements as Details holds them, and the vehicle type once the vehicle
  type plan adds it; a chosen bus that lacks one gets the bar's warning chip
  words under its field.
- **Relief keeps rux-ui's Swap time and Note,** because the driver's page
  shows the swap time as the relief driver's report time.
- **Sending driver info, share links and pay stay in rux-ui** for now; this
  plan only assigns.

## Questions

None open.

## Tasks

- [ ] rux opens a trip rux-ui saved, assigns a bus, a driver and a relief on
      one real trip, and checks rux-ui shows the same crew and statuses.
