# Status — what is unfinished, across every app

The one list of open work for the whole site. Each item says what is open and
why, in a line or two. When it is done, delete it; git history keeps what was
done and how.

## Design

- **Screen-reader pass.** Eight components are not heard yet, two problems are
  open, and five controls need hearing again. The list is in
  `design/docs/screen-reader-pass.md`.
- **ant-dark's menu is not compared with Ant's.** Its Dropdown and Menu pages
  have not been measured; every other ant-dark shape is read from Ant's own.

## Scheduler

- The quote calculator's eight spreadsheet quirks are kept until rux and the
  manager decide them. The list is on the calculator's Rules tab.
- A trip covered by a bus from another company has no way to say so, so it
  reads as short of a bus. A mark on the bus's seat, naming the company,
  needs a plan of its own.
- An uploaded certificate's four part dates are typed by hand. Every
  certificate on file is the same insurance form, so the page could read them.

## Pixels

- The rift functions still take a board size they do not read, and
  `pixels_levels` keeps a `width` column nothing reads; both go.
- Two leftovers of stars, which nothing reads or writes, are still in the
  database and go: the `p_stars` that `pixels_record` and `pixels_record_day`
  take and ignore, and the `stars` column of the two results tables.
- A guest with no PIN who loses their browser's key has no way back: one
  who joined before the door asked for a PIN, or removed it on Me. The owner
  needs a way, on Players, to hand a player a new key.
- An unticked tile in a rift's panel on Game shows a grey check that reads as
  ticked.
- The leaderboard cannot go on as it is: a time and a solve are the
  browser's word, Restart zeroes the clock, and it runs on an idle page.

