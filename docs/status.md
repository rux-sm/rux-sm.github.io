# Status — what is unfinished, across every app

The one list of open work for the whole site. Each item says what is open and
why, in a line or two. When it is done, delete it; git history keeps what was
done and how.

## Design

- **Screen-reader pass.** Toggle, modal and popover are not heard yet, two
  problems are open, and five controls need hearing again. The list is in
  `design/docs/screen-reader-pass.md`.
- **Two references are older than the rest.** `design/data/carbon-react-spacing.json`
  was captured in a background tab, and `design/data/carbon-slots.json` predates
  Carbon 1.116. Each needs taking again.
- **Material icons are not a declared dependency.** `design/package.json` does not
  list `@material-symbols/svg-400`, so `npm install` removes it and the icon
  build fails until it is put back.

## Scheduler

- The quote calculator's eight spreadsheet quirks are kept until rux and the
  manager decide them. The list is on the calculator's Rules tab.
- The forms page draws the driver envelope, the hours-of-service record, the
  driver itinerary and the customer quote. A passenger roster is still named
  for it, after the printed schedule.

## Pixels

- A solved puzzle shows in black and white. The DS reveals a colour picture;
  that needs a colour step in the maker.

