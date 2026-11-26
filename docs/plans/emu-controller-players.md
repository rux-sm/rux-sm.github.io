---
type: plan
---

# Plan: Each controller keeps its player, and shows the console's own buttons

## Goal

A controller is the same player in every game on every console, whatever
order the controllers are turned on: rux picks its player once, and Emu
makes the emulator agree before each game starts. The controller tile asks
an empty player to press a button to join. The Buttons map shows the
console's own controller, and a press on rux's controller lights the button
it is on that console. The tile and map are `emu/library.js`; what they read
and write is `emu/pads.js` and `emu/docs/controller-settings.md`.

## Decisions

- **A controller's player is kept with the account** in its `emu_controllers`
  row's `details`, beside its name and model, so it is the same on every Mac.
  The map's Player picker sets it, for every console at once.
- **Two of the same model are told apart only by the order they connect,**
  since Chrome and SDL give both the same maker, product and GUID.
- **An empty player box says "Press a button to join".** A press from a
  controller with no player gives it the first empty box; a press from one
  with a player lights its box, so rux can see which controller is which.
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
- **The console's own controller is drawn as an SVG in `emu/pads.js`,** in the
  map's line style and its tokens, because each button must light on its
  own; a pixel drawing at the Library's size is too small for that.
- **One drawing per console, 13 in all:** the Game Boy and Game Boy Color
  share one, and the PlayStation and PS2 share the DualShock. The Wii is its
  Remote beside its Nunchuk, the Xbox its Controller S.
- **Each button in a drawing is named as the console names it,** the names
  `LAYOUTS` and the emulators' maps already use, so it lights from the map the
  emulator really has, not from Emu's layout.
- **A lit button fills with the interactive colour** over Carbon's fast-01,
  110ms, and a line under the drawing says what it is: "Your A is B on the
  Super Nintendo."

## Questions

- **Keep the drawing of rux's controller under the console's?** It labels
  every button at once; the console's drawing answers one press at a time.
  Keeping both is the default.

## Tasks

- [ ] Keep each controller's player in `emu_controllers.details`, set from
      the map's Player picker, and place controllers in the tile by it.
- [ ] Show "Press a button to join" in each empty box; a press joins an
      unplaced controller or lights a placed one's box.
- [ ] Before a game, swap the players in Cemu, Ryujinx, xemu, Dolphin and
      Gopher64 where the binding differs from the kept player.
- [ ] Before a game, point PCSX2's and DuckStation's `SDL-N` at each kept
      player's controller.
- [ ] Find which order Mesen 2 counts controllers in, Apple's or SDL's, and
      have the helper report it; then point its ports the same way.
- [ ] Prove each emulator with two controllers turned on in both orders, the
      player read back from its file after the game starts.
- [ ] Draw the 13 consoles' controllers in `emu/pads.js`, each button a group
      named for it.
- [ ] Put the console's drawing in the Buttons map, lit on each press, with
      the line naming the button.
- [ ] Replace the "turn the controllers on in player order" sentence in
      `emu/docs/controller-settings.md`, and the tile's in `emu/README.md`.
