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
Summary's rows, a day's miles each, and its dead miles are the drive from the
yard and back, both from what the editor's fields say now, saved or not. A
trip picked on the board opens in the editor first, because the Summary is
where its days are counted. Until the route has miles, typed estimated miles
stand in, spread over the trip's days.

## Where it follows the spreadsheet

The calculator's Rules tab, in `scheduler/quote.html`, lists each place it
copies the spreadsheet though the result looks wrong, with an example worked
out by `scheduler/quote.js` at the saved rates.
