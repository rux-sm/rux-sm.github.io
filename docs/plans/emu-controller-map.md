---
type: plan
---

# Plan: The controller map

## Goal

The controller tile in the Library names the controller that is connected and
says whether the chosen console has buttons set for it. Pressing the tile
opens a map of that controller: every physical button, labelled as it is
printed, with what it does on the chosen console, read from that console's
emulator. The tile itself is `docs/plans/emu-library.md`, and the helper is
`docs/plans/emu-helper.md`.

## Decisions

- **The map opens from the tile, as a passive Carbon modal over the page,**
  because at about 46rem wide it does not fit the 16rem tile, and the wall
  keeps its room.
- **The tile says the controller's name and one state, "Set up for SNES" or
  "Not set up for SNES",** with the emulator named under it.
- **The map draws the controller's own family,** a Pro-style pad, an Xbox
  pad or a PlayStation pad, from its vendor in Chrome's Gamepad API, each a
  plain line drawing of Emu's own under `emu/brand/`, every colour a
  `--rux-*` token.
- **Each physical control is labelled as printed, and beside it what it does
  on the console;** a control the console does not use is dashed and says
  "not used".
- **The helper reads each emulator's own controller settings and returns,
  per console, which physical control does what,** because the page cannot
  read files on the Mac. It turns each emulator's numbering into physical
  controls once: SDL 2 numbers a Pro Controller by label, SDL 3 and Apple's
  GameController by position.
- **"Set up" means the emulator's player 1 is bound to the connected
  controller,** matched by the vendor and product in its SDL GUID, or bound to
  "the first controller" where the emulator binds that way, as Mesen,
  melonDS, PCSX2, DuckStation and Gopher64 do.
- **Emu never changes buttons itself;** Change buttons opens the emulator, as
  the Library already decides.

## Questions

- An 8BitDo in Switch mode shows to Chrome as a Nintendo Pro Controller, so
  the tile cannot tell them apart. Should rux name a controller once, kept
  with the account and matched by its vendor and product, so the tile says
  "8BitDo Ultimate"?

## Tasks

- [ ] Write `emu/docs/controller-settings.md`: each emulator's controller
      file, its keys, how it numbers buttons and how it names a controller.
- [ ] Give Rux Emu Helper a call that returns each emulator's player 1
      controller and its map of physical controls, and bump its version.
- [ ] Draw the three controller families for the map.
- [ ] Show the name and the set-up state in the controller tile, once the
      tile the layout session is building is committed.
- [ ] Open the map from the tile.
- [ ] Remove the two controller tasks from `docs/plans/emu-library.md` that
      this plan replaces.
- [ ] Check the tile and the map in Chrome on :8641 with the 8BitDo and a
      stand-in helper, for SNES, N64, GameCube and PS2.
