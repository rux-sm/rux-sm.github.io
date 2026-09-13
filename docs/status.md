# Status — what is unfinished, across every app

The one list of open work for the whole site. Each item says what is open and
why, in a line or two. When it is done, delete it; git history keeps what was
done and how.

## Home and account

- The account panel never says who is signed in. Only the missing Sign in
  button shows that you are.
- An interrupted anonymous sign-in, when Turnstile times out or the network
  drops, isn't retried until the next page load.

## Design system

- **Published themes.** A theme saved in the Theme Creator should become a
  tracked record in rux-ds that any visitor can pick in any app's theme picker
  once pushed. Today `js/custom-themes.js` saves only to the browser, and
  nothing writes to the repository. Required, not built.
- **Screen-reader pass.** Toggle, modal and popover are not heard yet. Four
  problems are open and three controls need hearing again; the list is in
  `rux-ds/docs/screen-reader-pass.md`.
- Whether `templates/settings-page.html`'s `col-span-4/8/8` is deliberate.
- **Builder stage 13, repeated items:** duplicate, remove or reorder a sibling
  block, re-suffixing its ids. The first question is whether it is wanted, or
  whether more captured compositions serve better.
- **Border contrast in the brand themes.** On the session map the dashed
  Prerequisite border reads 3.02 to 3.48 against its background in the four
  Carbon themes, and 2.11 to 2.63 in geist, linear, ant-dark and spotify. No
  information rides on the border alone. Whether `--rux-border-strong-01`
  should keep 3:1 in every theme is rux's call (measured 2026-09-11).

### Asked for by the scheduler

- A toggle whose tap target meets 44/48px at touch widths. The hit area is the
  label, which collapses onto the switch when there is no label text, and the
  size variants don't change it (2026-09-11).
- `.rux--contained-list__action` ends at the header's border edge, 16px outside
  the text it lines up with. It needs the header's own inline padding
  (2026-09-11).
- `.rux--contained-list-item__action` is pinned to the top of its row. It needs
  `inset-block: 0` and `align-items: center`, and shows only above `size-sm`
  (2026-09-10).
- Payment-method glyphs: none of the sprite's 63 symbols means money. Add a
  card, a bank, a note or coin and a cheque from Carbon, or rule that payment
  methods are text-only (2026-09-10).
- A combo box that filters as typed. `js/list-box.js` is select-only, and the
  trip editor picks a contact from about 200 rows with repeated first names
  (2026-09-09).
- A display format for the date picker. `js/date-picker.js` reads and writes
  ISO only, while the app shows mm/dd/yyyy everywhere else (2026-09-09).
- `setToggle` words a product can choose. It hard-codes On/Off over values that
  are Pending/Signed and Pending/Invoiced (2026-09-09).
- A compiled size for the icon in `.rux--header__action`. Carbon sets none, so
  the header's icons can't follow the button-icon rule (2026-09-08).

## Scheduler

- Save hasn't been pressed on a real trip. The database is live and shared with
  rux-ui, so the first write is rux's call (2026-09-11).
- Touch hasn't been tried on a real phone, and the cell menu, the prefilled way
  to create a trip, may be unreachable on iOS.
- Trip search stops at 50 results, newest first, with no ranking by relevance.
- Below the md width the board shows about two of seven days. A day view was
  considered and not built, and `rux-scheduler/docs/screen-inventory.md` plans a
  driver page as the phone surface instead. Rux's decision.
- The board scrolls behind the full-screen panels below md, because nothing
  locks the page.
- The trip editor's Files tab waits on rux-ds compiling a file uploader.
- Weak highlights in some themes: geist's roster tint is 1.14:1 and the keyboard
  highlight 1.2:1, and neither was looked at on screen in all eight themes.
- Carbon has no amber tag, so an amber trip bar renders warm-gray. Rux's call: a
  neutral amber, or one bar hue outside Carbon's tags.

## The database, for the scheduler

- **An overpaid trip reports itself unconfirmed.** `deriveStatus` tests
  `overpaid` before `paid_full`, and the live `confirmWhen` list doesn't include
  `overpaid`, so a trip paid past its price shows Not confirmed. Add it, or
  record that it is deliberate (2026-09-10).
- **One PO and one invoice per trip is not enough.** Add `trip_pos` and
  `trip_invoices`, many rows per trip, shaped like `trip_payments`, and keep the
  old single columns as a mirror written on every save so rux-ui keeps working.
  The sequence is `rux-scheduler/docs/po-invoice-lists-plan.md` (2026-09-10).

## Blocked on one decision

Whether rux-ui is taught the PO and invoice tables:
`rux-scheduler/docs/po-invoice-lists-plan.md` §0.3, and step 5 of the identity
plan in the archived `rux-backend`. Rux's answer so far is that rux-ui keeps
working alongside the scheduler, so replacing it first is off the table; whether
it learns the new tables is still open. The two database items above wait on it,
and so does closing the database's open access rules.

## Notes owes atlas

- **The overview diagram** leaves out three things atlas must author, and its
  title is atlas's to change. The list is in `rux-ln-notes/docs/diagram.md`,
  "Scope".
- Whether session codes with no coverage publish name-only or are omitted. It
  blocks atlas's screen-reference emitter.
- The session-code count: agree the scope first, then the number. Three scopes
  have given 58, 91 and 108.
- Cross-guide references arrive in two shapes, 13 as links and 28 as literal
  file names, and atlas hasn't been told the new figures.

## Naming

- A clean naming system across apps, repositories and atlas, under review:
  `docs/naming-plan.md`. Applied in four stages once agreed; the file goes when
  the last stage lands.
