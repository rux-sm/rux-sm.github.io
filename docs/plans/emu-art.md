---
type: plan
---

# Plan: Emu keeps its own box art

## Goal

Every cover Emu shows is a picture the home server holds, so a cover never
disappears because another site is down, and rux can add a cover no list
has. The covers themselves are `docs/plans/emu-front-end.md`.

## Decisions

- **The nightly scan fetches each game's cover once,** from libretro's
  thumbnail repositories on GitHub by the game's list names, and keeps it in
  an `art` folder of its cache as `<system>/<title>.png`; a game that has one
  is not asked for again.
- **A picture that is a link is followed,** because GitHub sends such a file
  as the other picture's name in text, which is why Ice Climber has no cover
  on the page.
- **A cover rux puts on the server wins,** at `art/<system>/<title>.png` in
  the `games` share beside `roms`, so a Switch game or one libretro lacks
  gets a cover without a change to Emu.
- **The scan puts each cover in Supabase,** in the `emu-collection` bucket
  under `art/`, as it does each BIOS and installer, because the page cannot
  reach the server quickly from inside the home and a phone has no helper.
- **The page reads covers only from Supabase,** by one request for every
  cover's signed address, and asks libretro for nothing; a game with no
  cover shows its title, as now.
- **A cover whose game is gone is removed,** from the cache and from
  Supabase, by the same scan.
- **The server's daily copy of Supabase holds the covers too,** with nothing
  added, since it copies everything under the bucket.

## Questions

- The page would read the covers from Supabase's copy, not straight from the
  server. Straight from the server is slow at home, 5 to 19 seconds a
  stall, and shows nothing when the server is off. Is Supabase's copy right?
- A cover is about 0.4 MB, so 121 games are about 50 MB in Supabase. Is
  that room fine as the collection grows, or should the scan save each cover
  smaller?

## Tasks

- [ ] In `emu/scan-save.js`, add the covers: which each game needs, which
  are gone, a link followed, and rux's own before libretro's; with cases in
  `emu/tools/scan-save.test.mjs`.
- [ ] In `emu/tools/scan-roms.mjs`, fetch and keep the covers in the cache
  and put them in Supabase, one line in the log for how many arrived.
- [ ] In `emu/data.js`, read every cover's signed address in one request;
  in `emu/app.js`, draw a cover from it and remove the libretro addresses.
- [ ] Prove it offline against a stand-in Supabase, then in Chrome on :8641
  after one real scan: every game libretro has shows its cover, Ice Climber
  among them.
- [ ] Say where covers come from in `emu/README.md` and
  `emu/docs/home-server.md`, with how rux adds one, and replace the box art
  decision in `docs/plans/emu-front-end.md`.
