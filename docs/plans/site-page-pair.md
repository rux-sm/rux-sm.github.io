---
type: plan
---

# Plan: the table-and-record page pair

## Goal

Every screen that lists things and opens one of them is built from the same two
Design templates, so Drivers, Buses, Contacts and the pages after them agree on
where the title, the notice, the toolbar and the breadcrumb sit, and no page
decides it again.

## Decisions

- **The unit is a pair, not a page.** `things.html` is the table,
  `things.html?id=<id>` is one thing and `?new` is a blank one: two views in one
  file, as `scheduler/drivers.html` and `scheduler/print.html` already are, so a
  pair keeps one data module and one shell.
- **The table takes twelve of the sixteen columns at lg and the record takes
  eight**, both centred, over `sm:col-span-4` and `md:col-span-8`. Carbon calls
  this the editorial style model and allows it for low-density product screens;
  the board and the print sheet are not those and stay outside this plan.
- **The table's parts, in order:** the title with its page actions, notice, then
  the table box, which holds the toolbar band and the table. A row opens the
  record.
- **The filter is a select in the band, after the count and before the action,**
  because rux wants the box's head to be one clean line of search and New; a row
  of tabs over the table was a second head.
- **It is Carbon's inline select,** labelled Show, as Carbon's table pagination
  draws its page size: a field's underline in the band read as a form field
  dropped into the table's head.
- **The box takes no outline of its own.** Carbon paints the band and the rows
  one `layer` fill, a step off the page in all four themes and in ant-dark and
  spotify-dark, so the box already parts from the page and a rule round it would
  be a second answer. The forms page's frame is not the precedent it looked
  like: its desk is paper-coloured whatever the theme, which is the case a fill
  cannot cover.
- **The band keeps a slot at its start for what the table has to say,** in the
  quiet label the forms band says its sheet count in; a search matching three of
  eleven says so there, since an emptied table does not.
- **The title is spaced off the box, and nothing inside the box is spaced.**
  Three equal gaps down a page group nothing; one gap does.
- **The record's parts, in order:** breadcrumb, title, notice, tabs, then the
  form with its sections and its Cancel and Save.
- **A button's place says what it acts on.** An action on the table's contents,
  like the search or New, sits in the table toolbar; an action on the whole page,
  like Save, sits with the title.
- **The title and its actions stack; they are not a row.** Carbon's `page-header`
  is cut from this build and `design/templates/detail-page.html` records what a
  title-row class with no CSS behind it did to its first draft, so the templates
  stack and an app that wants them side by side does it with its own class, as
  `scheduler/app.css` does in `scheduler-quote-title`.
- **The breadcrumb is the parent link alone**, not a trail, because the
  hierarchy is two deep and the h1 under it already names the record.
- **The back link is guarded.** It asks before leaving unsaved changes, and a
  saved new record replaces its `?new` address with `?id=`, so back does not
  return to a blank form.
- **The notice sits inside the column, under the title row**, one slot on both
  halves, so a page with a notice does not move its other parts.
- **The column carries `min-inline-size: 0`.** A grid item will not shrink below
  its content, so without it the table widens the page instead of scrolling
  inside `rux--data-table-content`.
- **The standard ships as two Design templates, not as shared CSS.** Design's
  stylesheets hold Carbon and Carbon's own selectors only — `check-classes`
  rejects a `rux--*` class Carbon never wrote — so a shared layout class has no
  home, while a template carries the markup with Carbon's own grid utilities.
- **They are `design/templates/list-page.html` and
  `design/templates/record-page.html`**, named for what each holds rather than
  for the component in it, since `table-page.html` and `form-page.html` are the
  uncentred pages and the names have to part cleanly.
- **Each template declares its own page inset**, rather than taking Carbon's
  default or whatever the app around it sets. The rule sits on the page's own
  class beside `rux--content`, so an app that resets `rux--content` for a denser
  page does not quietly win: `scheduler/overrides.css` does exactly that at a
  flat 16px for the board's sake.
- **A template needs no registration.** `design/tools/lib/sources.mjs` discovers
  `templates/`, so every gate and the portal pick a new one up on its own.
- **The next pairs take the database's words:** `buses.html` and
  `contacts.html`, since the tables are `buses` and `contacts`, and a page named
  for a word the database does not use ages badly.
- **`scheduler/drivers.html` is corrected where it diverges, not rebuilt.** Two
  small things part it from the standard, against 700 lines whose comments carry
  the reasoning for the rest, and a rebuild would re-derive a shell that is
  already right.

## Questions

None open.

## Tasks

- [ ] Give `builder/guide.json` its reading. Both templates and their three
      variant groups are entered `reviewed: false`, which is the file's own mark
      for "not yet read by rux", and the purpose lines are placeholders.
