---
type: plan
---

# Plan: The printed week schedule

## Goal

The scheduler prints rux-ui's billing report of a week, in its format and
layout, on Legal paper five buses to a sheet, so the office can pin it to the
wall. It is the fourth form on the forms page, beside the driver envelope, the
driver itinerary and the customer quote; rux-ui keeps its own Print schedule.

## Decisions

- **The format and layout are rux-ui's billing report, exactly;** only the
  visual style is this app's, its type, colours and rules from Design. rux's
  printed sheet of the week of 2026-09-21 is the reference to match.
- **One report, the billing one.** rux-ui's maintenance report is not carried
  over.
- **Legal landscape, five buses a sheet, and nothing to choose.** That is how
  the office prints it, so the form fixes both rather than offering rux-ui's
  paper, orientation and rows-per-page choices. The sheet is 14 by 8.5 inches
  with rux-ui's 0.2-inch margin.
- **The sheet, top to bottom:** the logo at the left and the week's dates at
  the right, with "— Page N of M" after them; then the grid, ruled in a frame,
  with a header row of days, each its weekday in capitals at the left and its
  date at the right, and a narrow column of bus numbers down the left. Every
  sheet repeats both. Buses run in the board's order, five to a sheet, and the
  last sheet keeps its empty rows so every sheet is ruled the same. An inactive
  bus prints only in a week it has a trip.
- **A trip is a card across its days,** sitting at the top of its bus's row
  and as tall as its lines, in the trip's colour; trips on the same bus the
  same day stack. Its lines, in order:
  1. the destination in bold, with the leg's direction and the requirement
     icons at the right, and the paid mark when the trip is paid;
  2. the customer;
  3. the booking contact's name and phone;
  4. depart, spot and return, in bold across the card, or `--:--` where the
     trip's stops have none;
  5. the drivers, centred, each with the icon of their role and their short
     name;
  6. then ruled lines of two columns: each driver's pay as `D1:`, `R1:`;
     `Mi:` quoted miles and `Act:` actual; `Qt:` the quote and `PO:`; `Inv:`;
     and `Pmt:`, each payment's method, reference and amount.
  A label prints even when its value is empty, as on rux-ui's sheet.
- **Nothing is squeezed.** rux-ui shrinks a crowded row to 55% and clips the
  rest; this form measures the busiest day it has to print and says on the
  forms page which trips did not fit, rather than printing them unreadable.
- **Cancelled trips are left off,** as the board leaves them off.
- **A registry entry in `print.js`,** bound to a week rather than a trip, so the
  forms page asks for a week and the board's own menu opens it for the week on
  screen.
- **Printed from Chrome with the Print button,** like the other forms, with the
  sheet measured by re-applying the print rules as screen rules, and the trip
  colours carried past Chrome's Background graphics box, as the quote's grey
  cells are, because on this sheet the colour is information.

## Questions

None open.

## Tasks

- [ ] Add the week form to `print.js`'s registry: Legal landscape, five buses a
      sheet, drawn from the week the board reads.
- [ ] Draw the sheet and the card as above, and set it beside the reference
      sheet at the same week until every line matches.
- [ ] Measure the sheet at the busiest week the database holds, and name on
      the forms page any trip that does not fit.
- [ ] Open it from the board's menu for the week on screen.
