---
type: plan
---

# Plan: Gopher64 as Emu's N64 emulator

## Goal

Every N64 game plays in Gopher64 in place of ares, started by Play, set up
by Set up this Mac, fullscreen with the settings rux chose, quit by the
controller's + and −, and its saves carried through Supabase like every
other emulator's. The rest of Emu's emulators are
`docs/plans/emu-emulator-profiles.md`.

## Decisions

- **Gopher64 plays the `n64` system,** since it renders up to 8× where ares
  stops at 4×, and its CPU overclock removes slowdown.
- **Its installer is the notarized Mac build from its GitHub releases,**
  kept in Supabase as every installer is and followed by its `github` feed,
  `gopher64/gopher64`.
- **The helper starts it by opening the game with the app, as the Finder
  does,** since Gopher64 runs in Apple's app sandbox and refuses a game
  handed to it as an argument; a system's launch in `emulators.json` says
  so.
- **Its folder is inside its sandbox,**
  `~/Library/Containers/io.github.gopher64.gopher64/Data/Library/Application Support/gopher64`,
  holding `config.json`, `saves` and `states`. macOS asks once on each Mac
  whether the helper may read another app's data, and the helper's lasting
  signature keeps that answer.
- **The settings Emu manages are rux's:** 4× resolution, fullscreen, V-sync,
  integer scaling and the CPU overclock, written into `config.json`. The
  controller profile is the Mac's own, kept with its settings.
- **Its saves carry as a folder of their own in Supabase, `saves/n64-gopher64`,**
  since Gopher64 names each by the game's header name and the SHA-256 of
  its file, as `ZELDA MAJORAS MASK-<sha256>.fla`, where ares names them by
  file name; the scan adds an N64 game's SHA-256 so the Saves page matches
  them to their games.
- **ares's saves carry on, converted to Gopher64's names,** Majora's Mask
  and Ocarina of Time among them; Gopher64's own copies of those two are
  put in Supabase first, so they stay among the copies kept. Super Smash
  Bros. has a save in Gopher64 alone, which carries on as it is.
- **ares is retired once Gopher64 is proven:** moved to the retired apps in
  `emulators.json`, removed from the Macs, and its folder in Supabase kept.

## Questions

None open.

## Tasks

- [ ] Put Gopher64's installer in Supabase through the share's
  `emulators` folder and Update.
- [ ] Have the helper open a game with its emulator where its launch says
  so, and prove Play starts Majora's Mask in Gopher64.
- [ ] Make the controller combo quit Gopher64, which runs each game in a
  second process that ignored a quit request in a test, and prove the
  save is written.
- [ ] Describe Gopher64 in `emulators.json`: its folder, its managed
  settings, its carried `saves` and `states`, and `n64` played by it.
- [ ] Add the SHA-256 of each N64 game to the scan and match Gopher64's
  saves by it.
- [ ] Put Gopher64's own Majora's Mask and Ocarina of Time saves in
  Supabase, then convert ares's saves to Gopher64's names, and prove a
  converted save loads in Gopher64.
- [ ] Retire ares from `emulators.json` and the MacBook Pro.
- [ ] Rewrite the N64 lines of `emu/docs/emulator-setup.md`.
