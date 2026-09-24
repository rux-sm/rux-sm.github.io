---
type: plan
---

# Plan: a trip's quote as lines

## Goal

A trip's price is a list of saved lines on the Billing tab: one rental line
per leg, and a second driver or a discount when the trip has one. The customer
quote and the QuickBooks description print those lines as saved, and every
figure the trip editor already knows fills itself in, so nothing is typed
twice.

## Decisions

- **The lines live in a new table, `trip_quote_lines`,** shaped like
  `trip_pos` and `trip_invoices`: `trip_id` to `trips` with cascade,
  `position`, `kind` (`rental`, `second_driver`, `discount`, `other`), `leg`
  (`outbound`, `return` or null), `item`, `description`, `quantity`, `cost`,
  `amount`, whether the cost was typed, and for a rental line its `miles`,
  `dead_miles` and `rate`. It takes the one `staff_all` rule and the same
  grants as those two, and is broadcast on realtime as they are.
- **A line is a quantity at a cost.** A rental line's quantity is its leg's
  bus count and its cost is the price of one bus, so a four-bus trip reads
  "Bus Rental 4 × cost". The amount is their product.
- **Each line has its own price, so a leg can cost more than the other.** A
  drop-off and pickup trip starts with two rental lines, one per leg, each
  with that leg's buses, seats and date, and each "departing at" that leg's
  own time: the drop-off's departure and the pickup's return. Any other trip
  starts with one line worded as it is now. The description is
  `SchedulerQuoteText.description` given one leg, so the Billing tab's copy
  and the printed quote still share one wording.
- **A drop-off and pickup trip is priced as two trips.** Each leg has its own
  rental line, its own second driver line and its own miles and days, because
  the legs can have different buses and different drivers.
- **The second driver is one line per trip, or per leg on a drop-off and
  pickup trip.** Its quantity is the number of co-driver seats switched on in
  that leg's Fleet tab, so two extra drivers on a four-bus trip is quantity 2.
  Its cost is one extra driver's pay from the quote calculator's
  `Rux.quote.driverPay`, at the rates in `quote_rates`. The line appears when
  a co-driver seat goes on and goes when the last one goes off.
- **A rental line's cost starts from the calculator's `Rux.quote.tripQuote`.**
  Both formulas read only a leg's total miles and its days, and the trip
  editor already holds both, so the office types no mileage twice:
  - **Miles** are the leg's stops' miles by route, the drive from the yard and
    back included; the Route tab's Estimated miles overrides them, as it
    overrides the route today.
  - **Days** are the leg's dates as the customer sees them, from its first
    day to its last. A bus that leaves the yard the night before adds no day,
    so the price counts the days the quote prints.
  - **Dead miles** are the leg's drive from the yard to the pickup and its
    drive back, which the Route tab already works out, and can be typed over.
  - **The mileage rate** is the default in `quote_mileage_rates`, and a menu
    on the rental line picks another, as the calculator's does.
  The line keeps its miles, dead miles and rate, so the price can be read
  back and a reprint months later prices the same.
- **Any cost can be typed over, and a typed cost stays as typed.** The line
  shows the calculator's figure beside it until it is cleared, so the office
  sees when the two part.
- **Figures the editor knows follow the editor.** A rental line's quantity,
  date, time and seats, and the second driver's quantity and cost, update
  when the Details, Fleet or Route tab changes them, and so does a cost that
  was not typed.
- **A discount is a line with a negative amount,** printed under the lines it
  takes from, so the customer sees the price before and after it.
- **`quoted_price` stays the one total the customer pays,** and a save writes
  it as the sum of the lines. The balance and the confirmation rules go on
  reading one number.
- **A trip with no lines keeps working as it does now.** The Billing tab
  offers its quoted price as one rental line, and the quote draws that one
  line, so trips already priced need no backfill.
- **rux-ui follows once the scheduler's lines work.** Its Billing section
  reads and writes the same lines. Until then a trip whose `quoted_price` no
  longer matches its lines, because rux-ui changed it, says so on the Billing
  tab and offers to put the difference on the first rental line.
- **The quote sheet keeps its typed fields.** A correction typed on the sheet
  still prints, and still is not saved; the Billing tab is where a price is
  saved. A cost typed on the sheet is formatted like a computed one,
  `1,900.00`.
- **The lines appear in the trip's history** beside purchase orders and
  invoices.

## Questions

None open.

## Tasks

- [ ] Bring rux-ui's Billing section onto the same lines, after reading its
      own `CLAUDE.md`.
