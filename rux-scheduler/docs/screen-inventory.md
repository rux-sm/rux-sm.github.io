# Screen inventory and triage

Written 2026-09-06 from `rux-ui/index.html`, its `js/panels`, `js/pages` and
`js/components`, and the root pages. Every user-facing surface of the old
app is listed with a verdict and, for a keep, the rux-ds piece it becomes.
The design changes: the old app is a floating-window desktop; this one is a
Carbon page, and Carbon has no floating window. Every movable window becomes
a side panel, a modal or a page. Nothing is kept pixel-for-pixel.

Verdicts: **keep** builds in the first pass, **later** builds after the grid
and the record tables work, **drop** is not rebuilt. A drop can be reopened;
say so in `docs/log.md` when it is.

Vocabulary: a *template* is one of the ten in rux-ds's `templates/`; a
*module* is one of rux-ds's `js/*.js` behaviours; an *app component* is this
app's own markup and stylesheet, prefixed `sch-`, built from rux-ds tokens.
Two app components exist so far, the week grid and the trip bar; a third is
listed under *later*.

## 1. Views

The old side nav has ten views, two of which are the same roster twice.

| Old view | Verdict | Becomes |
|---|---|---|
| Schedule (`calendar`) | keep | `schedule-page` template. The grid and trip bar are app components. Toolbar: New trip button, previous, today, next, the week range as a date-picker trigger. |
| Drivers and Driver Roster | keep, merged | One Drivers page on `table-page`, with the roster's columns. Two views existed because a rebuild was in progress; one ships here. |
| Fleet | keep | `table-page`, sortable, out-of-service shown as a tag column. |
| Customers | keep | `table-page`, four columns. |
| Requests | keep | `table-page` with a content switcher for status. Detail opens in a side panel. |
| Itineraries | later | Depends on the itinerary editor, the third app component, and on the AI intake. |
| Documents | drop | One hard-coded row. |
| Settings (`Options`) | keep, trimmed | `settings-page`. Yard, locations, requirements, billing defaults. Mapbox and Extract keys move with intake. |
| Game | drop | |
| Samsara link, Gallery link | drop | Samsara can return as a plain link in the switcher if wanted. |

Side nav: Schedule, Drivers, Fleet, Customers, Requests, Settings. Six
items; Itineraries is added when it exists.

## 2. Editors and panels

| Old surface | Kind there | Verdict | Becomes |
|---|---|---|---|
| Trip editor, five tabs | floating window | keep, first the Details and Fleet tabs | Side panel, wide variant, with Carbon tabs: Details, Fleet, Billing, Itinerary, Files. Fields on `form-page` patterns. The Grid tab, the itinerary grid, is *later*. |
| Driver editor, five tabs | floating window | keep | Side panel with tabs Profile, License, Status, Time off, Trips. |
| Fleet editor | floating window | keep | Side panel, one form, out-of-service rows as a small editable list. |
| Customer editor | floating window | keep | Modal, four fields. |
| Request detail | floating window | keep | Side panel with a Create draft trip button. |
| Itinerary editor | floating window | later | App component, with the Itineraries view. |
| Trip manifest | floating window | later | Passengers as a `table-page` section under the trip, edit in a modal. The four print buttons there are stubs in the old app and are dropped. |
| Trip finder, Cmd-K | floating palette | keep | Header search from the shell, results in a data table on a page. Keep the shortcut. |
| Contact info, Driver week info | modals | later | Modals with a text area and the copy button module. |
| Trip envelope, driver sheet, print schedule | print windows and a print modal | later, in this order: print schedule, envelope, driver sheet | Print stylesheets over the same page, print options in a modal. Printing the week is core to dispatch and comes right after the grid can edit. |
| Requirements editor | settings section | keep | Settings page section; contained list with an add row. Icon picker is dropped, icons come from the rux sprite by a fixed name per requirement. |
| Notifications | header popover | later | Shell header panel, the one the switcher uses. |
| Dev notes | header popover | drop | |
| Team chat, presence strip | header popover | drop | |
| Profile menu, preferences, theme | header popover and modal | drop, replaced | The rux-ds account panel and theme module already in the shell. |
| Document viewer | floating window | drop, replaced | Open in a new tab; `doc.html` stays as the redirect. |
| Scheduler context menu, Add trip | context menu | keep | The menu module. |
| Driver-grid popover | popover | later | The popover module, with the driver availability grid. |
| Bus picker | popover listbox | keep | Combo box, already compiled and claimed by the list-box module. |
| Toasts | toast | keep | Toast notification, timed by the dismiss module. |

