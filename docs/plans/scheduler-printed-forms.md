---
type: plan
---

# Plan: a page for the forms the scheduler fills in

## Goal

One page renders every form this app makes from its own data, filled in from
the trip it was opened on: the driver's envelope first, and the driver sheet,
the printed schedule, a quote, an hours-of-service form and a passenger roster
after it. Dispatch reaches a trip's form from the board and reads it in the
panel beside the trip — the same panel a trip's PDF opens in — then prints it.

## Decisions

### The page

- **`scheduler/print.html` renders every form, named by `?form=`,** because the
  forms share a paper palette, page margins, the print options and every
  print-driver quirk, and one place should get those right. It is called print
  because ending on paper is what every one of them has in common and what
  separates them from a file someone uploaded.
- **With no `?form=` it is the hub,** a tile per form. `print.html?trip=<id>`
  is the same hub naming that trip, and a form that binds one bus lists that
  trip's buses to choose from, because a trip is not an assignment and a tile
  that opened on nothing would be a dead end. So a person arriving from the
  board picks the document, then the bus, and never types an address. It sits in the side nav below Settings, beside History: consulted, not
  worked in.
- **The two kinds of document keep their own page.** `share/document.html`
  opens a *stored* file by id for someone without a log-in; this page renders a
  *generated* form from live data for staff. Both frame into the same panel.
- **A page, not a print stylesheet over the board.** Printing out of the board
  means hiding the board: rux-ui does it with `body > *:not(…)` plus roughly 45
  lines of `!important` unwinding a floating window's position, transform,
  size and border, and its exemption list has grown to two entries that each
  carry a comment about the other. A page whose only content is the form hides
  nothing.
- **It is served at `data-theme="white"`,** so `--rux-*` tokens already resolve
  to ink on paper. rux-ui needed its parallel `--print-*` palette only because
  it printed out of a `g100` page.
- **On screen a form is fluid; on paper it is its own page size.** rux-ui draws a
  fixed-width card and scales it with a transform, a `ResizeObserver` and a
  `fitToHeight` whose own comments record several rounds of clipping bugs. A
  form that fills its viewport on screen and takes `@page` size under
  `@media print` needs none of that machinery.
- **Margins go in the box model, not in `@page`,** because print drivers do not
  reliably honour an `@page` margin, which rux-ui measured and recorded.
- **A form prints with no background fills.** Chrome leaves Background graphics
  off and nobody ticks it, so a header band or a tinted row simply vanishes on
  paper; every division is a rule, a border or weight instead. This is where
  rux-ui's `--print-fill` would have gone quietly missing.
- **`@page` asks, it does not decide.** The destination's own paper size stands
  where it disagrees, so a form has to be right on the paper it is sent to
  rather than depend on winning that argument.
- **Its files are the app's usual names,** `print.html`, `print.js` and
  `print.css`, and each form's classes are the app's own, `scheduler-envelope-`
  and so on, since Carbon has none of these and no `rux--*` rule is touched.

### A form is a registry entry

- **One table in `print.js` is the source for the hub, the `?form=` values and
  the board's menu,** the way `SHORTCUT_ACTIONS` is already the one source for
  the shortcut bar and the right-click menu.
- **An entry declares what it binds to,** and that is what the address carries:
  a trip (`?trip=`), one bus on one leg (`?assignment=`), that bus and one seat
  (`&driver=`), a week (`?week=`), or nothing. A bar on the board is a bus on a
  leg, not a trip: its dates, its crew and its bus all differ between the
  outbound and the return, so a form opened from a bar binds the assignment the
  bar already carries in `dataset.assignmentId`.
- **A form that binds to nothing prints blank,** which is the point of a spare
  hours-of-service form in the bus. A form that binds opens blank from the hub
  too, and says which subject it is missing.
- **An entry declares what a print marks,** because the schema already keeps
  the flags: `trip_drivers.envelope_printed` per seat, and
  `itinerary_printed_<leg>` and `hos_form_printed_<leg>` on the trip. An entry
  that marks nothing prints and writes nothing.
- **A form computes nothing.** Every number arrives worked out — the quote's
  from `quote.js`, which holds the office spreadsheet's formulas against
  `quote_rates`, and a leg's miles and hours from the Route tab. A second
  implementation of the same arithmetic is a second answer waiting to disagree
  with the screen.
- **A form reads its subject by id,** one path whether it is framed or opened
  alone, and prints what is saved rather than what an open editor has not saved
  yet. The session is this origin's `localStorage`, so a frame and a new tab
  are signed in exactly as a second tab of the board already is.

### In the document panel

- **The panel frames the page's address directly,** through `swapFrame`. A PDF
  needs a fetch and a blob address; a same-origin page of this site does not.
- **A form's own controls go in the panel's toolbar, beside the buttons every
  document gets.** A stored file carries Print and Open in new tab in that
  row, so the form's layout, its copy, its Printed tick and its Print all go in
  the same row rather than a second bar under it, and a document's buttons are
  in one place whatever the document is. `print.html` builds them and hands the
  nodes up, which keeps one builder and keeps the listeners it gave them; the
  panel adopts them as the row's own children, so the row breaks as one line,
  and takes them out again when the frame moves on. A page in its own tab hands
  them to nobody and keeps them in its own bar, with the plain Print the
  panel's printer button stands for.
