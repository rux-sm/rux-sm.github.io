---
type: plan
---

# Plan: Set up a controller from the Library

## Goal

A controller is set up for a console from its map in the Library, with no
emulator opened: rux picks the player, presses Set up, and Emu writes that
emulator's own controller settings so the controller plays as that player
with Emu's layout. A single button can then be changed on the map by
choosing it and pressing the controller's button. What the map reads is
`emu/pads.js` and `emu/docs/controller-settings.md`; the tile is
`docs/plans/emu-library.md`.

## Decisions

- **Emu writes the emulator's own file through Rux Emu Helper's existing
  `POST /mac/setting`,** after reading it with `/mac/setting`, changing only
  the player's lines and keeping the rest, so nothing the emulator keeps
  besides is lost.
- **A file is written only while its emulator is closed,** since Ryujinx and
  Cemu rewrite theirs when they quit; the map says to quit it first.
- **Every write is undoable:** the file as it was is kept in Supabase as the
  emulator's settings already are, and the map offers Undo until it closes.
- **The layout is Emu's: by label on a Nintendo pad for Nintendo consoles,
  by position on every other pad and console,** as rux chose for the 8BitDo.
- **Each emulator gets a writer beside its reader in `emu/pads.js`,** the
  reader's numbering run backwards, so one list of numbers serves both.
- **Setting a single button listens for the next press, as Learn does,** and
  writes it in the emulator's own numbering.
- **Rux Emu Helper reports each connected controller's SDL 2 and SDL 3 GUIDs,**
  because Cemu, Ryujinx, xemu, mGBA and Azahar name a controller by its full
  GUID and Chrome gives only its maker and product. It reads them as each SDL
  makes them without opening the controller, with SDL's Switch driver off,
  since opening an 8BitDo through that driver left Chrome unable to see it
  until it was turned off and on.

## Questions

- Gopher64 binds each player to a device number that only it can choose.
  Leave Gopher64 to its own settings, or open it at its controller screen?

## Tasks

- [ ] Give Rux Emu Helper a call that lists each connected controller with
      its SDL 2 and SDL 3 GUIDs, and bump its version.
- [ ] Write each emulator's writer, Mesen 2 first, and test each against a
      copy of its file in the scratchpad before any real write.
- [ ] Add the player choice, Set up and Undo to the controller map.
- [ ] Change a single button by choosing it on the map and pressing it.
- [ ] Check every console in Chrome on :8641 with the 8BitDo and the Xbox
      controller, the emulators closed.
