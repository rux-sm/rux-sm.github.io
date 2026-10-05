---
type: reference
---

# rux's rules for trips

One rule a line, with its reason. When rux gives a new one, it goes in the
section it belongs to; when one turns out wrong, the line is replaced.

## Quotes and billing

- The price that counts is the latest quote the customer was sent: a revised or price-matched quote replaces the first, since it is what they agreed to.
- A quote is entered as the lines that make it, such as a Bus rental line and a Discount line for a price match, so the quoted price is their sum and Billing can be marked Done.
- A plain quote is priced with the Billing tab's Add the bus rental, from the Route tab's miles a day; the quote calculator is opened only for a dead-mile discount, another rate or a price match. Both round each charge (regular miles, dead miles, driver pay) up to the next $5, because those miles include the yard legs and a quote with no cents reads cleaner.
- A trip from April to early June is quoted at the Busy season mileage rate, not Regular, because those are the busiest weeks and the buses fill either way; the rate's amount is on the rates page.
- A PO fixes the price; a cost the office takes on after it, such as a second driver, goes in as its own line with an equal Discount, and the trip's pinned update says the decision is still open.
- Estimated miles is set to the Route summary's total once the route is right, so the two agree.
- A quote can go out with a leg's times as TBD, because the times are settled with the customer later and never hold a quote back.

## Route

- Every stop with a time in the customer's itinerary goes on the route; a meal or stop with no time and no place stays off until it has one.
- Times the itinerary leaves TBD get a sensible placeholder, said so in the report, because the route needs times to give hours.
- A stop that matches a saved location uses the saved location, never a fresh map result, because the saved one already carries the right name and map point.
- A long day where the group stays nowhere overnight is kept as a one-day trip even when it gets back after midnight, because the +1 beside the time already shows the overlap.
- Add a fuel card whenever the Route tab suggests one; no need to ask.
- When the Route tab asks for a second driver, first try one driver resting in a sleeper coach during the longest wait (that stop's wait counted as sleeper berth); if the notice clears, one driver with a sleeper is the plan, because rux always prefers it to a second driver. Only when it does not clear, raise the second driver with rux before deciding, because it changes the cost and the crew.
- With one driver, the trip requires a sleeper and the pinned update carries the rest plan the driver is told, such as hours in the sleeper at the stop with the bus parked there, since the route cannot show it.

## Buses and drivers

- Drivers are sent the trip only once it is confirmed, so an unconfirmed trip's drivers not confirming is expected, not a problem.
- A new driver goes out first as co-driver beside an experienced driver, never alone on a bus, so they learn the work before they drive a trip of their own.
- A driver gets trips on two days in a row only when the rest between them is clearly enough, at least 10 hours from one trip's return to the yard to the next trip's departure, such as an evening trip back by 19:30 before a 10:30 departure, so the driver's hours reset. A trip spanning several days counts as one trip.
- The owners drive only when no other driver is free, and then on the shortest trips of the day, because they run the company the rest of the time.
- A trip's equipment needs pick its bus first, such as a sleeper for a long one-driver day, an ADA lift or 56 seats; among the buses that meet them, the farthest trips take the newest, as the board lists the buses newest first, because the newest are the most comfortable and reliable over distance.
- A bus gets as long at the yard between trips as the week allows, so it can be cleaned and fuelled: a bus back late at night goes out on a later departure the next day rather than an early one.
- Need hotel is on only when the office books the driver's room; when the customer provides it, as they usually do, it stays off.

## Customers and confirmation

- A trip is confirmed by a signed contract, a PO or a payment; until then the pinned update says what it is waiting on.
- When the booking contact is away, the pinned update names who to reach instead, with their email.
- The email thread is linked to the trip while reviewing it, so the next review opens it directly.
- A customer's request that has not been answered in the thread, such as driver information or documents, goes in the report.

## Checklist and paperwork

- Route, Buses and Billing are marked Done once each is reviewed against what we know now; a later itinerary is updated in and the tab marked again.
- Printing the itinerary and envelopes is prep for the day before the trip, so it is not reported as missing earlier.

## Placeholders

- A yellow (amber) trip is a placeholder: the bus is held, no quote is sent yet. Asked to add a trip, look for a placeholder with the same customer and dates and fill it in with `draft_trip_change` rather than drafting a new one. Report it as a placeholder, not a booking.

## Not yet decided

Questions rux has been asked and has not answered. An answer becomes a rule
in its section above, and its question is deleted.

- Does every quoted trip get a bus assigned to hold it, or only when rux says so?
- Does a broker's availability request follow the same steps as a school's quote, and is a bus held before the broker confirms?
- When an itinerary gives no headcount, is the customer asked, or does the last count they gave stand?
- When a save offers to add new places and contact details to the lists, which are added? Until rux says, the answer is Not now.
- The plan in `docs/plans/scheduler-quote-entry.md` holds the questions on rates, the dead-mile discount and the forms.