- **It always opens in the panel,** as a PDF does, at every width: where the
  board cannot hold the panel beside the week the panel comes in front of the
  board, so there is no width at which a form is sent to a browser tab.
- **Zoom and Download are hidden for a generated form.** The zooms send
  `#zoom=` to a PDF viewer, which an HTML page ignores, and the page is fluid
  instead; there is no file to download, and the print dialog saves a PDF.
- **The head names the form and its subject** — "Trip envelope" over "Driver
  copy — <name>" — where a stored file names its type over when it was
  uploaded. The form's own bar is gone there: the head has said the name and
  the toolbar holds the rest. Whatever the form has to say, such as a tick
  saved, borrows that same line and gives it back.
- **The panel is named the viewer,** `scheduler-viewer-*` and `viewer*`, not
  `scheduler-document-*`: `doc` and `document*` already mean a stored file
  record throughout `data.js`, so the panel takes the name rux-ui gives the
  same thing, and the document stays the thing inside it.

### The envelope, the first form

- **Its subject is one bus on one leg,** and one copy per seat on it. Driver,
  co-driver and each relief get their own. A relief copy shows
  Swap time from that seat's `report_time` in place of Spot time, and names the
  primary driver beside it.
- **Print all covers the whole trip, every bus on it,** outbound then return
  and one sheet per filled seat, because a three-bus trip with two drivers on
  each was six envelopes and six visits to the hub. The form on screen stays
  the one bus it was opened on, and only the button widens; the trip's other
  buses are a second request, made when the form opens so the button can say
  how many, and a trip that will not answer leaves Print all covering that one
  bus.
- **The contact is the trip's day-of contact,** first filled of the five, and
  the booking contact only when none is set, because the envelope travels with
  the driver and the booking contact is the office's.
- **The day-of fields print blank:** starting and ending odometer, ELD
  verified, ELD backup used, CC for trip, CC received by, total trip miles, and
  hotel, diesel, repairs, miscellaneous and total, all filled in by hand after
  the trip.
- **Requirements come from `trip_reqs`,** with the older booleans as the
  fallback rux-ui keeps, plus a One-way mark on a trip that is not a round
  trip. A fuel card prints a write-in line for its number, and the seat's
  instructions print under them as the driver's note.
- **Its second layout is Multi-stop,** chosen in the form's own toolbar: the
  destination line gives way to an eight-row Location, Time in, Time out and
  Odometer log. rux-ui names that layout for the customer who asked for it,
  which is not a name this repository can carry.
- **It is printed on the Trip Envelope, 6 by 9 inches,** the custom size the
  office printer already carries and the envelope itself. Its own margins are
  zero, so the form's 0.3in ink margin is the box model's and keeps the form
  clear of the edges a laser printer cannot reach.
- **A printed form is exactly one sheet, and the multi-stop log absorbs the
  slack.** A fixed eight rows spills onto a second envelope as soon as a seat's
  note runs to a second line, and a quarter inch of overflow costs a whole
  envelope; the rows share whatever the rest of the form leaves and stop
  shrinking at a line someone can still write on.
- **The company line is the page's own,** since there is no Settings page yet
  to hold the yard.
- **rux-ui's Yellow and White tint is dropped.** It tints the preview to match
  the paper stock and is forced off in print, so it changes nothing that comes
  out of the printer.

### From the board

- **Print envelope joins `SHORTCUT_ACTIONS`,** so it is both a shortcut slot
  and a right-click item from the one table. It shows faint with "No driver on
  this bus" where the bar has no seat filled. A second item, Forms, opens the
  hub on that trip -- named Forms and not Documents, because that is what the
  side nav and the page itself call it.
- **The board reads nothing new.** A form reads its own subject by id, so
  `need_fuel_card`, `trip_reqs`, `spot_time` and `envelope_printed` sit in the
  form's own query rather than in `TRIP_COLUMNS`, which already serves a week of
  trips, the panel and every tab. No database change either.
- **Printed is ticked by hand, never by printing.** `afterprint` fires whether
  the dialog printed or was cancelled and nothing tells the two apart, so a tick
  from it would mark envelopes that never came out. rux-ui does not guess
  either: its task list offers Open, or Open and mark as complete, and the
  person chooses. The form's toolbar carries that same choice, a box beside the
  copy it belongs to, and it unticks. It stays one box per copy however many
  Print all lays on the stack, because the flag then means what it means in
  rux-ui -- a person said this one is done -- so the two apps agree.

## Questions

- **Which forms follow the envelope, and in what order?** The driver sheet, the
  printed schedule, a quote, an hours-of-service form and a roster are all
  named; only the first three have a rux-ui form to match.
- **Does the driver's own page show its envelope later?** rux-ui's
  `driver.html` opens the same form read-only on a phone; the screen inventory
  builds that page from tiles with Accept and Decline and says nothing about
  it. A page renders on a phone either way, so this only decides whether a link
  goes there.

## Tasks

- [ ] rux opens a real trip's envelope from the board, prints the crew's copies
      on the office printer, and checks them against the form in use today.
- [ ] rux ticks Printed on a real copy and checks rux-ui's task list agrees.
