---
type: plan
---

# Plan: Each controller keeps its player

## Goal

A controller is the same player in every game on every console, whatever
order the controllers are turned on: rux picks its player once, and Emu
makes the emulator agree before each game starts. Each controller already
keeps its player with the account, chosen in its map; what is left is the
emulators following it. The tile and map are `emu/library.js`; what they
read and write is `emu/pads.js` and `emu/docs/controller-settings.md`.

## Decisions

- **The emulator is made to agree just before a game starts,** as Gopher64's
  path already is, and only the emulator about to run is touched.
- **Moving a controller to another player keeps its buttons:** Emu swaps the
  two players' settings in the emulator's file, rather than writing its
  layout afresh, so buttons changed one by one stay.
- **Cemu, Ryujinx, xemu, Dolphin and Gopher64 bind a player to a controller,**
  so their binding is swapped only when it differs from the kept player.
- **PCSX2 and DuckStation bind a player to `SDL-N`, SDL's place for a
  controller,** so before a game each player's `SDL-N` is pointed at its
  controller's place in Rux Emu Helper's report.

## Questions

None.

## Tasks

- [ ] Before a game, swap the players in Cemu, Ryujinx, xemu, Dolphin and
      Gopher64 where the binding differs from the kept player.
- [ ] Before a game, point PCSX2's and DuckStation's `SDL-N` at each kept
      player's controller.
- [ ] Find which order Mesen 2 counts controllers in, Apple's or SDL's, and
      have the helper report it; then point its ports the same way.
- [ ] Prove each emulator with two controllers turned on in both orders, the
      player read back from its file after the game starts.
- [ ] Replace the "turn the controllers on in player order" sentence in
      `emu/docs/controller-settings.md`.
