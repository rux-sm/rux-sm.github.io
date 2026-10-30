---
type: plan
---

# Plan: A faster Scheduler

## Goal

The board opens, changes week and follows other people's saves without
waiting on the network or stalling under a finger, and the database does
only the work the page needs. The Scheduler keeps every feature it has; what
changes is how often it reads, how much it reads and how much it draws again.

## Decisions

### The first timing

Taken in Chrome on :8641 on a Mac, with the database on Micro and the indexes
in, writes recorded and none sent. The last task times the same steps again.

- **A load** reaches an interactive page in 173 ms and draws the board at
  about 1.5 s. Before it, 50 requests go out, 10 of them trip reads: the
  board's, which takes 716 ms in the browser where the database spends about
  40 ms on it, to-do's two, Departures' three and four of `clashes.js`'s
  `readNearby`, which to-do and Departures each call. The board's draw is one
  long frame of 310 ms.
- **A week change** inside the held weeks slides in about 830 ms with no read;
  every second one reads again, 13 requests, the board's read taking 470 to
  605 ms, then settles at 0.9 to 1.6 s with a long frame of 120 to 410 ms.
- **Another tab's save,** played by the tab-return event that sets off the
  same three readers, makes 38 requests and 10 trip reads in every open tab,
  the board's 610 to 670 ms, and settles at 2.2 to 3.6 s.
- **A swipe's first move** on the phone-width board takes 64 to 72 ms, drawing
  the spare week in that one frame.

### The database

- **The trip-read indexes are in,** as migration `trip_read_indexes`, and
  the Scheduler's trip reads take about 40 ms each where they took 130 ms.

### Reading

- **A live change reads only what it touched,** on the board, the to-do
  list and Departures, which hear it on the board's one channel; `data.js`'s
  live section says how. A week change still reads its trips, because
  `show()` is how a save in this tab reads back.
- **The board's read carries what the board draws.** A trip's update texts and
  its quote lines are read when its card or editor opens, not with every trip
  of nine weeks; the bar's follow-up mark needs only the day of the newest
  update that is not a skipped prompt, kind `nothing`, as `follow-up.js`'s
  `quietSince` reads it, and the board's read keeps that one.

### Drawing

- **Each draw works a fact out once.** A trip's legs, its back time and each
  leg's standing are kept per trip for the draw, keyed by the trip object, so
  a bar never sorts the same legs or walks every trip in the read again.
- **A leg's standing looks only at the legs near it,** from an index of the
  read's legs by day built once per draw, since a clash is only ever with a
  leg on or next to its days.
- **Date formatters are made once per module,** never inside a call, because
  making one costs ten times using one.
- **Measure, then change.** Rows, lanes and crews are measured in one pass and
  written in the next, so a draw or a scroll forces no layout per row or bar.
- **A swipe's spare week is drawn while the page is idle,** after each draw,
  so the first sideways move only slides.

### Loading

- **The editor stays in `data.js`,** because its scripts take under 170 ms of
  a 1.5 s load and the reads take most of the rest.

### What is not this plan's

- **Rux UI's leftover columns and colours are
  `scheduler-old-columns.md`'s,** because dropping them makes nothing faster
  and waits on the office's tabs being reloaded.

## Questions

None open.

## Tasks

- [ ] Take update texts and quote lines out of the board's read, keeping each
      trip's newest update that is not kind `nothing`, and read them when a
      card or the editor opens.
- [ ] Keep legs, back times and standing per trip for a draw, index the
      read's legs by day for standing, and make every date formatter once,
      in `data.js`, `week.js`, `clashes.js`, `bar.js`, `road.js`,
      `road-bar.js`, `follow-up.js`, `driver-job.js` and `departures.js`.
- [ ] Measure before writing in `spareFor`, `fitLanesInView`,
      `fitStuckRows` and `fitCrew`; draw a swipe's spare weeks when idle; and
      skip `fillTracks` while the page is hidden.
- [ ] Time the same steps as the first timing again and compare them with
      its figures.
