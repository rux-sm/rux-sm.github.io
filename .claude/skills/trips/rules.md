---
type: reference
---

# rux's rules for trips

One rule a line, with its reason. When rux gives a new one, it goes in the
section it belongs to; when one turns out wrong, the line is replaced.

## Quotes and billing

- The price that counts is the latest quote the customer was sent: a revised or price-matched quote replaces the first, since it is what they agreed to.
- A quote is entered as the lines that make it, such as a Bus rental line and a Discount line for a price match, so the quoted price is their sum and Billing can be marked Done.
- A quote is priced from the Route tab's miles a day, entered in the quote calculator, and the total rounded up to the next $5, because those miles include the yard legs and a round number reads cleaner.
- A PO fixes the price; a cost the office takes on after it, such as a second driver, goes in as its own line with an equal Discount, and the trip's notes say the decision is still open.
- Estimated miles is set to the Route summary's total once the route is right, so the two agree.

## Route

- Every stop with a time in the customer's itinerary goes on the route; a meal or stop with no time and no place stays off until it has one.
- Times the itinerary leaves TBD get a sensible placeholder, said so in the report, because the route needs times to give hours.
- Add a fuel card whenever the Route tab suggests one; no need to ask.
- When the Route tab asks for a second driver, raise it with rux before deciding, because it changes the cost and the crew. When he keeps one driver, the notes carry the rest plan the driver is told, such as hours in the sleeper at the destination and arriving early to rest before pickup and after drop-off, since the route cannot show it.

## Buses and drivers

- Drivers are sent the trip only once it is confirmed, so an unconfirmed trip's drivers not confirming is expected, not a problem.
- Need hotel is on only when the office books the driver's room; when the customer provides it, as they usually do, it stays off.

## Customers and confirmation

- A trip is confirmed by a signed contract, a PO or a payment; until then the notes say what it is waiting on.
- When the booking contact is away, the notes name who to reach instead, with their email.
- The email thread is linked to the trip while reviewing it, so the next review opens it directly.
- A customer's request that has not been answered in the thread, such as driver information or documents, goes in the report.

## Checklist and paperwork

- Route, Buses and Billing are marked Done once each is reviewed against what we know now; a later itinerary is updated in and the tab marked again.
- Printing the itinerary and envelopes is prep for the day before the trip, so it is not reported as missing earlier.

## Placeholders

- A yellow (amber) trip is a placeholder: the bus is held, no quote is sent yet. Asked to add a trip, look for a placeholder with the same customer and dates and fill it in with `draft_trip_change` rather than drafting a new one. Report it as a placeholder, not a booking.
