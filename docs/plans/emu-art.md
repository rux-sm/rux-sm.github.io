---
type: plan
---

# Plan: Emu keeps its own box art

## Goal

Every cover Emu shows is a picture the home server holds, so a cover never
disappears because another site is down, and rux can add a cover no list
has. The covers themselves are `docs/plans/emu-front-end.md`, and how the
server keeps them `emu/docs/home-server.md`.

## Decisions

- **The page reads covers only from Supabase,** where the nightly scan puts
  them, because the page cannot reach the server quickly from inside the
  home and a phone has no helper; it asks libretro for nothing, and a game
  with no cover shows its title, as now.
- **One request says which games have a cover,** each by its bytes' SHA-1
  from `emu_files_now` under `art/`.
- **A cover's bytes are fetched as it comes into view and kept in the
  browser under their SHA-1,** because a signed address differs on every
  visit, so the browser's own cache would fetch every cover again.
- **Covers stay at the size libretro or rux gives them.**

## Questions

None.

## Tasks

- [ ] In `emu/data.js`, read which games have a cover and a cover's bytes,
  kept in the browser; in `emu/app.js`, draw a cover from them and remove
  the libretro addresses.
- [ ] Prove it in Chrome on :8641 once a real scan has put the covers in
  Supabase: every game libretro has shows its cover, Ice Climber among them,
  and a second visit fetches none again.
- [ ] Say where the page's covers come from in `emu/README.md`, and replace
  the box art decision in `docs/plans/emu-front-end.md`.
