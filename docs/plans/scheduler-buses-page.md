---
type: plan
---

# Plan: a Buses page in the scheduler

## Goal

Staff see every bus on one page and edit one from the scheduler, as rux-ui's
Fleet view and vehicle editor do today, so nobody opens rux-ui to change a
capacity, a service date or the days a bus is out.

## Decisions

- **The word is bus, not vehicle or fleet.** The table is `buses`, the page
  pair plan already names the file, and a page named for a word the database
  does not use ages badly. The old app's Fleet, Vehicle and Unit number become
  Buses, Bus and Bus number.
- **Two views in one file.** `scheduler/buses.html` lists the buses,
  `buses.html?id=<bus id>` edits one, and `buses.html?new` makes one.
- **Both take the page pair's layout**, which `docs/plans/site-page-pair.md`
  decides for every such pair and this plan does not restate.
- **This corrects the screen inventory.** `scheduler/docs/screen-inventory.md`
  says a bus is edited in the panel, in §2 and in §7's list of what the panel
  holds; the page pair decided otherwise, and the inventory changes with this
  page. The panel keeps trips, requests and customers.
- **The list is Carbon's data table at large density, sortable**, with a
  toolbar holding the search and a primary New bus button, and a content
  switcher for Active, Out of service, Inactive and All with counts. No
  checkboxes, batch actions or pagination: there are about twenty buses and
  nothing to do to several at once. Search reads the number, make, model, VIN
  and `bus_ref`.
- **Six fixed columns, with no column picker:** Bus (a disc in the bus's own
  colour carrying its type icon, then the number, with the type and the make
  and model beneath), Capacity, Equipment, Status, Next service, Compliance. A
  whole row opens the bus. The old app offers eighteen columns behind a
  drag-and-drop picker saved in the database; six columns chosen once is the
  same answer every time and costs no setting.
- **Equipment is icons with labels for a screen reader:** the ADA lift and the
  sleeper, each drawn only when the bus has it, as the trip bar's chips are.
- **Status is Active or Inactive, and Out of service is worked out, never
  stored.** The database holds only the two. A bus whose out-of-service dates
  cover today reads Out of service, and the switcher counts it there; it stays
  assignable, because dispatch still has to put it somewhere.
- **Compliance is one status icon per row**, Carbon's icon indicator, as the
  Drivers page draws it and for the same reason: for whichever of the
  insurance, registration and inspection expiries comes first, red for expired,
  yellow within 45 days, otherwise the date, gray for not on file. The old app
  colours none of these and warns on the service date alone, which is the one
  date that is a plan rather than a rule.
- **Next service is its own column**, red past due and yellow within 45 days,
  because a service that is late and a registration that is expired are
  different problems and one column cannot say which is which. The old app's
  three-month warning becomes 45 days, so one number covers the page.
- **The default sort puts the soonest compliance first**, as the Drivers page
  does. Every column sorts.
- **The editor has two line tabs, Details and Trips.** Details is the one
  form, in sections parted by the trip editor's rule: Bus, Equipment, Service,
  Compliance, Out of service, Notes, then Cancel and Save. Trips lists the
  bus's upcoming trips and is only read, so it has no Save. Every unsaved
  change stays on one tab, and a new bus shows no tabs.
- **Components in the editor:** breadcrumb back to Buses; the title with a
  status tag; text inputs for the number, make, model and VIN; a number input
  for capacity, year and the odometer; selects for type; checkboxes for the
  ADA lift and the sleeper; radio buttons for Active and Inactive; date
  pickers for last service, next service and the three expiries, with the
  list's red or yellow status under one that is soon; a text area for notes;
  and the record template's button set, Cancel then Save. Every row of fields
  sits on one three-column grid, so the fields line up down the form.
- **The colour is a swatch that opens the browser's colour input,** with the
  hex beside it, and it is what the list's disc and the board's bus row wear.
- **Out of service is a contained list** of date ranges with an Add row; a
  modal adds or edits one range with a date range picker and a reason. A range
  whose end is before its start blocks Save. Its help line says the bus stays
  on the board and can still be assigned, because that is what the old app
  does and dispatch relies on it.
- **A bus is never deleted here, only set Inactive,** so past trips keep the
  bus's number. The old app deletes the row outright, which leaves a finished
  trip pointing at nothing.
- **The board's row order stays in rux-ui.** `buses.sort_order` is what orders
  the board's rows, and dragging rows to set it is a second job with its own
  rules; this page shows the order it finds and Save never writes
  `sort_order`, so a bus saved here does not move on the board. The old app's
  save rewrites the column from a hidden field, which turns a stored 0 into
  nothing.
- **Fields and storage are rux-ui's**, so both apps read the same bus: the
  `buses` columns and `bus_out_of_service` rows.
- **Save writes the bus and its out-of-service dates together.** `buses` has
  no `updated_at`, so Save first compares the row with the values the page
  loaded, and asks before it replaces a change saved elsewhere. The dates are
  written by id, not by deleting every row first, so a range another person
  added in the meantime survives.
- **Leaving with unsaved changes asks first**, as the trip panel does.
- **No database change.** Signed-in staff already read and write `buses` and
  `bus_out_of_service`.
- **A Buses link joins the side nav** between Schedule and Drivers, since the
  board's rows are buses. The nav is copied into six pages, which all change
  together.

## Questions

- **Is 45 days right for a bus?** It is the Drivers page's number, and one
  number across the site is easier to hold, but an insurance renewal and a CDL
  are not the same errand. A different number here means two to remember.
- **Should the board's row order move to this page later,** as a drag on the
  list, or stay in rux-ui for good? This plan leaves it alone either way; the
  answer decides whether a later plan is coming.
- **Does anything still need to delete a bus outright?** If a bus is only ever
  set Inactive, rux-ui's Delete button is the one way to remove a mistyped row,
  and it stays there.

## Tasks

- [ ] Read the decisions above and answer the three questions, before building
      starts.
