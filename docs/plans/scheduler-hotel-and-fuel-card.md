---
type: plan
---

# Plan: the drivers' hotel on Billing, and the fuel card from the route

## Goal

The two driver needs leave the Buses tab and go where their work is. A hotel
the office books becomes a quote line that prices it and keeps a reminder on
the trip until it is confirmed. A fuel card is suggested by the trip's own
miles or days instead of being remembered.

## Decisions

- **Hotel is a quote line kind on the Billing tab.** Adding it puts its price
  on the quote and turns the trip's hotel need on; removing it turns the need
  off, so `need_hotel` and `trip_reqs.hotel` stay what rux-ui and the print
  pages read.
- **The reminder lasts until the confirmation is in.** The line's window holds
  the confirmation number per leg, in `hotel_itinerary_number_outbound` and
  `_return`, and entering it marks that leg booked, as Mark hotel booked does
  now; the bar and card keep the hotel mark until then.
- **The customer's own hotel needs nothing,** since the office books a room
  only when the customer does not.
- **A fuel card is suggested from the route.** A trip whose miles or days pass
  a limit the office sets shows a suggestion to assign a fuel card, which turns
  the fuel card need on when taken; the limits are kept in `settings`.

## Questions

1. **The fuel card limits.** What should suggest a fuel card by default: over
   how many miles, or over how many days?
2. **The hotel price.** Is the hotel line priced per night per room, or one
   amount typed for the whole stay?

## Tasks

- [ ] Add Hotel to the quote line kinds, with its price, nights and the
  confirmation per leg, and tie `need_hotel` to the line.
- [ ] Keep the hotel mark on the bar and card until every leg's confirmation
  is in.
- [ ] Store the fuel card limits in `settings`, give them a place on the
  Settings page, and suggest the fuel card on the Route tab when a trip passes
  them.
- [ ] Take Hotel and Fuel card off the Buses tab.
- [ ] Update `scheduler/docs/screen-inventory.md` and `scheduler/docs/booking.md`.
- [ ] Check it in Chrome on :8641 on a trip with a hotel and a long trip.
