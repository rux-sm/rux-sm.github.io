---
type: reference
---

# rux's rules for trips

One rule a line, with its reason. When rux gives a new one, it goes in the
section it belongs to; when one turns out wrong, the line is replaced.

## Quotes and billing

- The price that counts is the latest quote the customer was sent: a revised or price-matched quote replaces the first, since it is what they agreed to.
- A quote is entered as the lines that make it, such as a Bus rental line and a Discount line for a price match, so the quoted price is their sum and Billing can be marked Done.
- A plain quote is priced with the bus rental the Billing tab's Quote starts from, from the Route tab's miles a day; the dead-mile discount is the Billing tab's own offer, past the limit on the Settings page, and the quote calculator is opened only for another rate or a price match. Both round each charge (regular miles, dead miles, driver pay) up to the next $5, because those miles include the yard legs and a quote with no cents reads cleaner.
- A trip from April to early June is quoted at the Busy season mileage rate, not Regular, because those are the busiest weeks and the buses fill either way; the Settings page's Calendar gives each month its rate, and a month it leaves on Default is set on the line by hand.
- A PO fixes the price; a cost the office takes on after it, such as a second driver, goes in as its own line with an equal Discount, and an update says the decision is still open.
- A quote can go out with a leg's times as TBD, because the times are settled with the customer later and never hold a quote back.
- A quote names the departing city and the farthest destination city only, even when the trip stops in more, because one pair of cities keeps the quote simple.
- When a customer changes a quoted or signed trip's days or route, the trip is priced again by the calculator on the new route and days, as its Bus rental line, never as the old price with a line added, because the calculator's figure is what the office quotes that trip new.
- A booking whose buses run different itineraries is entered as one trip per bus, each with its own route and its bus's share of the price, and each carries the same contract, PO and quote sent, because the editor cannot yet give one trip a second route.

## Route

- Every stop with a time in the customer's itinerary goes on the route; a meal or stop with no time and no place stays off until it has one.
- Times the itinerary leaves TBD get a sensible placeholder, said so in the report, because the route needs times to give hours.
- A stop that matches a saved location uses the saved location, never a fresh map result, because the saved one already carries the right name and map point.
- A local trip over several days is one trip with one leg a day, each from the yard and back, made with Add leg, and one Bus rental line for every leg, because the bus comes home every night and each day can have its own driver.
- A long day where the group stays nowhere overnight is kept as a one-day trip even when it gets back after midnight, because the +1 beside the time already shows the overlap.
- A trip is entered with the real day and time the bus is back at the yard, and its dates are never shortened by hand: a return before the late-return hour on the Settings page, 4:00 AM, counts as the night before by itself, so the board, the picks and the quote's days leave that day free, because it leaves room for a whole other trip.
- Add a fuel card whenever the Route tab suggests one; no need to ask.
- When a save offers to add new places to Locations, save each one whose address is a full, correct street address and whose name is the place's accurate name, and leave out the rest, because a saved location gives the next trip the right name and map point.
- When the Route tab's second-driver notice offers Count as off duty, take it where the driver spends those nights at a hotel, because a hotel night is off duty; ask rux where the itinerary does not say where the driver sleeps.
- When the Route tab's second-driver notice offers Rest in the sleeper, take it: one driver resting in a sleeper coach during that wait is the plan, because rux always prefers it to a second driver. When the notice offers the co-driver alone, set the long waits at the day's stops, such as a museum or a zoo, to sleeper berth in each stop's window until the notice clears, and raise the second driver with rux only if it still shows, because it changes the cost and the crew.
- With one driver, the trip requires a sleeper and an update carries the rest plan the driver is told, such as hours in the sleeper at the stop with the bus parked there; the driver's itinerary says Rest in sleeper on that stop and nothing more.

## Buses and drivers