## 3. Schedule view in detail

What the grid does today and what carries over.

| Behaviour | Verdict | Note |
|---|---|---|
| Bus rows by day columns, seven days | keep | CSS grid, sticky first column and header row, as before. |
| Percentage placement of a bar by date and time | keep | Pure functions; port unchanged. |
| Lane packing for overlapping trips | keep | Pure function. |
| Multi-day bars, head and tail, continues-before and continues-after | keep | The trip bar's design rules in `rux-ui/docs/trip-bar.md` port with token names checked against `rux.css`. |
| Unassigned row, hidden until needed | keep | |
| Out-of-service stripe and row icon | keep | Stripe uses a support token, not a hue of its own. |
| Now line | keep | |
| Drag a bar between bus rows | keep, the first write | Vertical only, as before. Double booking refused except onto Unassigned; out-of-service is a warning, not a block. |
| Time-aligned mode | keep | Toggle in an options menu, not a panel. |
| Start week on Sunday | keep | Same menu. |
| Two-week view | decide | Cheap to keep; the grid already takes the day count as a variable. Not in the first specimen. |
| Day column width slider, centred heads | drop | Density comes from Carbon's two sizes, see next row. |
| Trip bar size S and L | keep | The two density tiers the bar's rules allow, mapped to Carbon's layout sizes. |
| Show and hide bar rows, five toggles | keep | Same options menu. |
| Right panel tabs: Calendar, Drivers, Tasks, History | later | Calendar options become the menu above. Drivers availability grid is *later* with its popover; Tasks and History are *later* as side panel content. |
| Trip bar actions, five icons | keep three | Open trip, Move bus, Print envelope. Upload itinerary and Open email thread wait for Files and for the Missive decision. |
| Realtime refresh | later | Not in the read-only grid. |

Local preferences the old app keeps in `localStorage`: theme, accent,
Sunday start, two weeks, time align, bar size, and four print options. Theme
moves to the rux-ds theme module. The rest stay local and are read with a
try-catch; none goes to the backend.

## 4. Public and standalone pages

| Page | Verdict | Becomes |
|---|---|---|
| `driver.html`, token in the query | keep, after the grid can edit | Header-only shell, mobile first, the trip legs as tiles with Accept and Decline. Accepts and declines through the existing RPCs. |
| `maintenance.html` | later | Same shell, a read-only bus by day grid; may reuse the week grid component. |
| `request.html` | keep, with Requests | Public `form-page`, submits through the existing RPC. |
| `intake.html` | later | Needs the Worker's extract route and the itinerary component. |
| `m.html`, `d.html` | keep | Redirect stubs, unchanged. |
| `doc.html` | keep | Redirect by document id, unchanged. |
| `gallery.html` and the four specimen pages | drop | rux-ds's sink is the specimen page now. |

## 5. Order of building

Each step ends with the page opened in all five themes and a dated line in
`docs/log.md`.

1. Static grid specimen with invented trips: grid, bar, lanes, one
   multi-day bar, Unassigned, an out-of-service stripe, both bar sizes.
2. Read-only live grid: platform sign-in, one week of `trips`, `buses`,
   `trip_assignments`, `trip_drivers`, `bus_out_of_service`.
3. Bus reassignment drag, the first write.
4. Trip editor side panel, Details and Fleet tabs. Then Fleet, Drivers,
   Customers as tables with their editors.
5. Print schedule. Requests and `request.html`. Driver page.
6. Everything marked *later*, in the order the log records.

## 6. Not verified

The field lists in §2 were read from the old markup's element ids, not from
a running page, and the trip editor's count is approximate. The keyboard
handling of each floating window was not traced; only Cmd-K and Escape are
global there.

## 7. Where a surface lives — added 2026-09-06

Sections 1 and 2 give a verdict per surface. They do not say where the kept
ones sit relative to each other, and building them one at a time would settle
that by accident. **Three homes, and one rule for choosing.**

