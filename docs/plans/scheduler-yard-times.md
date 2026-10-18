---
type: plan
---

# Plan: Yard times

## Goal

Each bus keeps when it actually left the yard and when it actually got back,
read from Samsara's GPS history, so a trip that is back says when it came in,
and the office can set the real day beside the planned one.

## Decisions

- **Two times on each bus's row of the leg,** named Actual yard depart and
  Actual yard return wherever people read them, kept as new
  `trip_assignments.actual_yard_depart_at` and
  `trip_assignments.actual_yard_return_at` beside the `pickup_at` it already
  keeps; lateness is worked out from them and the planned times, never stored.
- **Read the way `pickup_at` is read,** by `scheduler/samsara-miles/handler.ts`
  across the leg's window, the planned yard-out to yard-back with its two
  hours' margin, against the yard point in the `yard-location-v1` settings row:
  the depart is the last GPS point within a quarter mile of the yard before the
  bus leaves it for good, and the return the first point of the last stay
  within a quarter mile of it after the leg's last stop.
- **A bus parked away from the yard has neither,** and a leg still out has no
  return, so nothing guesses.
- **Fetched with the miles,** by the Billing tab's Get from Samsara, which
  already saves `pickup_at` and each seat's miles.
- **Shown on a trip that is back,** in its bar's update row ahead of the miles
  and the money, "Back 7:52p", and on the editor's Route summary as Actual
  yard depart and Actual yard return beside the planned times.
- **The database change is its own step,** SQL shown to rux and applied on his
  yes before the code that reads it is pushed.

## Questions

- Should the times also be saved without anyone pressing Get from Samsara: by
  the board when a live bar goes out, or by a job each night for the day's
  trips?
- Should the trips already back be filled in, and from what date?
- Should the bar say a late return in amber, "Back 9:10p" when it is past the
  plan by more than ten minutes, or the time alone?

## Tasks

- [ ] Show rux the migration adding the two columns, and apply it on his yes.
- [ ] Teach `samsara-miles` to find each bus's actual yard depart and return,
  with cases in `scheduler/tools/check-samsara-miles.mjs` from sample tracks.
- [ ] Deploy `samsara-miles` with the Supabase CLI.
- [ ] Save the two times from Get from Samsara on the Billing tab, as
  `pickup_at` is saved.
- [ ] Show "Back" in a finished bar's update row and both times on the Route
  summary, with the database inventory and the screen inventory updated.
