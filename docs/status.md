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

- **ant-dark helper text** is 4.4:1 on `layer-02`, under the 4.5:1 body text
  needs. The editor's Billing tab shows it.

### Asked for by Notes

- A side-nav link that meets 44px at touch widths. It is 32px tall, and the
  side nav is how a phone moves between Notes pages.

## Scheduler

- Trip search shows the 50 newest matches, with no ranking by relevance.
- The quote calculator's eight spreadsheet quirks are kept until decided. The
  list is in `scheduler/docs/quote-calculator.md`.
- Below the md width the board shows about two of seven days. The phone view
  is the driver page in `scheduler/docs/screen-inventory.md`, not built yet.
- Weak highlights in geist: the roster tint, the keyboard highlight and the
  editor's bus tiles on the Fleet tab are barely visible.

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
