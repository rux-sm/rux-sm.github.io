---
type: reference
---

# The quote calculator

Where the quote calculator follows the office spreadsheet's Calculator tab
even though the result looks wrong. The calculator matches the spreadsheet on
each of these until rux decides otherwise. No rate is written here, because
this repository is public.

1. **Crossing 295 miles can lower the price.** Under 295 total miles a trip is
   billed per day at the local rate. From 295 it is billed by the mile with
   free days, which for a trip of a few days can come to less.
2. **The daily minimum only applies to local trips.** A one-day trip of 295
   miles is billed by the mile, which can come to less than one local day.
3. **An empty last day isn't counted.** Days count up to the last day with
   miles. An empty day in the middle counts; an empty day at the end doesn't.
4. **Very long trips drop a charge.** From 10,250 trip miles, or 6,250 driver
   miles, the free-day table runs out and that charge counts as $0.
5. **The second driver is paid on all the trip miles.** The spreadsheet's
   "2nd Driver" row takes a column of miles for each driver and adds them
   together. With each day's miles split equally between the two drivers,
   that is the whole trip, at the two-driver rates.
6. **Dead miles are free while their rate is $0.** They still count toward
   the 295-mile line and the free days.
7. **The two free-day tables differ.** At 750 to 999 miles a quote gets 1.5
   free days and driver pay gets 1.
8. **The meal allowance isn't added to anything.** The quote shows it under
   driver pay for reference only.
9. **No miles means no charge.** A quote with no miles entered comes to $0
   plus other charges.

Two things are the page's own. The regular quote includes one driver, so only
a second driver adds pay, with each day's trip miles split equally between the
two. So the rates page's one-driver rate for 1,000+ miles is not used.
