---
type: plan
---

# Plan: The controller manager

## Goal

The four player boxes in the Library are the whole controller manager. rux
sets each controller's player once; Emu makes every emulator follow it, or,
where it cannot, gives one plain step at Play. Each box says Ready or Needs a
fix, with one Fix it button. What is built so far, the kept player, Press a
button to join, the light on a press, the photo map and the emulators that
name a controller following it, is in `emu/README.md` and
`emu/docs/controller-settings.md`; the tile and map are `emu/library.js`, the
reading and writing `emu/pads.js`.

## Decisions

- **Each box shows one word for the chosen console:** Ready, when the
  emulator has that controller set up as that player, or Needs a fix, with
  the reason in a short line, never an emulator's own terms.
- **Fix it sets the emulator up now,** for the kept player with the buttons
  the controller already has, as `beforePlay` does, so nothing waits for a
  game.
- **Play checks first:** a connected controller not set up for the console
  stops Play with the same Needs a fix and Fix it, and Play anyway.
- **Mesen 2, PCSX2 and DuckStation get one step at Play** when two or more
  controllers are on: every controller after player 1's is turned off before
  the game opens and on again, in player order, once it has, because these
  emulators number a controller that connects while they run after the ones
  they found at start, as all three did with both controllers. The step names
  each controller: "Turn off the Xbox controller. Turn it on again once the
  game opens."
- **Emu cannot see the order those emulators chose,** so the step is shown
  every time, not only when the order is wrong.
- **DuckStation names a controller after all, and leaves the step:** with
  `[InputSources] SDLUsePersistentDeviceIdentifiers`, on by default, a binding
  may name `SDL-<SDL 3 GUID>-<serial>` instead of `SDL-N`, so Emu writes that
  and DuckStation follows the kept player like Cemu. Rux Emu Helper reports
  each controller's serial, from SDL 3, beside its GUID.
- **PCSX2 has no such binding,** only `SDL-N`, so it keeps the step with
  Mesen 2.

## Questions

None.

## Tasks

- [ ] Have Rux Emu Helper report each controller's SDL 3 serial, and build
      and install that helper.
- [ ] Write DuckStation's bindings with the persistent identifier, move it
      out of the emulators that count by place, and prove it with both
      controllers turned on in both orders.
- [ ] Play a two-player game in each kind of emulator with both controllers
      to see the players in the game itself.
