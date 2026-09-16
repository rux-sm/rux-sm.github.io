---
type: plan
---

# Plan: the trip editor's layout

## Goal

The trip editor follows Carbon's form pattern for a side panel on every tab,
and reads right on real trips in every theme.

## Decisions

- **Default fields, not fluid.** Carbon keeps fluid forms for simple tasks and
  asks complex or multi-section forms to use default inputs; the editor is a
  five-tab form used all day. Fields take the panel's `size-sm` height.
- **24px between fields, 32px between sections, 48px above the actions,** the
  spacing Carbon's form pattern gives a contained form.
- **Two fields share a row only when both fit half of it:** a date range, and a
  hotel's confirmation beside Booked. Trip bar color, and every contact's
  Name and Phone take a row each; contacts stand 32px apart. Type shares its
  row with Vehicle, as `docs/plans/scheduler-vehicle-and-thread.md` decides.
- **A 1px subtle rule opens every section after a tab's first,** edge to edge,
  32px under what precedes it and 24px over its heading. Carbon has no guidance
  on rules in forms, so this is the app's choice.
- **Headings are `heading-compact-01`,** 14px, between the 12px field labels
  and the panel's 16px title, the order Carbon asks a group heading to keep.
- **Line tabs, not contained.** Carbon asks for line tabs inside a component,
  with the first label on the content's edge. They take 8px padding so all five
  fit the 20rem panel.
- **The tabs stay,** though Carbon's pattern discourages tabs in a side-panel
  form: a trip holds five tabs of fields, and the alternative is a full page.
- **The destructive action says what it does.** The action bar's first button
  is "Cancel trip", a danger ghost button; the close button leaves the editor.

## Questions

- **Should the editor become a full page** for the tabs Carbon would not put in
  a side panel, or stay a column beside the board?

## Tasks

- [ ] Check the editor in all eight themes on a real trip.
- [ ] Answer the questions above.
- [ ] rux reads every tab on real trips, in Chrome, Safari and on the phone.
