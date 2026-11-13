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
  holding `config.json`, `saves` and `states`. macOS refuses the helper that
  folder without asking, so each Mac gives Rux Emu Helper Full Disk Access
  once, and its lasting signature keeps it.
- **Emu manages none of its settings,** since its window writes its own
  settings over `config.json` whenever it starts a game; rux's settings and
  controller profile carry as the preferred set, which a new Mac starts
  from.
- **Its game counts as playing, not its window,** since it runs each game
  in a second process, `gopher64-cli`, and its window stays open after.
- **The controller combo ends its game two seconds after asking,** since it
  ignores a quit request and writes a save one second after the game does.
- **Its saves carry in Supabase's `saves/n64/gopher64`,** since Gopher64
  names each by the game's header title and the SHA-256 of its file, as
  `ZELDA MAJORAS MASK-<sha256>.fla`; the Saves page matches them by the
  header title the scan already reads, and an ares save by its file name.
- **ares's saves carry on, converted to Gopher64's names,** Majora's Mask
  and Ocarina of Time among them; Gopher64's own copies of those two are
  put in Supabase first, so they stay among the copies kept. Super Smash
  Bros. has a save in Gopher64 alone, which carries on as it is.
- **ares is retired once Gopher64 is proven:** moved to the retired apps in
  `emulators.json`, removed from the Macs, and its folder in Supabase kept.

## Questions

None open.

## Tasks

- [ ] Prove a converted save loads: Majora's Mask's file screen in Gopher64
  shows the ares progress, and + and − end the game with the save kept.
- [ ] Move ares and its folder on the MacBook Pro to the Trash once a
  converted save has loaded.
- [ ] Set the iMac up with Gopher64 from nothing, as
  `docs/plans/emu-emulator-profiles.md` has it, which proves its folder
  made by a first Play.
