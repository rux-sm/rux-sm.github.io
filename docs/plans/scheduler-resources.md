---
type: plan
---

# Plan: Buses and drivers are handled the same way

## Goal

The board's two resources, its buses and its drivers, read and act alike.
Each has a head that says who it is and warns when its papers are about to
run out, a card from a press, and a menu from a right-click or a hold whose
items come in the same order. Days a bus or a driver cannot take a trip are
drawn the same way. A driver's name on a bar opens a menu for that driver
on that trip, the link between the two.

Today the bus column has the card and the live state but no menu, and the
roster has the menu but no card and no warning for a licence or medical
card running out, which shows only in the bar menu's Assign driver list.
Out of service is a striped span on the bus's row, and time off is a red
cell in the roster. Setting either means leaving the board for the Fleet or
Drivers page. A right-click on a driver on a bar opens the trip's menu.

## Decisions

- **The board stays laid out by bus.** A trip sits in its bus's row and its
  drivers in its seats, and the roster beside the board already shows each
  driver's days, so the board has no rows-by-driver view, which would draw
  every trip once per driver.
- **One head, three parts, the same for both:** who it is, then its state,
  then a mark for papers. A bus's head keeps what `scheduler/bus-head.js`
  draws. A driver's head is the roster's name, since the roster's own cells
  already show where they are each day.
- **A lapse mark on both heads,** where any paper runs out within 45 days,
  the threshold the Fleet and Drivers pages already use: amber within 45
  days and red once it has run out, with the paper and its date in the card.
  On a bus that means insurance, registration or inspection, the papers
  `fleet.js` already compares. On a driver it means the licence or the
  medical card. The bus's mark sits in the head's kit beside the
  out-of-service mark, and the driver's at the end of their name.
- **One card from a press.** The bus number's tip stays as it is. A driver's
  card is the bar's driver tip with nothing about a trip: their photo or
  initials, name, priority and Part-time, phone, language, licence and
  medical dates, their next trip, and Call in its footer. It is drawn in
  `scheduler/trip-tips.js` beside the bar's driver tip, sharing its head.
  This replaces the inventory's "Driver card, later" row.
- **One menu, the same items in the same order,** opened by a right-click,
  the menu key or a finger's hold, placed by `popMenuAt` as the bar's menu
  is:
  1. **Open bus** / **Open driver**: the record, in a new tab.
  2. **Reach:** **Live map** for a bus Samsara reports on; **Call** and
     **Text** for a driver with a number.
  3. **Away:** **Mark out of service…** / **Add time off…**.
  4. **The resource's own actions:** **Send trips** for a driver. A bus has
     none yet, and Log a repair joins here when `scheduler-maintenance.md`
     builds entry.
  5. **Pick out trips** for a driver only. A bus's trips are already its row.
- **Away is set from the board in the record pages' own dialog.** The time
  off dialog in `drivers.js` and the out-of-service form in `fleet.js` move
  to one shared file, which the record pages and the board both open, so
  each is written once and saving from the board saves as the page does.
- **A driver on a bar has a seat menu,** from a right-click or a hold on
  their name in a seat. It does not open the trip's menu, because the name
  is the thing pressed. Its items, in this order:
  1. **Open driver**, then **Call** and **Text**, as the roster's menu has
     them.
  2. **Remind**, or **Tell** while the leg has changed for them since they
     said yes, as the Contact list offers them, asking first as it does.
  3. **Their answer:** the answers dispatch can set on the Buses tab, saved
     at once with the source set to dispatch.
  4. **Move to seat**, listing the bus's other seats that are turned on,
     which does what dropping them on that seat does.
  5. **Take off this bus**, which asks first when they have been sent the
     trip or have confirmed it, as Remove driver does, and offers Undo as
     the drop does.
  It is hidden on the trip open in the editor, as the bar's menu is.

## Questions

- **What does a press on a driver's name in the roster do?** Today it
  picks out their trips. To match a bus, it would open their card, with
  Pick out trips in the card's footer and on the menu. My pick is the card,
  since a press is a look everywhere else on the board and picking out
  trips is one more press away.
- **Which way is away drawn for both?** The board's stripes in the roster's
  cells, or the roster's red on the board's row. My pick is the stripes:
  red on the board already means a clash or an error, and stripes read as
  "not available" without a colour.
- **Should a bus head's lapse mark replace the inspection date** that a bus
  Samsara does not report on shows where the live state goes? With the
  mark, the date is in the card like every other bus's.

## Tasks

- [ ] Draw the lapse mark on the bus head and the roster's names, with the
      paper and date in each card, and draw each state in
      `tools/check-bar.mjs`.
- [ ] Add the driver's card to `scheduler/trip-tips.js` and open it from the
      roster as the first question decides.
- [ ] Give the bus head its menu in `scheduler/index.html` and `data.js`,
      and reorder the roster's menu to the shared order.
- [ ] Move the time off and out-of-service dialogs into one shared file, open
      it from the Drivers and Fleet pages and from both menus' Away item.
- [ ] Add the seat menu for a driver's name on a bar, opened by a
      right-click or a hold, out of the way of the drag that carries a
      driver off a bar.
- [ ] Draw away the same way on the board's rows and the roster's cells in
      every theme, as the second question decides.
- [ ] Correct `scheduler/docs/screen-inventory.md`: the bus column, the
      driver availability grid, the Driver card row and the Assign driver
      menu.
