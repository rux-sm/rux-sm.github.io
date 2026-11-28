---
type: plan
---

# Plan: Full screen or a window

## Goal

Every game opens the same way, full screen or in a window, chosen once in
Emu with one switch beside Sound in the wall's title row. Before Play, Emu
sets the chosen emulator's own setting to match, as it sets controllers, so
no emulator is set by hand. Today each emulator does its own thing: Dolphin,
PCSX2, Cemu and mGBA start full screen, DuckStation, Ryujinx and Gopher64 in
a window. Play's settings step is `emu/pads.js` `beforePlay`; Sound is
`emu/library.js`.

## Decisions

- **One switch, Carbon's icon button beside Sound,** pressed for full screen,
  with its tooltip, as Sound is, so the row keeps one look.
- **Emu writes the emulator's own start-full-screen setting before Play,**
  through Rux Emu Helper's settings write, as the controller types do, and
  never while the emulator runs.
- **Each emulator's setting is in `emu/emulators.json`:** its file, key and
  two values under `fullScreen`, which the helper writes before Play, for
  Dolphin, DuckStation, PCSX2, Cemu, Ryujinx, Gopher64, xemu and mGBA; or,
  for Mesen 2, melonDS and Azahar, which keep no such setting, the start
  options its launch adds, under `full` and `window`.
- **A game's own setting wins:** Dolphin's file for Four Swords keeps it in
  a window, where its Game Boy Advance screens open beside it, so Emu
  leaves a game's file alone.
- **One choice for the account, the same on every Mac,** kept with the
  account's settings; a Mac of its own can come later if it is wanted.
- **Full screen at first,** since a game is played on the whole screen.
- **Quitting stays the controller's + and −,** which works full screen too.

## Questions

None.

## Tasks

- [ ] Put Rux Emu Helper 47 on the games share, for Supabase and the other
      Macs; this Mac runs it.
- [ ] Play a Switch game with the switch on and off, since Ryujinx's
      setting is not yet proven by launching.
