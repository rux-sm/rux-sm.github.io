---
type: plan
---

# Plan: a bus a partner covers

## Goal

When the office has no bus or driver free, a partner company covers one of
the trip's buses with its own coach and driver. The scheduler says so: the
bus is one of the leg's vehicles, named for the partner, with what the
partner charges, whether they have confirmed, and their coach and driver
when they give them. The leg reads as fully covered, the board shows the
bar, the trip's price is set against what it pays out, and nothing asks for
our envelope, our driver's link or our fuel card for a coach that never
comes to our yard. Each partner has a profile the office keeps up, with its
details, its papers, such as its insurance certificate, and the trips it has
covered, and the board warns before a partner whose insurance has run out
covers a bus.

Today the office writes "outsourced" in an update and leaves the vehicle
empty, so the leg reads as short of a bus and the Tasks list keeps asking for
one, or once made a driver record named for the company, which put it on the
driver pickers, links and forms as if it were a person.

## Decisions

### The partner

- **A partner is a company, or an owner-operator, that covers a whole bus,**
  coach and driver, kept in a `partners` list: name, phone, email, its
  dispatch contact, its USDOT number, notes, and Active or Inactive, because
  the same few partners cover again and again, and a carrier is looked up by
  its USDOT number.
- **A partner is not a customer and not a driver,** because a customer is
  who pays and a driver is a person we seat; a company that is both a
  partner and a customer is one row in each.
- **A partner's name is spelled as QuickBooks spells the vendor,** so the
  bill it sends matches when bills are exported.
- **`partners.html` lists them and opens each one's profile,** saved through
  `pair.js` as the Customers page is, in the side nav after Drivers. The
  profile has three tabs, as a driver's does: Details, Documents and Trips,
  the trips it has covered. A partner on any trip is set Inactive, never
  deleted.
- **The profile is the office's alone,** and a partner gets no link of its
  own, because the office takes its details and papers by email and keeps
  them itself.

### A partner's papers

- **A partner holds papers as a customer or a driver does,** a
  `company_documents` row with a `partner_id` beside its `customer_id` and
  `driver_id`, so the Documents page, its replacing of an old copy and its
  end dates work for a partner unchanged.
- **A partner's papers are the kinds not kept for a driver:** the Insurance
  certificate with its four parts, the W-9, and any kind the office adds on
  the Documents page, such as operating authority.
- **The profile's Documents tab uploads them in place,** as a driver's does,
  and lists each with its end date, flagged within 30 days.
- **The board reads the papers every partner must hold,** the kinds marked
  so on the Documents page, the Insurance certificate at first. A covered
  bus whose partner lacks one, or whose copy ends before the leg's last
  day, is a problem on its bar, as a driver's medical card that runs out
  is.

### The covered bus

- **A covered bus is one of the leg's vehicles,** a `trip_assignments` row
  with a partner and no bus and no seats, so it counts toward the leg's
  buses as any vehicle does and sits on its route as the trip-shapes plan
  has every vehicle do.
- **The database keeps a partner and our bus or driver apart:** a check
  refuses a vehicle with both a partner and a bus, and a trigger refuses a
  seat on a covered vehicle, so no page can make half of each.
- **It carries the partner's price for that bus on that leg,** in dollars,
  since a trip of several legs may be covered on some days and not others.
- **It carries when the partner confirmed and who marked it,** because
  "waiting on them" is the state the office chases.
- **It carries their coach and their driver's name and phone as typed,** each
  optional, because partners give them late and the office needs the
  driver's phone on the day.
- **A vehicle's needs and type are what was asked of the partner,** shown
  on the card and never compared, because we hold no record of their coach.

### The editor

- **The vehicle's window chooses Our bus or Partner.** Partner shows the
  partner picker, the price, Confirmed, and their coach, driver and phone,
  and hides the bus, the seats and Add co-driver.
- **Turning a vehicle with drivers seated to Partner asks first,** because
  those drivers come off the trip and are told as a driver taken off is.
- **A partner name typed that the list lacks becomes a partner on Save,** as
  a customer typed new does.
- **The Billing tab shows Paid to partners,** the sum of the trip's partner
  prices, and what is left of the trip's price after it.
- **The trip's history names it:** which bus of how many, the partner, and
  its price, as a Buses and drivers line.

