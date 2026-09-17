---
type: plan
---

# Plan: a trip's vehicle type and email thread

## Goal

A trip names the vehicle it needs, its equipment choices follow that vehicle,
and the board warns when the bus is the wrong type. The trip editor also shows
and opens the booking's email thread, as rux-ui does.

## Decisions

### Email thread

- **No database change.** rux-ui already stores the link in
  `trips.booking_contact_missive_url`, and 100 trips have one.
- **A link field under Email in Booking contact,** with an open button where
  the other fields have copy. It is the customer's conversation, so it sits
  with their contact details.
- **An "Open email thread" shortcut on the bar waits** until rux misses it.

### Vehicle type

- **The types are Coach and Van, and the list comes from the fleet:** the
  dropdown offers the distinct `buses.type` values, so a new type needs no
  code. rux-ui's bus form offers the same two names.
- **A new nullable text column, `trips.vehicle_type`, holds the type,** and
  null means Any, so existing trips raise no warning. rux-ui's trip
  save sends only its form's fields, so it leaves the column alone.
- **Type and Vehicle share a row** in the editor's Trip section. Half the row
  leaves about 72px for text, so "Drop-off and pick-up" is shown as "Split";
  the date labels still say Drop-off and Pick-up.
- **Equipment follows the vehicle.** A Needs tag shows for a type when at
  least one bus of that type has it: `sleeper`, `ada_lift`, or a `capacity` of
  56 or more. Any shows every tag. Hotel always shows, since it is not the
  bus's. Choosing a type turns off the tags it hides.
- **Editing equipment per bus is what makes it editable.** rux-ui's bus form
  already switches sleeper and ADA lift, and a tag appears for a type as soon
  as one of its buses has it. A new kind of equipment still needs code and a
  column; a fleet page that edits the list is a later plan.
- **The wrong type is a warning chip on the bar,** beside the equipment chips:
  "Needs a Van, bus N is a Coach". The Fleet tab's Needs line names the type.

## Questions


## Tasks

- [ ] rux sets a vehicle and opens a thread on a real trip, and checks rux-ui
      still saves both the trip and a bus.
