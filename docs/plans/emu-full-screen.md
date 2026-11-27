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
- **Each emulator's setting is in `emu/emulators.json`,** its file, its key
  and its two values, so Play reads one list:
  - Dolphin: `Config/Dolphin.ini`, `[Display] Fullscreen = True`
  - DuckStation: `settings.ini`, `[Main] StartFullscreen = true`
  - PCSX2: `inis/PCSX2.ini`, `[UI] StartFullscreen = true`
  - Cemu: `settings.xml`, `<fullscreen>true</fullscreen>`
  - Ryujinx: `Config.json`, `"start_fullscreen": true`
  - Gopher64: `config.json`, `"fullscreen": true`
  - mGBA: `config.ini`, `fullscreen=1`
  - Mesen 2, melonDS, Azahar and xemu: found by launching each.
- **A game's own setting wins:** Dolphin's file for Four Swords keeps it in
  a window, where its Game Boy Advance screens open beside it, so Emu
  leaves a game's file alone.
- **Quitting stays the controller's + and −,** which works full screen too.

## Questions

- **One choice for the account, or one for each Mac?** A Mac on a TV may
  want full screen where a laptop wants a window. Recommended: one for the
  account, the same on every Mac, kept with the account's settings; a Mac
  can be added later if it is ever wanted.
- **On or off at first?** Recommended: on, full screen, since a game is
  played on the whole screen.

## Tasks

- [ ] Find and prove Mesen 2's, melonDS's, Azahar's and xemu's
      start-full-screen settings by launching each, and prove the seven
      known ones the same way.
- [ ] Add each emulator's setting to `emu/emulators.json`.
- [ ] Keep the choice with the account.
- [ ] Put the full screen switch beside Sound.
- [ ] Have Play write the emulator's setting for the choice.
- [ ] Play one game in each emulator with the switch on and off.
