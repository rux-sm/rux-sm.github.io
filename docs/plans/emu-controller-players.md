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

## Questions

None.

## Tasks

- [ ] Look up PCSX2's and DuckStation's controller binding for a way to name
      the controller instead of `SDL-N`; DuckStation's log gives each a
      persistent identifier, its SDL GUID and serial, which may be one. One
      that has it follows the kept player like the others and needs no step.
- [ ] Play a two-player game in each kind of emulator with both controllers
      to see the players in the game itself.
