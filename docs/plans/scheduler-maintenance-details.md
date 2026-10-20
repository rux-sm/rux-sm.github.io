---
type: plan
---

# Plan: A bar's details on the maintenance link

## Goal

On the maintenance link, and on the staff maintenance page it shares a
script with, tapping a bus's bar opens what the crew needs about that leg:
its days, when the bus leaves the yard and when it is due back, and, while
the leg runs, whether the bus is still at the yard, on the road or back, and
about when it will be in. The page never says where a bus is.

## Decisions

- **No map, position, place, speed or driver on a page without a log-in,**
  because a forwarded link would let anyone follow a bus carrying
  passengers, often children.
- **A tap opens a passive Design modal,** `rux--modal` with
  `rux--modal-container--sm` and no buttons but Close, titled with the
  destination, as the staff page's Replace dialog is built. Each bar becomes a
  button, so the keyboard reaches it and design/js/modal.js gives focus back
  to the bar on close.
- **The modal says, in this order:** the leg (Outbound or Return), its days,
  Leaves the yard and Due back as the board writes times, and a status line.
  It names no stop, because a stop's name gives away the customer the link
  no longer sends.
- **The status line is one of four:** "Not left yet", "On the road",
  "On the road, back about 6:40p" and "Back at the yard, 6:52p". Before or
  after its leg, the line is left off.
- **On the road, and back at the yard, follow the board's own rules** in
  `scheduler/road.js`: a bus is out on its leg by `span` and `isOut`, two
  hours padded at each end, and back when it comes within `NEAR_MILES` of the
  yard after it left, so the link and the board never disagree about a bus.
- **The time back is worked out as the board's late return is,**
  `expectedBack` in `scheduler/road-bar.js`: Geoapify's drive to the yard
  slowed by `route-times-v1`'s `drive_slowdown_percent`, only once the yard is
  the bus's next stop, and shown on time or late alike. Before that the line is
  "On the road" alone, because an estimate that skips the stops ahead is
  wrong.
- **A new Edge Function, `maintenance-status`, works the line out,** with its
  source in `scheduler/maintenance-status/`, a `handler.ts` with no imports and
  an `index.ts`, as `samsara-now` is, because Samsara's and Geoapify's keys
  never reach a page. It takes the link's token and answers, for each bus on
  a leg now, `{ busId, leg, state, back, at }`: the state, the time back
  worked out or the time the bus came in, and when Samsara last heard from
  it. Nothing else leaves it.
- **The function reads the legs through a new definer function,**
  `get_maintenance_road(p_token)`, which checks the token as
  `get_maintenance_schedule` does and returns the buses on a leg now with
  their legs' stops, due times and map points, and the yard. It is granted to
  `service_role` alone, not to `anon`, since it returns stop coordinates, and
  the Edge Function calls it with the service role key the runtime provides.
- **The function reads `geoapify-key-v1`, `yard-location-v1` and
  `route-times-v1` from the settings rows the board reads,** with that same key, so each keeps one
  home and no new secret is set.
- **It asks Samsara once a minute at most for everyone,** holding its last
  answer for sixty seconds, and the page asks only while a modal is open, so
  a link open on ten phones costs one Samsara call a minute. It asks for each
  bus's path only since its leg left the yard, as `road.js` does.
- **The handler carries its own copy of the stop-following rule,**
  `whereOn`, since `road.js` runs in the browser, and
  `scheduler/tools/check-maintenance-status.mjs` runs the samples
  `check-road.mjs` uses through both and fails when they disagree.
- **A day out of service opens the same modal,** saying "Out of service" and
  its days, never the reason.
- **The database changes are their own step,** shown to rux as SQL and
  applied on a yes before the page that calls the function is pushed, and the
  Edge Function is deployed with Verify JWT off, as `samsara-now` is.

## Questions

- On the staff maintenance page, should the modal also link to the trip on
  the board? The public page would never show it.
- Should "On the road" also show on the bar itself, without a tap, as a small
  mark, or only in the modal?

## Tasks

- [ ] Show rux the SQL for `get_maintenance_road`, granted to `service_role`
      only, and apply it on a yes.
- [ ] Write `scheduler/maintenance-status/handler.ts` and `index.ts`, with
      the minute's cache, and `scheduler/tools/check-maintenance-status.mjs`,
      run by `npm run check`, comparing its rule with `road.js` on shared
      samples.
- [ ] Deploy `maintenance-status` on rux's yes, and call it with the link's
      token and with a wrong one to see that only the four fields come back.
- [ ] Make each bar and each day out a button in
      `scheduler/share/maintenance.js`, with the modal in
      `scheduler/share/maintenance.html` and `scheduler/maintenance.html`,
      asking the function once a minute while it is open.
- [ ] Add `get_maintenance_road` and `maintenance-status`, as a new section
      beside §8, to `scheduler/docs/database-inventory.md`, and the modal to
      the maintenance line in `scheduler/README.md`, each in the commit with
      the code it describes.
- [ ] Check both pages in Chrome on :8641 while a bus is on a leg, at phone
      width through a same-origin iframe, in g90 and white.
