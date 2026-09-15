# Status — what is unfinished, across every app

The one list of open work for the whole site. Each item says what is open and
why, in a line or two. When it is done, delete it; git history keeps what was
done and how.

## Home and account

- The account panel never says who is signed in. Only the missing Sign in
  button shows that you are.
- An interrupted anonymous sign-in, when Turnstile times out or the network
  drops, isn't retried until the next page load.

## Design

- **Published themes.** A theme saved in the Theme Creator stays in that
  browser. It should be a shared record every app's theme picker offers.
- **Screen-reader pass.** Toggle, modal and popover are not heard yet, four
  problems are open, and three controls need hearing again. The list is in
  `design/docs/screen-reader-pass.md`.

### Asked for by the scheduler

- A toggle whose tap target meets 44px at touch widths. The label is the hit
  area, and it shrinks onto the switch when the label is empty.
- `.rux--contained-list__action` ends 16px outside the text it lines up with.
  It needs the header's inline padding.
- `.rux--contained-list-item__action` sits at the top of its row. It needs
  `inset-block: 0` and `align-items: center`.
- A display format for the date picker. `design/js/date-picker.js` shows ISO
  dates, while the scheduler shows mm/dd/yyyy everywhere else.
- `setToggle` words a product can choose. It always says On/Off, where the
  scheduler means Pending/Signed and Pending/Invoiced.
- A compiled size for the icon in `.rux--header__action`, so header icons can
  follow the button-icon rule.
- A file uploader, for the trip editor's planned Files tab.

## Scheduler

- Trip search shows the 50 newest matches, with no ranking by relevance.
- The quote calculator's eight spreadsheet quirks are kept until decided. The
  list is in `scheduler/docs/quote-calculator.md`.
- Below the md width the board shows about two of seven days. The phone view
  is the driver page in `scheduler/docs/screen-inventory.md`, not built yet.
- Weak highlights in geist: the roster tint and the keyboard highlight are
  barely visible, and no one has looked at all eight themes on screen.

## The database

- **Anyone with the public key can read and change trip data.** Every trip,
  fleet, driver, contact and billing table keeps an open rule beside its staff
  rule. Closing them waits until nothing uses the key alone.
- **Trip documents and photos are open to anyone.** All three storage buckets
  are public, and the public key can upload to and delete from each.

## Only rux can do

- Press Save on a real trip. The database is live and shared with rux-ui.
- Try the scheduler on a real phone. The cell menu may be unreachable on iOS.
- Delete the archived GitHub repositories, and decide whether `trip-board`
  stays.
