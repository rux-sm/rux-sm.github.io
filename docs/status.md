# Status — what is unfinished, across every app

The one list of open work for the whole site. Each item says what is open and
why, in a line or two. When it is done, delete it; git history keeps what was
done and how.

## Home and account

- An interrupted anonymous sign-in, when Turnstile times out or the network
  drops, isn't retried until the next page load.

## Design

- **Published themes.** A theme saved in the Theme Creator stays in that
  browser. It should be a shared record every app's theme picker offers.
- **Screen-reader pass.** Toggle, modal and popover are not heard yet, four
  problems are open, and three controls need hearing again. The list is in
  `design/docs/screen-reader-pass.md`.


### Asked for by Notes

- A side-nav link that meets 44px at touch widths. It is 32px tall, and the
  side nav is how a phone moves between Notes pages.

## Scheduler

- Trip search shows the 50 newest matches, with no ranking by relevance.
- The quote calculator's eight spreadsheet quirks are kept until decided. The
  list is in `scheduler/docs/quote-calculator.md`.
- The driver page, §4 of `scheduler/docs/screen-inventory.md`, is not built
  yet.
- The forms page draws the driver envelope only. A driver sheet, the printed
  schedule, a quote, an hours-of-service form and a passenger roster are the
  ones named for it; which follows the envelope is undecided.

## The database

- **Trip paperwork is readable by anyone with its address.** Writing is staff
  only now, but the three buckets stay public, so closing reading waits on the
  two document share pages asking for a time-limited link.

## Only rux can do

- Press Save on a real trip. The database is live and shared with rux-ui.
- Try the scheduler on a real phone. The cell menu may be unreachable on iOS.
- Delete the archived GitHub repositories, and decide whether `trip-board`
  stays.
