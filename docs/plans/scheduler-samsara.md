---
type: plan
---

# Plan: More from Samsara

## Goal

The scheduler reads more of what Samsara already knows, so the office sees
trouble on the board without opening Samsara: a driver on a trip who is
not logged in, in the wrong bus, over hours or on the wrong hours rules;
and each pre-trip inspection, safe or not. A customer can follow their
bus on a link in the Driver info message. What `samsara-now` reads today is in
`scheduler/docs/database-inventory.md` §8, and the driver tile it feeds in
`scheduler/docs/screen-inventory.md`.

## Decisions

- **A driver on a trip whose app is disconnected says Not logged in.**
  Samsara's clocks list every driver and give a disconnected one an empty
  duty, so `samsara-now` answers them with no duty, where a driver Samsara
  does not have is absent. On a trip under way the tile has the amber
  warning mark and "Not logged in" in its line; off a trip it stays the
  quiet dash.
- **A driver logged into the wrong bus says so on their tile.** The rail
  finds the bus in `samsara-now`'s buses whose crew holds the driver, as a
  trip bar's Wrong bus does, and on a trip under way a bus that is none of
  the ones they ride on it, a co-driver's other buses among them, gives the
  red bus alert mark and "in 133" in red.
- **Over hours comes from Samsara's own violation.** The clock's
  `violations` gives the shift-driving and cycle time a driver is over now;
  over zero is the red mark and "Over 0:25" in red, and "0:00 left" stays
  red for a driver Samsara counts no violation for yet.
- **Each driver's hours rules are checked against the bus rules.**
  `samsara-now` reads Samsara's drivers for each one's rules; a driver whose
  rules are not a passenger carrier's has a red mark on their tile and its
  words on their card, since every clock they show is wrong, and the fix
  is their settings in Samsara.
- **Samsara's inspections are read live, not stored.** `samsara-now`
  reads the last day's inspections and any still unsafe from thirty days:
  a trip bar warns No pre-trip once yard-out has passed with none since two
  hours before it, and a bus with an unsafe one has a red mark until a
  mechanic resolves it in Samsara. No defect is copied into the Fleet
  profile.
- **A customer follows their bus on the scheduler's own link, one a trip.**
  Samsara's link shows a bus from the moment it is made and cannot change
  its bus, so the customer is sent `share/track.html` with the trip's token
  instead, which can go out days ahead and follows a bus swap.
- **The link is in the Driver info message.** `driverLetter` gains one line
  after the buses, "Follow your bus on the day of the trip:" and the link,
  in the copied details and the email alike, asked for as the Contact list
  opens, as a driver's link is. A trip whose buses are all a partner's has no
  line, since a partner's coach is not in Samsara.
- **The page shows a bus only during its leg,** from the leg's yard-out, so
  the customer sees the drive to the pickup and nothing earlier, to an hour
  after its yard-back. Before the leg it says when
  the map starts, after it that the trip has ended, and between a drop-off
  and its pickup when the next starts. During it, each of our buses on the
  leg has its number and Open map, and one bus alone goes straight to the
  map. It shows no driver, customer or stop.
- **The token is the trip's, kept in a new `trip_tracking_links`,** reached
  only through an RPC staff call, which makes it once and answers it after;
  a cancelled trip's link says the trip has ended.
- **`samsara-share` answers the page, not the board.** It takes the token
  with no log-in, reads the trip's legs and buses itself, and during a leg
  makes Samsara's live link of each bus's vehicle, expiring an hour after
  the leg's yard-back. It keeps each link in a new `trip_tracking_shares`
  beside the bus and leg it was made for, so a second visit gets the same
  link and a swapped bus gets a new one while the old is ended in Samsara.
- **The bar's Copy tracking link copies the same link,** for a text on the
  day, as the Live map's card link does. The stops stay the scheduler's and
  are not copied into Samsara as a route.
- **Safety events stay in Samsara.** Hard braking, speeding and phone use
  are the office's to review there, not the board's.
- **Each database change is its own step,** SQL shown to rux and applied on
  his yes before the code that reads it is pushed.

## Questions

None open.

## Tasks

- [ ] Make the Samsara API token Scheduler Links again with Write Live
      Sharing Links alone, under Driver Workflow, and put its full
      `samsara_api_` value in the `SAMSARA_SHARE_TOKEN` secret, which holds a
      value Samsara calls invalid, so `samsara-share` answers no-permission.
- [ ] Add `trip_tracking_links` and `trip_tracking_shares` with the RPC that
      makes a trip's token, SQL shown to rux and applied on his yes.
- [ ] Turn `samsara-share` to answer a token: the leg's window, a link for
      each bus kept and reused, the old one ended on a swap, with
      `check-samsara-share.mjs` covering before, during, after and a swap.
- [ ] Build `share/track.html` from a Design template, with its states for
      before, during, between legs, ended and a link that is not known.
- [ ] Add the link's line to `driverLetter`, and Copy tracking link to the
      bar's menu and the Live map's card links, both copying the trip's link.
- [ ] Say the link in `scheduler/docs/database-inventory.md` §2 and §11 and
      in `scheduler/docs/screen-inventory.md`.