- Drivers are sent the trip only once it is confirmed, so an unconfirmed trip's drivers not confirming is expected, not a problem.
- A new driver goes out first as co-driver beside an experienced driver, never alone on a bus, so they learn the work before they drive a trip of their own.
- A driver gets trips on two days in a row only when the rest between them is clearly enough, at least 10 hours from one trip's return to the yard to the next trip's departure, such as an evening trip back by 19:30 before a 10:30 departure, so the driver's hours reset. A trip spanning several days counts as one trip.
- A driver rux has said not to depend on is not counted as cover: a review leaves them out of the free drivers and offers them for no seat, because a trip that waits on them may have no driver on the day; who that is stays out of this public file.
- When the week needs part-time drivers, seat them on Saturday first and the full-time drivers on the weekdays, because Saturday is when most part-timers are available.
- The owners drive only when no other driver is free, and then on the shortest trips of the day, because they run the company the rest of the time.
- A trip's equipment needs pick its bus first, such as a sleeper for a long one-driver day, an ADA lift or 56 seats; among the buses that meet them, the farthest trips take the newest, as the board lists the buses newest first, because the newest are the most comfortable and reliable over distance.
- A customer on a local trip asking how many a bus seats is told the office has 52- and 56-passenger coaches, but a long trip is never promised a 56-seat coach, because the 56-seat coaches have no sleeper and a long day's on-duty hours may need one.
- Coaches 763 and 218, the two newest, have leather seats and the rest have cloth, so a customer who asks for leather is offered one of those two, as long as one is free.
- A bus gets as long at the yard between trips as the week allows, so it can be cleaned and fuelled: a bus back late at night goes out on a later departure the next day rather than an early one.
- When a trip's drivers rest in the sleeper and one of its buses has none, the fixes are tried in this order, because a swap is the easiest and a co-driver is the last resort: swap the bus with a sleeper from a trip on the same days that needs none; install a sleeper in the bus, which the office can always do and is written as a Tasks row on the trip, kind change, due before the trip; and only when neither can be done, a co-driver.
- Need hotel is on only when the office books the driver's room; when the customer provides it, as they usually do, it stays off.

## Customers and confirmation

- A trip is confirmed by a signed contract, a PO or a payment; until then an update says what it is waiting on.
- When the booking contact is away, an update names who to reach instead, with their email.
- The email thread is linked to the trip while reviewing it, so the next review opens it directly.
- A customer's request that has not been answered in the thread, such as driver information or documents, goes in the report.
- A customer whose profile gives the quote no address gets one before the quote is printed: its usual pickup set to its saved location, or a bill-to address typed when the bills go somewhere else, because the quote's Name/address box prints the profile's bill-to address, or else its usual pickup's.
- The Charter Bus is a third party that offers the office trips. Hector chooses which ones to take, and the office covers only those, so a list from them is Hector's to answer and a trip is entered once he has chosen it.

## Checklist and paperwork

- Route, Buses and Billing are marked Done once each is reviewed against what we know now; a later itinerary is updated in and the tab marked again.
- Printing the itinerary and envelopes is prep for the day before the trip, so it is not reported as missing earlier.

## Updates

- An update is a few general words, such as Updated itinerary or Bus assignment changed, never the details, because the bar and its card show the update whole and the details already sit on the trip's tabs and files.
- Every email, call or text with a customer gets an update on its trip, such as Will follow up Monday, unless an update already says it, because the trip's bar is where the office sees what the customer was last told.

## Placeholders

- A yellow (amber) trip is a placeholder: the bus is held, no quote is sent yet. Asked to add a trip, look for a placeholder with the same customer and dates and fill it in with `draft_trip_change` rather than drafting a new one. Report it as a placeholder, not a booking.

## Not yet decided

Questions rux has been asked and has not answered. An answer becomes a rule
in its section above, and its question is deleted.

- Does every quoted trip get a bus assigned to hold it, or only when rux says so?
- Is a bus held for a trip The Charter Bus offers before Hector has chosen it?
- When an itinerary gives no headcount, is the customer asked, or does the last count they gave stand?
- When a save offers to add new contact details to the lists, which are added? Until rux says, the answer is Not now.
