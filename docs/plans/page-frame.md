---
type: plan
---

# Plan: One page frame, narrow by default

## Goal

Every page of every app stands in one frame: the header's contents, the
nav, the header's menus and the page's content all line up with the same
two edges. The frame is narrow by default, a centred column, and a page
that is worked in rather than read, the scheduler's board first, opts into
a wide frame of a fixed width, and what opens beside its work takes width
from the work rather than widening the frame. CSS draws the frame, so the
first paint is the final layout and nothing moves once the scripts load.

## Decisions

- **Narrow is Design's default and needs nothing from a page.** Home, LN
  Guide, the games and Design's own pages are framed without code of their
  own.
- **Narrow is 76.25rem,** Geist's 1220px container and the width the
  content's frame already is, so a framed page keeps its width.
- **Every theme frames the header,** Carbon's four, the Apple pair and the
  rest as rux-dark and geist-dark do, so a page is laid out one way
  whatever theme it wears.
- **Wide is the one opt-in, and Carbon's full-width grid is its switch,**
  `rux--css-grid--full-width` as the content's own grid, because it is
  Carbon's own mark of a page worked in rather than read, and the frame in
  `design/css/rux-overrides.css` already reads it.
- **Wide is 99rem,** Carbon's `max` breakpoint and its grid's widest, centred
  in the window, or the window less a 16px margin either side where it is
  narrower, the header's contents standing on that margin. It is the
  narrowest width that keeps the scheduler's seven days at their 160px
  minimum beside any one panel, the 24rem document panel the widest.
- **A wide frame keeps its width whatever opens in it.** A panel takes its
  width from the work beside it, so opening one moves no edge of the page.
- **A wide page that should fill the window says so** by setting
  `--frame-wide`, as the scheduler's Fill the window and Maintenance do.
- **One frame for the whole shell:** the header's contents, the side nav and
  the header's panels follow the frame's edges on every page, so no app
  lines its header up with its content in code of its own.
- **CSS draws the frame on the first paint.** No script measures a page to
  size or centre it; a script may round a size to whole pixels, which moves
  nothing a person can see.
- **The scheduler opts into wide and keeps no framing of its own.** Its days
  share the frame down to their minimum, in every theme, rux-dark's 167px
  among them, and two panels that do not fit beside the week take the
  board's existing rule, the list over the week beside the editor.

## Questions

None open.

## Tasks

- [ ] Design: a template page on the wide frame, with its `BEHAVIOUR:`
  evidence, beside the narrow templates.
- [ ] Every app: its pages checked in the narrow frame at a phone and a
  laptop width, and the website's copy of Design's build checked once it is
  next copied.
