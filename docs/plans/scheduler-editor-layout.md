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
- **16px between fields, 24px between sections, 48px above the actions,**
  Carbon's form pattern for a contained form one step tighter, so a trip reads
  in less scrolling.
- **Two fields share a row only when both fit half of it:** a date range, a
  hotel's confirmation beside Booked, Destination beside Type, where the split
  type reads "Split", and every contact's Name beside Phone; contacts stand
  24px apart.
- **Details holds the trip and its people; Fleet opens with what the trip
  needs,** its Vehicle, its Needs and each leg's hotel, above the buses those
  are asked of. Details' dates share one Dates label, and a one-day trip's
  end box is empty and says Same day. Notes is one line until it holds more,
  grows with its text, and its handle drags it taller.
- **A 1px subtle rule opens every section after a tab's first,** edge to edge,
  24px under what precedes it and 16px over its heading. Carbon has no guidance
  on rules in forms, so this is the app's choice.
- **Headings are `heading-compact-01`,** 14px, between the 12px field labels
  and the panel's 16px title, the order Carbon asks a group heading to keep.
- **Contained tabs, on the board's band surface.** The strip lines up with the
  board's day row and the availability roster's heading, which are the same
  grey band, so the three read as one row. The tabs take 8px padding so all
  six fit the panel.
- **The editor stays a column beside the board on every tab,** with its tabs,
  though Carbon's pattern discourages tabs in a side-panel form: the week stays
  in sight while a trip is edited wherever the board can hold both. Where it
  cannot, the editor comes in front of the board instead of squeezing the week
  past reading, which `scheduler-panel-placement.md` decides.
- **The destructive action says what it does.** The action bar's first button
  is "Cancel trip", a danger ghost button; the close button leaves the editor.

## Questions

None.

## Tasks

- [ ] rux reads every tab on real trips, in Chrome, Safari and on the phone.
