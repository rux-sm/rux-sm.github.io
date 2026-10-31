---
type: reference
---

# The board reviewed for robustness

What a dispatcher needs, in order: no edit lost or written to the wrong trip,
nobody's change silently dropped, no bar on the wrong day, and only then
frames. Each finding says where it is, what can go wrong, and the fix in one
sentence. Everything asserted about behaviour was checked in Chrome on the
cloud preview or by `tools/check-strip.mjs`; what could not be checked says so.

## Findings, worst first

### Could lose an edit

1. **A board drawn whole under a bar in hand.** `scrollStopped` in `data.js`
   draws the strip whole when a read ahead found it changed (`stripStale`),
   with no `barsInHand` guard, while every other draw has one. A drag that
   began before the stop finds its rows replaced and lets go nowhere: the
   move is not written, and the toast says the drag was interrupted. Fix:
   under a bar in hand, set `drawOwed` and let the drag's end pay the draw,
   as `drawHeld` does.

### Could show the wrong board

2. **A retired bar is still a bar to six readers.** `retire` keeps the
   element's classes and buttons, so until the sweep after the scroll, half a
   second or more: Tab reaches its alert, update and more buttons, and
   focusing one scrolls the strip to its far left and makes the dead bar the
   selection (`app.js` handles the click); a drag lifted in that row measures
   the hidden bar's box at (0,0) and puts the carried copy at the top of the
   window (`pad` in `installDrag`); a drop packs the dead bars into lanes and
   makes the target row taller for the settle; the next growth retires them
   again and rebuilds every yard card in the row; and a screen reader still
   finds them. Fix: one contract, a class `scheduler-bar--gone` that
   `app.css` hides with `display: none` and that every `:scope >
   .scheduler-bar` query on a track excludes, and `inert` on the element.

3. **A failed read ahead shows an error for a read nobody asked for.**
   `readWeek` tells the board "Could not load that week" on any failure,
   including the quiet read a sideways gesture asks for, and the notice
   changes the board's height mid-scroll. Fix: a read with `ahead` set
   fails silently and leaves the next growth to ask again.

4. **The read queue is a set of flags, not a state.** `weekMotion`,
   `readAgain`, `weekOwed`, `liveHeld`, `liveFull`, `stripStale`,
   `stripAhead`, `barsInHand` and `drawOwed` each guard one path, and every
   path was traced for this review: a newer payload is never overwritten by
   an older one, because `readInTurn` runs one read at a time; a held change
   is released at the scroll's stop, the drag's end, the panel's close and
   on focus; a draw under a bar in hand is refused everywhere but finding 1.
   One ordering was wrong until d51f8f62: a read that did not reach the week
   in view set `readAgain` alone, and the loop then ran a live read instead
   of another week read, so the strip was never re-asked. It is right now,
   but the next person will not trace nine flags. Fix: one `reads` object
   with named states (idle, reading, reading-with-newer-ask) and one
   `held` reason, so a path reads as a transition.

5. **Two renderers.** `render` draws the strip whole and `growStrip` moves
   it along; they must agree on every bar. `tools/check-strip.mjs` now
   proves they do, on invented trips in headless Chrome, two weeks on and
   four weeks back, comparing every bar's row, trip, leg, assignment, slot,
   days, lane, classes, words and fold, and every yard card; it fails on a
   growth broken on purpose. It takes twenty seconds, so it is run by hand
   after a change to either renderer, not by `npm run check`.

6. **Reads chase a fast hand.** A read ahead that lands with the week in
   view already past what it reached asks again at once; at ten days a
   second with two-second reads that is a read every second until the hand
   stops. Bounded, and the eight-week reach makes it rare. Fix: none now;
   note it before widening the strip.

### Costs a frame

7. **One rule in `app.css` makes every DOM insert or removal on the page cost
   the subtrees of every following sibling.** `.scheduler-panel-section__head
   + *` has a bare `*` after the `+`, so Blink tries it against every element
   and marks each parent as affected by sibling rules; from then on removing a
   day cell from the grid restyles the 5,600 nodes after it, 26ms. Deleting
   that one rule and styling a fresh copy of the grid brings the same removal
   to 0.1ms; no other rule, Carbon's included, made a measurable difference,
   and `display: contents` rows, sticky cells and absolute bars were ruled
   out the same way. Fix: `.scheduler-panel-section__head:not(:last-child) {
   margin-block-end: var(--rux-spacing-05); }` instead, then check the
   editor's section spacing in three themes. With that, `growStrip` could
   remove retired bars at once and finding 2 shrinks to the queries.

8. **A bar's own style costs 65 to 100 microseconds** to work out, so moving
   the forty bars on screen is 4ms a step and no cheaper way exists while a
   bar's place is its own property. `--scheduler-start`, `-span`, `-lane` and
   `-lanes` are registered non-inherited, which keeps a change to one
   element; any new per-bar property should be registered the same way.

9. **`bar.js` reads `scrollWidth` while drawing**, so every new bar forces a
   layout of whatever is dirty; a settle frame's cost is therefore in its
   count of draws, not its loop time, which is why `OWED_DRAWS_PER_FRAME`
   is one.

## Where the file could be cut

`data.js` is one closure of 18,800 lines because every part reads the same
few variables: the payload held, the week in view, the strip's first day,
the grid and the panel. Its sections, by their headings, are: reading and
the lists (lines 38 to 745), Samsara on the road (745), the yard (946), the
board's draw (1020), moves and drags (1357), the strip (1456), the trip
panel and editor (2194 to about 7400), drivers (10051), selection and the
card (11067), the panels beside the week (11826), view options (12094), the
cell menu (12731), QuickBooks, assigning and suggesting drivers (13226),
the document viewer (14015), files (15138), presence and the live board
(17500), the week picker (18100) and the strip's scroll (18290).

The first safe cut needs no DOM: `layOutBoard`, `weekPrint`, `windowOf`,
`heldRowsOf`, `tripOfChange`, `moveInto` and `carryMoves` are functions of
a payload, and `week.js` already holds `clip` and `assignLanes` that way. A
script of their own loaded before `data.js`, named for the payload, would
hold them, and a Node check could run them on invented rows as
`tools/check-bar.mjs` runs `bar.js`. The strip
is the second cut, once its dozen inputs are passed in rather than read from
the closure. The editor is the largest part and the most entangled, and is
last.

## Not verified

Why Blink restyles following siblings is inferred from the measurements in
finding 7, not read from its source. The cost of `inert` on a bar was not
measured. The equivalence check runs with the old trip shape, no routes and
no Samsara, so a bar's live rows are outside what it compares.
