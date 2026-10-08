---
type: plan
---

# Plan: More than one route on a trip

## Goal

One booking is one trip, however its buses travel. A trip whose buses pick
up at different places, or leave and come back at different times, holds a
route for each group of buses under one set of details, one quote and one
set of files, so nothing is entered twice and nothing has to be kept the
same by hand.

## Decisions

### The shape

- **A leg can hold more than one route.** A route is its own stops and
  times, a name such as Football or Band, and the buses that run it. A trip
  with one route is every trip there is now, and it looks and saves as it
  does now.
- **Details, Billing, Files and the updates stay the trip's.** The customer,
  the contacts, the dates, the price, the PO and the invoice are entered
  once.
- **The dates are the leg's, not the route's.** Routes on one leg share its
  days and differ in places and times.
- **A route is added as a copy of the one on screen,** so only what differs
  is changed: a pickup, a few stops, a time.

### Where it shows

- **The Route tab shows one route at a time.** With more than one, a
  switcher over the Summary names them, and Add route sits beside it. The
  tab opens on the route of the bar that was pressed, as it opens on that
  bar's leg now.
- **The Buses tab lists a leg's vehicles under their routes,** and a
  vehicle's window chooses its route. A route with no vehicle is still
  listed, so it can be given one.
- **A notice acts on its own route.** Add co-driver and Rest in the sleeper
  change the vehicles of the route on screen, not every vehicle on the leg.
- **A bar shows its own route's times,** and its route's name where the leg
  has more than one, so two groups leaving an hour apart read as two.
- **Each route prints its own itinerary,** and a driver's envelope, link and
  reminder carry the route of the bus they are on.

### The quote

- **One Bus rental line covers the leg's buses,** at one price a bus, as the
  office quotes it. It is priced on the leg's longest route, so no bus is
  quoted short.
- **The line's words name each route:** its buses, when it leaves and when
  it is back, so the customer reads which group goes when.
- **Estimated miles follow the longest route,** as the price does.

### How it is kept

- **A stop and a vehicle each carry a route number,** 1 on every row there
  is now, so no saved trip changes. A route's name is kept in a small table
  of its own, with a row only where a leg has more than one route.
- **Every reader takes a route beside the leg.** The board, the Route tab's
  figures, the forms, the driver's page, the maintenance schedule and the
  connector choose a leg's stops by its route, where they choose by leg
  alone now.
- **Each database change is its own step,** written as SQL, shown to rux and
  applied on a yes, before the code that reads it is pushed.
- **It ships reader first.** Every reader learns the route number while
  every trip still has one route, which changes nothing on screen; the
  second route can be made only once all of them have.

## Questions

## Tasks

- [ ] Write the SQL for the route number on `trip_stops` and
      `trip_assignments` and for the table of route names with its access
      rules, show it to rux, and apply it on a yes.
- [ ] Read the bodies of `get_driver_share_trips`, `get_maintenance_schedule`
      and the two triggers that take a Done off, and write the SQL that
      makes each choose stops by the vehicle's route.
- [ ] Give the shared readers a route: `stopsOfLeg`, `timesOf` and `legsOf`
      in `scheduler/week.js`, `fromStops` in `scheduler/route-figures.js`,
      `stopsForLeg` in `scheduler/driver-text.js` and
      `scheduler/share/driver.js`, and `stopsOf`, `pickupOf` and `legsOf` in
      `scheduler/print.js`, each reading route 1 until asked for another.
- [ ] Make the Route tab hold a route: the switcher, Add route as a copy,
      rename and remove, the tab opening on the pressed bar's route, and
      Save writing each row's route.
- [ ] List the Buses tab's vehicles under their routes, choose a vehicle's
      route in its window, and make Add co-driver and Rest in the sleeper
      act on the route's vehicles.
- [ ] Draw each bar with its route's times and, on a leg of more than one
      route, its route's name, and give the yard gap and the rest between
      trips the same times.
- [ ] Price the Bus rental line and follow Estimated miles on the longest
      route, and write each route's buses and times in the line's words.
- [ ] Print an itinerary for each route, and give the envelope, the driver's
      page, the driver's reminder and the maintenance schedule the route of
      their bus.
- [ ] Hold each route to the Route tab's Done, name the route in a trip's
      history, and count a route with no times in the to-do list.
- [ ] Return each stop's and each bus's route from `get_trip` in
      `scheduler/connector/index.ts`, and deploy the connector.
- [ ] Describe the route number, the names table and the changed windows in
      the scheduler's database and screen inventories, its `README.md` and
      the trips skill.
- [ ] Enter a trip of five buses on two routes in Chrome on :8641 with the
      page's writes recorded and not sent: the second route copied and
      changed, the buses split two and three, each bar's times, one rental
      line of five, an itinerary for each route.