| Home | What goes there |
|---|---|
| **The panel** | The detail of the thing you SELECTED, and anything that answers a question about it. One region on the right, one open at a time, Carbon's own `side-panel`. |
| **A page** | A list, a feed, or a workspace. Something you navigate to rather than something you clicked. |
| **A menu or a modal** | Options that change how the current page draws, and one-off actions. |

### What that decides

- **Trip, driver, bus, request, customer detail → the panel.** Each is the
  thing you clicked. **The customer editor moves from modal to the panel**
  (§2 said modal because it is four fields); one editing surface beats two.
- **Tasks and History → their own pages.** Tasks is a work queue across many
  trips and History an audit feed; neither is the detail of anything, and as
  panels they would hold the panel open permanently while competing with the
  trip that needs it. History sits below Settings in the nav rather than beside
  Schedule: it is consulted, not worked in.
- **View options → a menu in the toolbar.** Time-aligned, start on Sunday, two
  weeks and the bar-row toggles. §3 said "the menu above" and that menu was
  dropped when the live grid replaced the specimen, so they are currently
  homeless.
- **Jump to a date → the week label becomes a date-picker trigger.** The old
  right panel carried a mini calendar, which §1-3 never placed. A permanent
  mini calendar spends standing space on an occasional action; Carbon's date
  picker is compiled and `templates/schedule-page.html` already uses it.
- **Print → a modal over the same page**, not a separate window.

### The driver availability grid is a SECOND SECTION OF THE GRID

Corrected twice, so both wrong answers are on the record. §2 called it a
popover. The first version of this section called it panel content, reasoning
that it answers a question about the selected trip. **Both miss what the task
is.** rux: *"when looking at the scheduler trying to decide on available
driver usually its open to view both schedule and driver availability grid at
the same time."* The board is half the answer -- which buses are busy -- and
the grid is the other half. Putting the second half in a panel squeezes the
first to about 118px a day, which is the opposite of what the task needs.

**Corrected a third time, 2026-09-06, and this one was settled by building
it.** This section said a second row group under the bus rows, sharing the day
columns so a day read straight down. Two things were wrong with that. A second
row group is in the SAME SCROLL CONTAINER as the buses, so it scrolls away
exactly when there are enough buses to need it -- rux caught that. And shared
columns cost 240px of height for an alignment the marked day column already
provides.

**It is a compact grid LEFT OF THE BOARD.** Rows are drivers at 32px, Carbon's
sm; the seven day cells are 32px squares, because a day here is a state and
reads as a mark rather than a box with text. The pane takes the schedule's own
measured height, so the two end on the same line. The selected trip's day is
marked down the column, which is what answers "who is free THEN" now that the
columns do not line up.

Three positions were built and tried before this one was chosen: docked below
the schedule with the columns aligned, to the right between the board and the
trip panel, and left. The right-hand slot put the availability grid between
the board and the panel describing it. Left keeps the trip panel beside the
board, at the cost of putting the selected trip's date and the squares that
answer it at opposite edges. `docs/log.md` carries the numbers.

| | |
|---|---|
| **Trigger** | The `Drivers` toolbar toggle. It is a companion view, not the detail of anything, so it stays on until turned off. |
| **In the trip panel** | Nothing. The panel carries the trip's own drivers; who ELSE is free is read on the board. |
| **On the Drivers page** | The same grid, nothing highlighted, for browsing without a trip. |
| **Still a popover** | The per-driver card -- photo, city, phone, licence and medical expiry -- that opens from a cell in that grid. That is the detail of a cell, not a surface. |

### The two regions coexist

They are different places and both can be open: the availability section below
the grid, the trip panel to the right. That is the arrangement the work needs
-- the board, who is free, and the trip being assigned, all at once -- and it
is what the old app got from a right panel plus a floating window, without the
floating window. Only the panel is one-at-a-time: a trip, a driver, a bus or a
request, whichever was selected last.

When the panel is open it shrinks the grid and the availability section shrinks
with it, so the two stay aligned; the day columns fall toward their minimum and
the week scrolls until it closes.

### The trip bar does not expand any more

The old bar grew on click to reveal five ghost action icons above and more
trip information below. **Dropped.** On a dense board a bar growing changes its
row's height and re-stacks the lanes beside it, so what you were comparing
against moves. Everything it revealed has a better home: the information is
the panel's whole job, and the actions go in the panel's header where they can
carry labels. The two or three wanted without opening anything belong on a
right-click menu, which that board already had for Add trip.
