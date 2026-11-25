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
- **Set up opens Gopher64 at its controller settings,** since it binds each
  player to a device number of this Mac's that only it can choose.
- **Rux Emu Helper reports each connected controller's SDL 2 and SDL 3 GUIDs,**
  because Cemu, Ryujinx, xemu, mGBA and Azahar name a controller by its full
  GUID and Chrome gives only its maker and product. It reads them through the
  SDL an installed emulator ships, Ryujinx's SDL 2 and DuckStation's or
  xemu's SDL 3, so they are what the emulators see, in a short-lived process
  of its own that closes SDL cleanly, and only when Set up asks.

## Questions

None.

## Tasks

- [ ] Build Rux Emu Helper 37 onto the games share, for Supabase and the other
      Macs; the MacBook Pro already runs it.
- [ ] Change a single button by choosing it on the map and pressing it, the
      writers taking a layout in place of Emu's fixed one.
- [ ] Check Set up on every console in Chrome on :8641 with the 8BitDo and
      the Xbox controller, the emulators closed.
