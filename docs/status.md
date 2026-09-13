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
- **Builder, repeated items:** duplicate, remove or reorder a block on the page.
  Whether it is wanted at all is rux's call.
- **Border contrast.** The session map's dashed Setup border reads 3.02 to 3.48
  in Carbon's themes and 2.11 to 2.63 in the brand themes. Whether
  `--rux-border-strong-01` must keep 3:1 everywhere is rux's call.

### Asked for by the scheduler

- A toggle whose tap target meets 44px at touch widths. The label is the hit
  area, and it shrinks onto the switch when the label is empty.
- `.rux--contained-list__action` ends 16px outside the text it lines up with.
  It needs the header's inline padding.
- `.rux--contained-list-item__action` sits at the top of its row. It needs
  `inset-block: 0` and `align-items: center`.
- Payment-method icons: the sprite has none for money. Add a card, a bank, a
  note or coin and a cheque from Carbon, or rule that payment methods are text.
- A combo box that filters as you type. `design/js/list-box.js` is select-only,
  and the trip editor picks one contact from about 200.
- A display format for the date picker. `design/js/date-picker.js` shows ISO
  dates, while the scheduler shows mm/dd/yyyy everywhere else.
- `setToggle` words a product can choose. It always says On/Off, where the
  scheduler means Pending/Signed and Pending/Invoiced.
- A compiled size for the icon in `.rux--header__action`, so header icons can
  follow the button-icon rule.
- A file uploader, for the trip editor's planned Files tab.

## Scheduler

- Trip search shows the 50 newest matches, with no ranking by relevance.
- Below the md width the board shows about two of seven days. A day view, or
  the driver page in `scheduler/docs/screen-inventory.md`, is rux's call.
- The board scrolls behind the full-screen panels below md, because nothing
  locks the page.
- Weak highlights in geist: the roster tint and the keyboard highlight are
  barely visible, and no one has looked at all eight themes on screen.
- Carbon has no amber tag, so an amber trip bar shows warm-gray. A neutral
  amber, or one bar colour outside Carbon's tags, is rux's call.
- **An overpaid trip.** The scheduler counts it as confirmed. The live
  `billing-workflow-v1` setting, which rux-ui reads, leaves `overpaid` out.

## Notes owes atlas

- **The overview diagram** still leaves out two things atlas must author, and
  its title is atlas's to change. The list is in `notes/docs/diagram.md`,
  "Scope".
- Some cross-guide references reach Notes as plain file names instead of
  links. Atlas should send them as links.

## Only rux can do

- Press Save on a real trip. The database is live and shared with rux-ui.
- Try the scheduler on a real phone. The cell menu may be unreachable on iOS.
- Delete the archived GitHub repositories, and decide whether `trip-board`
  stays.
