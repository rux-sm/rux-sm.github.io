---
type: plan
---

# Plan: a narrowing desktop changes what the schedule shows, not what is open

## Goal

Dragging a desktop window narrower never takes a panel away and never refuses
to open one. What gives way is the room the schedule spends on each day, and
where a panel can no longer sit beside the week it floats over the board
instead.

## Decisions

### Two kinds of panel

The three panels are not the same kind of thing, and the behaviour follows
from what each is for.

**The roster is a companion.** "Who is free on Thursday" is a question about
the list and the week at once, so it is only useful beside the week. It stays
there, and the week spends its days to keep it: below the floor the week goes
compact rather than the roster going anywhere.

**The editor and the viewer are destinations.** While a form is being filled
in or a document read, the week is context rather than something read beside
it. Each sits beside the week while a readable week fits next to it, and
floats over the board where it does not, at its own width and docked to its
own side. The editor is asked first, being the one worked in while documents
come and go.

**One left panel at a time.** The roster and the viewer sit on the same side
and squeeze the week from it together, for a pairing rarely read at once, so
opening either closes the other.

### Nothing closes itself

No panel is taken away by a window that narrowed, and none is refused because
a window is small: a document always opens in the panel rather than a browser
tab. The only widths that matter are the one that decides beside or over, and
the one that compacts the week.

### The widths that decide it

Measured in `scheduler/app.css`, at 16px to the rem: a side panel is 20rem,
the viewer 30rem because its width is the document's zoom, and the week's
readable floor is 26rem. `placeRoom` prices the panels from those tokens
rather than from the panels themselves, because a floating panel gives its
width up and pricing it by what it takes would unmake the decision that
floated it.

So with one panel beside it the week stays readable to 47rem of board; under
that a destination floats, and the week the roster leaves keeps its readable
days and scrolls to fewer of them. The compact week belongs to the phone,
where the board itself is under the floor and nothing is left to give.

## Questions

None open.

## Tasks

- [ ] Read a week with the roster open and the window dragged narrow, and
      again with a document open, in geist and g100.
- [ ] Press Drivers with a document open and see the viewer give up the side;
      the browser this was built through could not be driven far enough to
      show it.
