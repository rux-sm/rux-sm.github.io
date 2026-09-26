---
type: plan
---

# Plan: The printed week schedule

## Goal

The scheduler prints a week on Legal paper, five buses to a sheet, so the
office can pin it to the wall or hand it to the shop, with more on each trip bar
than the board has room for. It is the fourth form on the forms page, beside
the driver envelope, the driver itinerary and the customer quote; rux-ui keeps
its own Print schedule.

## Decisions

- **Legal landscape, five buses a sheet, and nothing to choose.** That is how
  the office prints it, so the form fixes both rather than offering rux-ui's
  paper, orientation and rows-per-page choices. The sheet is 14 by 8.5 inches
  with rux-ui's 0.2-inch margin, which leaves each bus a row about 1.5 inches
  tall and each day a column about 1.9 inches wide.
- **The week on screen, seven days from its first,** a row per bus and a column per day
  as the board draws them, with the logo and the week's dates at the top of
  every sheet and "Page N of M" when there is more than one. A trip that runs
  across days is one bar across them, and trips on the same bus the same day
  stack. An inactive bus prints only in a week it has a trip, and the last
  sheet keeps its empty rows, so every sheet is ruled the same.
- **Two reports, as rux-ui has them.** The billing report is the whole bar;
  the maintenance report leaves the money and the contact off, so the shop can
  be handed it.
- **A bar carries what rux-ui's billing report prints,** in its order:
  destination with the paid mark, the leg's direction and the requirement
  icons; the customer; the booking contact and phone; depart, spot and return
  times from the trip's stops; the drivers by short name with their pay; miles
  quoted and actual; the quote, PO and invoice; and each payment. Five rows a
  sheet give each bar about 13 lines at rux-ui's 10-pixel type where rux-ui's
  four gave it fewer, and the extra fields fill that room.
- **Nothing is squeezed.** rux-ui shrinks a crowded row to 55% and clips the
  rest; this form measures the busiest day it has to print and says on the
  forms page which trips did not fit, rather than printing them unreadable.
- **Cancelled trips are left off,** as the board leaves them off.
- **A registry entry in `print.js`,** bound to a week rather than a trip, so the
  forms page asks for a week and the board's own menu opens it for the week on
  screen.
- **Printed from Chrome with the Print button,** like the other forms, with the
  sheet measured by re-applying the print rules as screen rules.

## Questions

1. Which extra information goes on the bars, beyond what rux-ui's billing
   report prints? It never prints the trip's notes, a driver's phone, the bus
   type, the balance still owed, the trip reference or the pickup place's name.
2. Do the bars keep their colours on paper, as rux-ui's do, or print in black
   and white with a border? Colour needs the printer to print it; the other
   forms print no fills except the quote's grey cells.
3. Is the maintenance report still wanted, and is it the same sheet without the
   money and the contact?

## Tasks

- [ ] Add the week form to `print.js`'s registry: Legal landscape, five buses a
      sheet, both reports, drawn from the week the board reads.
- [ ] Draw the bar with the fields above and the answers to the questions.
- [ ] Measure the sheet at the busiest week the database holds, and name on
      the forms page any trip that does not fit.
- [ ] Open it from the board's menu for the week on screen.
