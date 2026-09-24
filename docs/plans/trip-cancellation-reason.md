---
type: plan
---

# Trip cancellation reason

## Goal

A cancelled trip says why it was cancelled, in both apps, and no one can
record a cancellation without writing one.

## Decisions

- **rux-ui already shows the reason.** The trip editor carries a cancelled
  banner reading `Cancelled {date} — {reason}`, and the trip finder puts the
  reason in the Cancelled badge's `title`. The banner is enough; the tooltip
  is not, because it never appears on a phone.
- **The scheduler shows nothing.** It writes a reason on cancel and then
  filters `cancelled_at is null` out of the board, the trip search and the
  panel, so a cancelled trip cannot be opened again and the reason is never
  read back. This is the real gap.
- **The reason becomes required in both cancel dialogs.** The confirm button
  stays disabled until the box holds something, so a cancellation cannot be
  recorded blind.
- **Reinstating clears the reason,** which is what rux-ui does today. A trip
  put back on the board carries no stale explanation.
- **The requirement lives in the dialogs, not the column.** 10 of the 69
  cancelled rows have a blank reason, so `not null` would need text invented
  for them first; those 10 stay blank.
- **The reason is typed,** in a box that cannot be left empty, because free
  text is what people write now.
- **The trip search finds cancelled trips behind a Cancelled tag,** as
  rux-ui's finder does, and opening one shows the reason in a banner.
- **A Trips page lists every trip, cancelled ones included,** planned in
  `scheduler-trips-page.md`.

## Questions

None open.

## Tasks

- [ ] Make the reason required in rux-ui's cancel modal, where
  `promptCancelReason` resolves on an empty box today.
- [ ] Replace rux-ui's finder tooltip with something a phone can show.
