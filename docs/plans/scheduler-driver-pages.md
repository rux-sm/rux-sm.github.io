---
type: plan
---

# Plan: a driver's link that shows their trips as they are

## Goal

A driver's My trips shows every leg they are on that the office has sent,
read live, instead of the legs saved on the link when it was last updated.
Most links in the Driver view say they show different trips, and a leg
taken off a driver since stays off their page only because the page drops
it; a leg added since never reaches them until staff update the link.

## Decisions

- **The screens stay as `scheduler/share/driver.js` draws them;** only
  which legs they read changes.
- **The change is to `get_driver_schedule_share`,** as SQL shown to rux and
  applied on a yes, as `AGENTS.md` sets out for the database.

## Questions

- Which legs count as sent: those marked Pending response or answered, or
  every leg the driver is seated on from today on?
- Does the Driver view keep its ticks, as what the message names, once the
  link no longer depends on them?

## Tasks

- [ ] Write the SQL for `get_driver_schedule_share` to return the driver's
      sent legs, and show it to rux.
- [ ] Take Update link and its state line off the Driver view, or keep them
      for the message alone, as rux answers.
- [ ] Check a link in Chrome on :8641 with a leg added and one taken off
      since the link was made.
