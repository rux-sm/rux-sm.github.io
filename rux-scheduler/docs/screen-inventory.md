# Screen inventory

The surfaces of the old `rux-ui` app that this app has not built yet, each
with a verdict and, for a keep, what it becomes. The old app is a
floating-window desktop; this one is a Carbon page, so every movable window
becomes a panel, a modal or a page.

Verdicts: **keep** builds next, **later** builds after the record tables work,
**decide** is open, **drop** is not rebuilt. A drop can be reopened; the commit
that reopens it says why.

A *template* is one of the ten in rux-ds's `templates/`; a *module* is one of
rux-ds's `js/*.js` behaviours; an *app component* is this app's own, prefixed
`sch-`.

## 1. Views

| Old view | Verdict | Becomes |
|---|---|---|
| Drivers and Driver Roster | keep, merged | One Drivers page on `table-page`, with the roster's columns. |
| Fleet | keep | `table-page`, sortable, out-of-service shown as a tag column. |
| Customers | keep | `table-page`, four columns. |
| Requests | keep | `table-page` with a content switcher for status. Detail opens in the panel. |
| Itineraries | later | Needs the itinerary editor, an app component, and the AI intake. |
| Settings (`Options`) | keep, trimmed | `settings-page`. Yard, locations, requirements, billing defaults. Mapbox and Extract keys move with intake. |

The side nav lists only pages that exist; each view is added when its page is.
Dropped: Documents, Game, the Samsara and Gallery links.

## 2. Editors and panels

| Old surface | Verdict | Becomes |
|---|---|---|
| Trip editor, Itinerary and Files tabs | keep | Tabs in the trip panel. The itinerary grid is *later*. |
| Trip editor, bus assignment | keep | The Fleet tab is read-only; the bus picker becomes a combo box. |
| Driver editor | keep | Panel with tabs Profile, License, Status, Time off, Trips. |
| Fleet editor | keep | Panel, one form, out-of-service rows as a small editable list. |
| Customer editor | keep | Panel, four fields (§7). |
| Request detail | keep | Panel with a Create draft trip button. |
| Itinerary editor | later | App component, with the Itineraries view. |
| Trip manifest | later | Passengers as a `table-page` section under the trip, edit in a modal. |
| Trip finder results page | keep | Results in a data table on a page. The header search and Cmd-K exist. |
| Contact info, Driver week info | later | Modals with a text area and the copy button module. |
| Print schedule, trip envelope, driver sheet | later, in that order | Print stylesheets over the same page, options in a modal. |
| Requirements editor | keep | Settings section; a contained list with an add row. Icons come from the rux sprite by a fixed name. |
| Notifications | later | Shell header panel, the one the switcher uses. |
| Driver card | later | Popover from a cell of the availability grid (§7). |

Dropped: dev notes, team chat and presence, the old profile menu (the rux-ds
account panel replaces it), the document viewer (open in a new tab).

## 3. Schedule view in detail

| Behaviour | Verdict | Note |
|---|---|---|
| Time-aligned mode | later | The grid places by day. |
| Two-week view | decide | The grid fetches one week. |
| Tasks, History | later | Pages (§7). |
| Print envelope on the bar menu | later | With printing. |
| Upload itinerary, open email thread | later | Wait for Files and for the Missive decision. |
| Realtime refresh | later | |

View preferences stay in `localStorage`, read with a try-catch; none goes to
the database. Dropped: the day column width slider, the second bar size, the
now line.

## 4. Public and standalone pages

| Page | Verdict | Becomes |
|---|---|---|
| `driver.html`, token in the query | keep | Header-only shell, mobile first, trip legs as tiles with Accept and Decline, through the existing RPCs. |
| `maintenance.html` | later | Same shell, a read-only bus by day grid; may reuse the week grid. |
| `request.html` | keep, with Requests | Public `form-page`, submits through the existing RPC. |
| `intake.html` | later | Needs the Worker's extract route and the itinerary component. |
| `m.html`, `d.html` | keep | Redirect stubs, unchanged. |
| `doc.html` | keep | Redirect by document id, unchanged. |

Dropped: `gallery.html` and the four specimen pages.

## 5. Order of building

Each step ends with the page opened in every theme.

4. Fleet, Drivers and Customers as tables with their editors.
5. Print schedule. Requests and `request.html`. Driver page.
6. Everything marked *later*.

## 6. Not verified

The tab and field lists in §2 come from the old markup's element ids, not a
running page.

## 7. Where a surface lives

Three homes, and one rule for choosing.

| Home | What goes there |
|---|---|
| **The panel** | The detail of the thing you selected. One region right of the board, one open at a time. |
| **A page** | A list, a feed or a workspace: something you navigate to. |
| **A menu or a modal** | Options that change how the page draws, and one-off actions. |

- **Trip, driver, bus, request and customer detail go in the panel.** One
  editing surface beats two, so the customer editor is not a modal.
- **Tasks and History are pages.** Neither is the detail of anything, and as
  panels they would hold the panel open. History sits below Settings in the nav:
  it is consulted, not worked in.
- **View options go in the toolbar's overflow menu.** Start on Sunday and the
  bar-row toggles are there; time-aligned and two weeks join when the grid can
  draw them.
- **The week label is the date-picker trigger.** A permanent mini calendar
  spends standing space on an occasional action.
- **Print is a modal over the same page.**

### The driver availability grid

A compact grid left of the board, turned on by the toolbar's Driver
availability toggle. Dispatch reads the schedule and availability together, so
it is a companion view, not panel content, and it stays on until turned off.

| | |
|---|---|
| **In the trip panel** | Nothing. The panel carries the trip's own drivers. |
| **On the Drivers page** | The same grid, nothing highlighted. |
| **A popover** | The per-driver card (photo, city, phone, licence and medical expiry), from a cell. |

The grid and the panel can both be open. Only the panel is one at a time.

### The trip bar does not expand

A bar growing on click re-stacks the lanes beside it. Its information is the
panel's job; its actions go in the panel header and on the bar's right-click
menu.
