---
type: plan
---

# Plan: Each controller keeps its player

## Goal

A controller is the same player in every game on every console, whatever
order the controllers are turned on: rux picks its player once, and Emu
makes the emulator agree before each game starts. Each controller already
keeps its player with the account, and the emulators that name a controller
follow it; what is left is Mesen 2, PCSX2 and DuckStation. The tile and map are `emu/library.js`; what they
read and write is `emu/pads.js` and `emu/docs/controller-settings.md`.

## Decisions

- **Mesen 2, PCSX2 and DuckStation cannot be pointed from outside by place:**
  Rux Emu Helper's SDL list put the two controllers in three different orders
  over six reads with nothing reconnected, so a place written before a game
  is a guess.

## Questions

- **Is Mesen 2's order, Apple's connect notifications at its start, steady
  where SDL's is not?** The helper already watches Apple's controllers and
  could report that order; if it is steady, Mesen can be pointed like the
  others.
- **Can PCSX2 or DuckStation bind a player to a controller by its GUID or
  name rather than `SDL-N`?** If neither can, they stay in their own order.

## Tasks

- [ ] Have Rux Emu Helper report Apple's controller order, read it several
      times with both controllers on, and decide Mesen 2 from that.
- [ ] Look up PCSX2's and DuckStation's controller binding for a way to name
      the controller, and decide them from that.
- [ ] Play a two-player game in Ryujinx or Cemu with both controllers to see
      the kept players in the game itself.
