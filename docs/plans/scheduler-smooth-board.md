---
type: plan
---

# Plan: A board that stays smooth as its width changes

## Goal

Resizing the window, or opening or closing a panel beside the week, redraws
the board within one frame, so a side panel can push the week as Carbon's
side panel pushes the page, and the trip editor opens without a pause.

Today, with 155 trips drawn across 35 days and about 30 on screen, each
change of width costs 90–125ms, so the board draws eight to ten frames a
second while it changes. The width itself costs 1–2ms. The rest is the
browser restyling all 6,300 elements of the week, about 48ms a time, two or
three times for each change.

## Decisions

- **Every task is measured before and after** in Chrome on :8641 on a real
  week: the restyle after a change of width, and the frames of a 240ms
  glide of the week's width. The numbers go in the commit message.
- **One restyle per change of width.** `fit` in `scheduler/app.js` clears
  the day widths and measures again, and `fitShort` measures after it,
  each forcing a restyle; the bus column's and a day's least width are kept
  from the last full measure, since only new rows change them.
- **Trips far off screen are skipped.** The strip marks a trip more than
  three days out of view, and `app.css` gives it `content-visibility:
  hidden`, so its box keeps its place and lanes and only its insides are
  left unstyled; that took a restyle from 48ms to 22–27ms. Letting the browser decide,
  `content-visibility: auto`, skipped only 26 of the 155 and saved nothing.
- **The costly rules are fixed where they live.** With no stylesheet a
  restyle costs 4ms; without `design/css/rux-overrides.css` it costs 26ms,
  and without `scheduler/app.css` 29ms. Rules are switched off one at a time
  to find the ones every element pays for, and each fix leaves every page
  looking the same, proven by screenshots before and after.
- **Opening the editor writes the root's attributes once.** Each attribute
  on the root costs a restyle of the whole page, about 43ms.
- **Panel motion comes last,** once a change of width fits in a frame, on
  Carbon's curves and durations in `design/docs/motion.md`.

## Questions

- With trips far off screen skipped, the browser's Find (⌘F) does not find
  a trip more than three days out of view until the board is scrolled near
  it; the scheduler's own search still does. Is that all right?
- Once the week can glide, should a panel push the week as Carbon's does,
  the week narrowing while the panel slides in, or use Reveal, the week
  narrowing at once and the panel sliding into the space?

## Tasks

- [ ] Make `fit` one restyle per change of width.
- [ ] Skip the trips far off screen, keeping glides, swipes, drag and drop,
      Today and the keyboard's focus working.
- [ ] Find the costly rules and fix them in the file they live in.
- [ ] Open the editor with one write to the root.
- [ ] Add the panel motion, and correct `design/docs/motion.md`, which files
      a panel arriving under expressive motion where Carbon's side panel is
      productive.
