---
type: plan
---

# Plan: finish the driver envelope and the driver itinerary

## Goal

The two forms on the Forms page are done: nothing a person types is lost by an
accidental press, the band of controls reads as one row end to end, and every
field can be used by ear as well as by eye.

## Decisions

- **What is typed survives a change of layout or copy,** held per copy for as
  long as the page is open and never stored. A control press must not destroy
  work, and a half-filled form kept anywhere is a second answer beside the
  trip.
- **Print all is a cell like the others,** flush and the band's full height.
  One band, one rule; a shorter button at the end floats on nothing, which is
  the fault already taken out of the panel's row.
- **The Printed tick's whole cell is the target.** The cell is what looks like
  the control, so it is what a press should land on.
- **The page is named after the form it is showing,** `Driver envelope —
  Scheduler`, because that is the repository's own rule for a page title.
- **One top heading per page: the page's own name.** The form's title drops a
  level, and the envelope's day line stops being a heading at all — it names
  the day, not a section, and on a blank envelope it is empty.
- **Every typed field carries the name of the label beside it.** A field with
  no name is a blank to anyone listening rather than looking.
- **A blank itinerary comes ruled to the foot of the sheet.** A paper form
  handed over blank is written on by hand, and pressing a button for each line
  is not writing.

## Questions

- The multi-stop envelope prints on a white 6 by 9 sheet while the standard one
  prints on the kraft envelope itself. Is that right, or should both be the
  envelope?
- The Activity column was empty on every row of the trip I opened. It fills
  from a label on each stop. Is that what should fill it, or something else?
- Should what is typed survive a reload, or only the sitting? Surviving a
  reload means storing it somewhere.
- How many ruled lines should a blank itinerary come with?

## Tasks

- [ ] rux answers the questions above.
- [ ] Keep what is typed when the layout or the copy changes.
- [ ] Make Print all a cell, flush and the band's height.
- [ ] Give the Printed tick its whole cell as the press target.
- [ ] Name the page after the form it is showing.
- [ ] Leave one top heading per page, and take the envelope's day line out of
      the headings.
- [ ] Name every typed field on both forms.
- [ ] Tell the two links on the Forms page apart by name.
- [ ] Give the itinerary's table its column scopes and a caption.
- [ ] Rule a blank itinerary to the foot of the sheet.
