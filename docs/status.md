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
- The forms page draws the driver envelope, the hours-of-service record, the
  driver itinerary and the customer quote. A passenger roster is still named
  for it, after the printed schedule.

## Pixels

- `pixels_results` and `pixels_daily` hold a copy of what `pixels_player_results`
  and `pixels_player_days` now keep, and nothing reads them. They are dropped
  once no browser still runs the pages that wrote them.
- The database still keeps stars, which no page shows: `pixels_record` and
  `pixels_record_day` are sent 3, and `pixels_board` orders by them. They go,
  and the board orders by time and by puzzles solved, before `BOARD` is on.

