---
type: plan
---

# Plan: a Buses page in the scheduler

## Goal

Staff see every bus on one page and edit one from the scheduler, as rux-ui's
Fleet view and vehicle editor do today, so nobody opens rux-ui to change a
capacity, a service date or the days a bus is out.

## Decisions

- **Two views in one file.** `scheduler/fleet.html` lists the units,
  `fleet.html?id=<bus id>` edits one, and `fleet.html?new` makes one.
  `scheduler/README.md` and `scheduler/fleet.js` say what the page is now.
- **Both take the page pair's layout**, which `docs/plans/site-page-pair.md`
  decides for every such pair and this plan does not restate.
- **This corrects the screen inventory.** `scheduler/docs/screen-inventory.md`
  says a bus is edited in the panel, in §2 and in §7's list of what the panel
  holds; the page pair decided otherwise, and the inventory changes with this
  page. The panel keeps trips, requests and customers.
- **The list is Carbon's data table at large density, sortable**, with a
  toolbar holding the search and a primary New bus button, and a content
  switcher for Active, Out of service, Inactive and All with counts. No
  checkboxes, batch actions or pagination: there are eleven buses and nothing
  to do to several at once. Search reads the number, make, model, VIN
  and `bus_ref`.
- **Six fixed columns, with no column picker:** Bus (a disc in the bus's own
  colour, then the number, with the model year, the make and model, and the
  type beneath), Capacity, Equipment, Status, Next service, Compliance. The
  year is on the row because it is what the order is by. A whole row opens the
  bus. The old app offers eighteen columns behind a
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
  date that is a plan rather than a rule. **The column is headed Compliance,**
  the word this plan uses throughout, with the three documents named in its sort
  description and in each cell's tooltip: a header spelling all three out sets
  the widest column on the page for a cell holding an icon and two words.
- **Next service is its own column**, red past due and yellow within 45 days,
  because a service that is late and a registration that is expired are
  different problems and one column cannot say which is which. The old app's
  three-month warning becomes 45 days, so one number covers the page.
- **The list opens newest bus first**, the same order the board's rows take,
  so the page and the board read alike. Every column sorts, so the compliance
  column is one click away.
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
- **A bus is never deleted, only set Inactive,** so past trips keep the bus's
  number. Deleting the row leaves a finished trip pointing at nothing, and
  nothing needs it; rux-ui's Delete button is left for removal there.
- **The fleet's order** is by the office's type list, then model year.
  Dragging rows into a hand-made order goes; a fleet in a fixed order is
  the same answer every time and nobody has to remember it.
- **That order is written into `buses.sort_order`,** rather than each app
  sorting for itself, because rux-ui draws its rows from that column and two
  apps disagreeing about which row is which is worse than one derived column.
  Saving a bus here renumbers the whole fleet when the years no longer match
  the numbering, and a drag in rux-ui holds only until the next save here.
  rux-ui's drag and its Set as order button are left for removal there.
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

None open.

## Tasks

- [ ] Give the Van, the one unit with no `buses.sort_order`, the last place, as a
      named migration through the Supabase connection; the coaches already run
      by model year. The statement is shown to rux before it runs.
- [ ] rux saves one real bus, and checks the board's rows and rux-ui's roster
      show the same order.
