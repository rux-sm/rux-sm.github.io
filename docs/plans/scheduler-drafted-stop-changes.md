---
type: plan
---

# Plan: a draft that changes a trip's stops

## Goal

A fix to a trip's route is a link. Claude drafts the change, the trip
editor opens with it filled in and marked, and a Save writes it, so a fix
takes two steps per trip instead of a dozen clicks, from the desktop or the
phone.

## Decisions

- **`draft_trip_change` takes `stop_changes`,** a list of changes to the
  trip's saved stops: a stop's arrive and leave times, its days on a leg of
  more than one day, and what its wait counts as.
- **A stop is named by its id,** which `get_trip` answers with each stop,
  because a stop's number moves when another is added before it.
- **The fields and their kinds are `scheduler/draft-fields.js`'s,** checked
  before the draft is parked, as every other field is.
- **The editor lays each change into the Route tab as a person would make
  it,** marks the stop to check, and names in the notice any stop it cannot
  find. Save stays the only writer, with its history and Done marks.
- **One draft is one trip.** A fix across several trips is a link for each.
- **A draft cannot add or remove a stop on a saved trip,** because a
  stop's place is chosen from its list and a removal is the person's to see.

## Questions

- **Who presses Save on a drafted fix?** Claude after your yes in chat, as
  for any Save today (recommended), or only you?
- **Should a drafted fix also move a stop to another place,** or only its
  times and its wait?

## Tasks

- [ ] Answer each stop's id in `get_trip`.
- [ ] Add `stop_changes` to `scheduler/draft-fields.js` with its kinds and
      cases in `check-draft-fields.mjs`, and accept it on
      `draft_trip_change` only.
- [ ] Lay `stop_changes` into the Route tab in `applyDraft`, marking each
      changed stop and naming any it cannot find.
- [ ] Try a drafted fix on :8641 with the page's writes recorded, then
      deploy the connector on rux's yes.
- [ ] Write it into `scheduler/docs/working-from-claude.md`,
      `scheduler/docs/database-inventory.md` and the `trips` skill.
