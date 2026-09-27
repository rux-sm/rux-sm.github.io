---
type: plan
---

# Plan: the scheduler's place search on Esri

## Goal

Typing a place in the scheduler finds it the first time: the Route tab's
pickup, drop-off and stops, and the Locations page. Mapbox misses places the
company drives to often, like Six Flags Fiesta Texas and AT&T Stadium, and
files rural addresses under the wrong town, like 5519 TX-44 in Banquete.

## Decisions

- **Esri's ArcGIS geocoder replaces Mapbox's Search Box for finding places.**
  Tried side by side, it found all 15 test places, and Mapbox missed four.
- **Its terms let a found place be kept and shared.** A pick is fetched with
  `forStorage=true`, which Esri's agreement allows to be stored for the
  business. Google, HERE, TomTom and Radar allow 30 days at most, and a trip is
  kept for good.
- **Suggestions as you type are free; each pick costs $4 per 1,000.** The
  scheduler has saved about 450 places in all, so the bill is cents a month.
  Esri needs a card on file for stored picks.
- **Drive times stay on Mapbox Directions.** Esri's terms have no rule against
  it, and routing works.
- **The key lives in `settings` as `arcgis-key-v1`,** limited to the site's
  address and the :8641 preview, and to geocoding alone.
- **No database change.** Esri gives no lasting id for a place, so a pick
  saves no `mapbox_id`, and two places are the same when their addresses match,
  as the code already falls back to.
- **One suggestion per place.** Esri lists the same school two or three times
  under different addresses. Suggestions with the same name and town collapse
  to the one that has a street address.
- **rux-ui keeps Mapbox.** It writes the same tables and stays in use, and a
  Mapbox pick there still saves its `mapbox_id`.
- **One search function.** `places.js` owns the search, and the trip editor
  calls it instead of its own copy in `data.js`.

## Questions

- rux makes a free ArcGIS Location Platform account, adds a card, and creates
  an API key with the geocoding privilege, limited to `https://rux-sm.github.io`
  and `http://localhost:8641`. The session saves it to `settings` on a yes.

## Tasks

- [ ] Search in `places.js` through Esri's `suggest`, then `findAddressCandidates`
  with the pick's `magicKey` and `forStorage=true` for its address and map point.
- [ ] Collapse repeated suggestions; show a place's name over its address.
- [ ] Make the Route tab use `places.js` and delete `searchPlaces` from `data.js`.
- [ ] Show Esri's attribution where its terms ask for it.
- [ ] Save the key to `settings` on a yes.
- [ ] Update the Mapbox lines in `scheduler/docs/screen-inventory.md` and
  `scheduler/docs/database-inventory.md`.
- [ ] Check in Chrome on :8641: Banquete, Six Flags Fiesta Texas, a school,
  a saved location, and a drive time from the yard to Six Flags.
