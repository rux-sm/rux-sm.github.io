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

### Could show the wrong board

1. **The read queue is a set of flags, not a state.** `weekMotion`,
   `readAgain`, `weekOwed`, `liveHeld`, `liveFull`, `stripStale`,
   `stripAhead`, `barsInHand` and `drawOwed` each guard one path, and every
   path was traced for this review: a newer payload is never overwritten by
   an older one, because `readInTurn` runs one read at a time; a held change
   is released at the scroll's stop, the drag's end, the panel's close and
   on focus; a draw under a bar in hand is refused everywhere.
   One ordering was wrong until d51f8f62: a read that did not reach the week
   in view set `readAgain` alone, and the loop then ran a live read instead
   of another week read, so the strip was never re-asked. It is right now,
   but the next person will not trace nine flags. Fix: one `reads` object
   with named states (idle, reading, reading-with-newer-ask) and one
   `held` reason, so a path reads as a transition.

2. **Two renderers.** `render` draws the strip whole and `growStrip` moves
   it along; they must agree on every bar. `tools/check-strip.mjs` now
   proves they do, on invented trips in headless Chrome, two weeks on and
   four weeks back, comparing every bar's row, trip, leg, assignment, slot,
   days, lane, classes, words and fold, and every yard card; it fails on a
   growth broken on purpose. It takes twenty seconds, so it is run by hand
   after a change to either renderer, not by `npm run check`.

3. **Reads chase a fast hand.** A read ahead that lands with the week in
   view already past what it reached asks again at once; at ten days a
   second with two-second reads that is a read every second until the hand
   stops. Bounded, and the eight-week reach makes it rare. Fix: none now;
   note it before widening the strip.

### Costs a frame

4. **A bare `*` after `+` or `~` taxes the whole page.** Blink tries such a
   rule on every element and marks each parent as affected by sibling
   rules, for good; from then on inserting or removing any child restyles
   the subtrees of every sibling after it. One such rule,
   `.scheduler-panel-section__head + *`, cost a day cell's removal 26ms
   against 0.1ms without it, and the strip's growth was shaped around that
   until it went. The three `+ *` rules left in `app.css` sit under a class
   and measured nothing, but the next one written without a class ancestor
   brings it back. Fix: none now; `app.css` says why beside the head's rule.

5. **A bar's own style costs 65 to 100 microseconds** to work out, so moving
   the forty bars on screen is 4ms a step and no cheaper way exists while a
   bar's place is its own property. `--scheduler-start`, `-span`, `-lane` and
   `-lanes` are registered non-inherited, which keeps a change to one
   element; any new per-bar property should be registered the same way.

6. **`bar.js` reads `scrollWidth` while drawing**, so every new bar forces a
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
finding 4, not read from its source. The equivalence check runs with the old
trip shape, no routes and no Samsara, so a bar's live rows are outside what
it compares.
