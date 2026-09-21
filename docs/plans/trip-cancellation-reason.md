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
  for them first.

## Questions

- **Where does a cancelled trip become visible in the scheduler?** It is
  filtered out of every view. The choices are: let the trip search return
  cancelled trips behind a badge, the way rux-ui's finder does; add a
  cancelled filter to the search; or leave it out of search and let a trip
  opened by its own link show the banner. The first matches rux-ui and is the
  smallest change.
- **Does the database enforce the reason, or only the two dialogs?**
  Enforcing means backfilling the 10 blank rows with a placeholder first,
  which puts words in the mouth of whoever cancelled them.
- **Is the reason free text, or a short list plus a note?** The 59 reasons
  already written fall into about six groups: price, went elsewhere, no
  response, customer is not travelling, not approved or no PO, and duplicate
  or tentative. A list makes them countable; free text is what people use now.
- **Are the 10 blank rows worth chasing?** Two of them are Valley View trips
  Delilah cancelled in August.

## Tasks

- [ ] Make the reason required in the scheduler's cancel dialog, and drop the
  `if (reason)` that lets a blank one through.
- [ ] Make the reason required in rux-ui's cancel modal, where
  `promptCancelReason` resolves on an empty box today.
- [ ] Give the scheduler a way to reach a cancelled trip and read its banner,
  once the first question is answered.
- [ ] Replace rux-ui's finder tooltip with something a phone can show.
- [ ] Decide what happens to the 10 blank rows.
