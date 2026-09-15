---
type: reference
---

# The quote calculator

How the quote calculator prices drivers and dead miles, and where it follows
the office spreadsheet's Calculator tab even though the result looks wrong. No
rate is written here, because this repository is public.

## Drivers and dead miles

- The regular quote includes one driver. Choosing two drivers adds the second
  driver's pay.
- That pay is worked out on both drivers' combined miles, which are the trip's
  miles, at the two-driver rates. How the miles are split between the drivers
  doesn't change it, as long as the days are the same.
- The dead-mile discount lowers only the mileage charge. Driver pay counts dead
  miles like any other mile.
- The rates page's one-driver rate for 1,000+ miles is not used.
- The spreadsheet's local church choice is not offered, so its rate is not on
  the rates page.

## Where it follows the spreadsheet

The calculator matches the spreadsheet on each of these until rux decides
otherwise.

1. **Crossing 295 miles can lower the price.** Under 295 total miles a trip is
   billed per day at the local rate. From 295 it is billed by the mile with
   free days, which for a trip of a few days can come to less.
2. **The daily minimum only applies to local trips.** A one-day trip of 295
   miles is billed by the mile, which can come to less than one local day.
3. **An empty last day isn't counted.** Days count up to the last day with
   miles. An empty day in the middle counts; an empty day at the end doesn't.
4. **Very long trips drop a charge.** From 10,250 trip miles, or 6,250 driver
   miles, the free-day table runs out and that charge counts as $0.
5. **Dead miles are free while their rate is $0.** They still count toward
   the 295-mile line and the free days.
6. **The two free-day tables differ.** At 750 to 999 miles a quote gets 1.5
   free days and driver pay gets 1.
7. **The meal allowance isn't added to anything.** The quote shows it under
   driver pay for reference only.
8. **No miles means no charge.** A quote with no miles entered comes to $0
   plus other charges.