### The board

- **A covered bus's bar sits in a Partners row,** below the fleet and above
  No bus, shut until one of its bars is in view, as a bus no longer active
  is, because the office plans no partner's coaches by row.
- **The bar names the partner where the drivers go,** marked unconfirmed
  until it is, and never says Needs a bus.
- **It has no live line,** because Samsara knows only our buses.
- **Dragging a covered bar onto a bus's row asks first,** since it takes the
  bus back from the partner; dropping a bar on the Partners row opens its
  vehicle's window at Partner.
- **The card and the phone's sheet name the partner,** their coach, driver,
  phone, price and whether they confirmed.

### What a covered bus asks of the office

- **It asks only that the partner confirm and a price be entered.** The
  checklist counts it as a bus assigned, with no open seat, envelope, seat's
  itinerary, reminder, pay, hours of service, driver form, fuel card or
  driver's answer.
- **An unconfirmed partner inside fourteen days is a problem on the board,**
  as a seat with no driver is, and the Tasks list asks for it the same way.
- **Only its partner's papers and status stand in a covered bus's way:** an
  insurance certificate that runs out before the leg ends, or a partner set
  Inactive, which `clashes.js`'s standing rule says beside a driver's card
  that lapses. An automatic pick never touches a covered bus.
- **The leg's itinerary prints for it, headed with the partner's name,** so
  it can be emailed to them as the office does now; it gets no envelope,
  hours-of-service record or driver's link.
- **Departures lists it by the partner,** with their driver and phone and no
  seat steps.
- **The week schedule prints it in a Partners row,** and the maintenance
  schedule leaves it out, because the coach never comes to our yard.
- **The customer's papers never name the partner,** as now: the quote,
  confirmations and emails speak of the trip's buses.
- **The connector names the partner and its price** in `get_trip` and
  `needs_attention`, finds a partner's papers in `find_documents`, and the
  trips skill says how to enter one.

### How it is kept

- **The tables are in place,** as the scheduler's database inventory
  describes them: `partners`, the partner columns on `trip_assignments`
  and `company_documents.partner_id`.
- **It ships reader first.** Every existing vehicle has no partner, so the
  readers move first and nothing changes on screen; only then does the
  editor write a partner.
- **The one seat on the driver record made for a company moves to a partner
  of that name,** and the record stays Inactive with no trips.

### Order

- **It is built before the rest of the trip-shapes plan,** because a bus is
  outsourced most weeks and each one reads as short of a bus now, while a
  covered bus is a vehicle already on its route and needs nothing that plan
  has left.
- **The vehicle's window keeps Our bus or Partner as its own section,** so
  the route choice the trip-shapes plan adds there goes beside it and
  neither change rewrites the other.

## Questions

None open.

## Tasks

- [ ] Draw it: the Partners row in `data.js`, the bar in `bar.js`, the card
      in `trip-tips.js`, the sheet in `trip-sheet.js`, Departures, and its
      states in `components-data.js`.
- [ ] Print it: the itinerary headed with the partner, the week schedule's
      Partners row, and no envelope, hours of service or driver's link.
- [ ] Make `partners.html` on `pair.js`, with its side-nav link on every
      page, and the profile's Details, Documents and Trips tabs; let the
      Documents page list, upload and filter a partner's papers, and mark a
      kind as one every partner must hold.
- [ ] Give the vehicle's window Our bus or Partner, the Billing tab Paid to
      partners, the history its line, and the board's drag its question.
- [ ] Move the company's driver seat to a partner, and set the upcoming
      trips whose updates say a bus was outsourced, asking rux for the
      partner where an update does not name one.
- [ ] Name the partner in the connector's `get_trip` and `needs_attention`,
      find its papers in `find_documents`, deploy the connector, whose rules
      already count a covered bus, and say how to enter one in the trips
      skill.
- [ ] Say which screens read and write `partners` and the partner columns in
      the database inventory, and describe the page and the changed screens
      in the screen inventory and the scheduler's `README.md`.
- [ ] In Chrome on :8641, with the page's writes recorded and not sent, cover
      one bus of three on a trip, confirm it, price it, and see the leg read
      as fully covered, the bar in the Partners row and Billing's Paid to
      partners; then open a saved trip with no partner and see it read as
      before.
