---
type: reference
---

# The quote calculator

The quote calculator's details the page itself does not state. No rate is
written here, because this repository is public.

## Drivers and dead miles

- The second driver's pay is worked out on both drivers' combined miles,
  which are the trip's miles, at the two-driver rates. How the miles are split
  between the drivers doesn't change it, as long as the days are the same.
- The dead-mile discount lowers only the mileage charge. Driver pay counts dead
  miles like any other mile.
- Dead miles are part of the trip's miles. More of them than the trip has
  would make the mileage charge negative, so the dead miles field warns and the
  Mileage note says to check it. The quote still counts them.
- The rates page's one-driver rate for the fourth driver pay band is not used.
- The spreadsheet's local church choice is not offered, so its rate is not on
  the rates page.

## From a trip

The Quote calculator shortcut opens the calculator in the board's document
panel, without the header or the Rules tab. Its days are the Route tab
Summary's rows, a day's miles each, from what the editor's fields say now,
saved or not, once the drives a trip opens without are looked up. A trip
picked on the board opens in the editor first, because the Summary is where
its days are counted. Until the route has miles, typed estimated miles stand
in, spread over the trip's days. The Billing tab's lines price from the same
days, so the two agree.

Dead miles are counted only when asked for. The calculator offers the route's,
the drive from the yard and back, as a checkbox, ticked when the trip's rental
already counts them; a rental line counts them once its Dead miles field has a
figure.

The mileage and a second driver are one bus's, times the Buses field; each
relief driver is the rates page's flat charge, so the total is the trip's.
Opened from a trip, Buses is the leg's buses and Relief drivers its relief
seats, at the start or the end on any bus, each a charge of its own. The
Billing tab's Relief driver line, an Addt'l Driver described as a relief
driver, counts those seats as the Second driver line counts co-drivers.

Drivers starts at 2 when the leg has a co-driver seat on. The Buses tab's
co-driver seats decide the Second driver line, one a seat, and the Route tab's
Summary warns when a leg needs one: over 10 hours driving, or over 15 on duty
less rest, on any day, the rule the line's own words quote.

Add to quote lines replaces the leg's lines, all but its hotel, with the
calculator's quote: a Bus rental at its rate, a Second driver for two drivers,
a Relief driver line, and a Discount and an Other line for those fields.
Buses and relief seats stay the Buses tab's to change, and a count that
differs from the calculator's is said. It turns the leg's co-driver
seats on for two drivers and off for one, except a seat with a driver in it,
which stays with its line. Show dead miles as a discount prices the rental at
the full rate on every mile and adds a Dead miles discount line for the
difference, a bus at a time. While the calculator's days are the route's, the
rental and second driver are left to follow the route; days changed in the
calculator are typed in as its figures. Nothing is kept until Save.

## Where it follows the spreadsheet

The calculator's Rules tab, in `scheduler/quote.html`, lists each place it
copies the spreadsheet though the result looks wrong, with an example worked
out by `scheduler/quote.js` at the saved rates.
