# Status — what is unfinished, across every app

One list, since 2026-09-12. An item is one line and points at the document
that holds the reasoning; nothing is copied here. When it is done, delete the
line. `docs/platform-consolidation-plan.md` is the plan this list serves.

## rux-ds, from the scheduler — `rux-scheduler/docs/rux-ds-requests.md` has each section

- A toggle whose tap target meets 44/48px at touch widths (2026-09-11).
- `.rux--contained-list__action` padding to match the header's own (2026-09-11).
- `.rux--contained-list-item__action` centred in its row (2026-09-10).
- Four payment-method glyphs in the sprite, or a ruling that payment methods are text-only (2026-09-10).
- A combo box that filters as typed; `js/list-box.js` is select-only by design today (2026-09-09).
- A consumer-chosen display format for the date picker; ISO is deliberate today, `js/date-picker.js:141` (2026-09-09).
- `setToggle` words a product can choose; the module notes its own hard-coded On/Off at `js/form-controls.js:68` (2026-09-09).
- A compiled size for the icon in `.rux--header__action` (2026-09-08).

Done on `main` and not yet live, because rux-ds deploys on a tag and `main`
is 34 commits past `v0.1.23`: the date picker's `[hidden]` rule and the
contained-list label's type, both `c185834`. Live in `v0.1.23`: the shell
state (`a545cc1`), `check-behaviour` scoped to the document (`0527a30`), the
date picker's external trigger (`89e14fd`), `#i-user--multiple` with
`#i-events` declined (`c869d7f`). The toast region was declined, with the
region's shape recorded in `rux-ds/docs/consumer-policy.md` §3.2.

## rux-ds, from Notes

- Whether `--rux-border-strong-01` keeps 3:1 in the four brand themes; five of
  twelve combinations sit below it — `rux-ln-notes/exchange/SEND-DS-2.md`.
  A decision, rux's.

## rux-ds's own — `rux-ds/README.md` "Open decisions"

- Published themes reaching every app on push (roadmap §8.5).
- Two screen-reader tasks (`rux-ds/docs/screen-reader-pass.md`).
- Whether `templates/settings-page.html`'s column spans are deliberate.
- Builder stage 13, repeated items (`rux-ds/docs/builder-guided-plan.md`).

## The schema, from the scheduler — `rux-scheduler/docs/schema-requests.md`

- An overpaid trip reports itself unconfirmed (2026-09-10).
- One PO and one invoice per trip is not enough (2026-09-10).

## Blocked on one decision

Whether rux-ui is taught the PO and invoice tables —
`rux-scheduler/docs/po-invoice-lists-plan.md` §0.3 and
`rux-backend/docs/identity-plan.md` step 5. The plan records rux's answer
that rux-ui keeps working alongside the scheduler, so replacing it first is
off the table; whether it is taught the new tables is still open. The two
schema items above wait on it.

## Notes owes atlas — `rux-ln-notes/docs/status.md` "Owed to atlas"

- Whether uncovered session codes publish name-only or are omitted; blocks
  atlas's screen-reference emitter.
- The session-code count, scope agreed first, then the number.
- Cross-guide references arriving in two shapes; the new figures.

## The consolidation itself

- `docs/platform-consolidation-plan.md` stage 1: remove the SessionStart hook
  in `rux-ds/.claude/settings.json` (rux's, a tracked settings file); demonstrate
  the Atlas-to-Notes-to-DS scenario on a real task before stage 2.
