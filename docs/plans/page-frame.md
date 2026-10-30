---
type: plan
---

# Plan: One page frame, narrow by default

## Goal

Every page of every app stands in one frame: the header's contents, the
nav, the header's menus and the page's content all line up with the same
two edges. The frame is narrow by default, a centred column, and a page
that is worked in rather than read, the scheduler's board first, opts into
a wide frame as wide as its work needs, up to the window. CSS draws the
frame, so the first paint is the final layout and nothing moves once the
scripts load.

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
- **A wide frame is as wide as its content asks, up to the window,** and
  centred in any width left over, so the scheduler's week stands at its own
  width with its open panels beside it.
- **Where a wide page fills the window, the header's contents stand on the
  content's 16px margin,** not on the window's edge, so the frame's edges
  hold at every width.
- **Firefox shows a wide page's header on the window's edges,** because
  lining it up with a frame sized by its content needs CSS anchor
  positioning, which Chrome and Safari 26 have and Firefox does not yet; a
  narrow page lines up there as everywhere.
- **One frame for the whole shell:** the header's contents, the side nav and
  the header's panels follow the frame's edges on every page, so no app
  lines its header up with its content in code of its own.
- **CSS draws the frame on the first paint.** No script measures a page to
  size or centre it; a script may round a size to whole pixels, which moves
  nothing a person can see.
- **The scheduler opts into wide and keeps no framing of its own.** Its week
  is sized by its grid, each day `minmax` its minimum and its cap, in a frame
  that shrinks to fit, and `--scheduler-shell-max`, `holdShell` in
  `scheduler/app.js` and the rux-100 and rux-dark header insets in
  `scheduler/theme.css` go.

## Questions

None open.

## Tasks

- [ ] Design: the narrow frame for the header's contents, the side nav and
  the header's panels on every framed page, in every theme.
- [ ] Design: the wide frame, shrinking to its content and centred, with the
  header lined up with it by anchor positioning, on the content's margin
  where the page fills the window, and on the window's edges in Firefox.
- [ ] Design: a template page showing each width, and the frame written up
  in Design's docs as the one way a page is laid out.
- [ ] Scheduler: the week sized by its grid in a frame that fits it, the
  board centred by CSS, and its own framing code and rules removed, with
  `placeRoom` in `scheduler/data.js` checked against the new sizes.
- [ ] Every app: its pages checked in the narrow frame at a phone, a laptop
  and a wide window, and the website's copy of Design's build checked once
  it is next copied.
- [ ] Prove the first paint: a reload recorded frame by frame in Chrome on
  :8641, its first paint equal to its last, with each panel open, in
  rux-100, rux-dark and white, for one week, two weeks, Scroll continuously
  and Fill the window.
