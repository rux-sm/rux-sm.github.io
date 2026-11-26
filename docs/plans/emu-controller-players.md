---
type: plan
---

# Plan: Each controller keeps its player, and shows the console's own buttons

## Goal

A controller is the same player in every game on every console, whatever
order the controllers are turned on: rux picks its player once, and Emu
makes the emulator agree before each game starts. The controller tile asks
an empty player to press a button to join. The Buttons map shows a photo of
the console's own controller, and a press on rux's controller lights the button
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
- **The console's own controller is a photo of the real one,** from Wikimedia
  Commons, kept in `emu/brand/originals/` named for its system and shrunk to
  1200px wide. All but one are Evan-Amos's, in the public domain; the Wii U
  GamePad is Mariofan13's, CC BY-SA 4.0, credited under the map.
- **One photo per console, 14 in all:** the Game Boy and Game Boy Color share
  one. The Wii is its Remote with its Nunchuk, the Xbox its Controller S.
- **Each button is a spot laid over the photo,** an SVG shape at the button's
  place, named as the console names it, the names `LAYOUTS` and the
  emulators' maps already use, so it lights from the map the emulator really
  has, not from Emu's layout. The spots for each photo are a list in
  `emu/pads.js`.
- **A lit spot is a ring and a fill in the interactive colour** over Carbon's
  fast-01, 110ms, so it shows on a grey, black or purple controller, and a
  line under the photo says what it is: "Your A is B on the Super Nintendo."

## Questions

- **Keep the drawing of rux's controller under the console's photo?** It
  labels every button at once; the photo answers one press at a time.
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
- [ ] Fetch the 14 photos into `emu/brand/originals/` and place each one's
      button spots in `emu/pads.js`.
- [ ] Put the console's photo in the Buttons map, lit on each press, with
      the line naming the button and the Wii U photo's credit.
- [ ] Replace the "turn the controllers on in player order" sentence in
      `emu/docs/controller-settings.md`, and the tile's in `emu/README.md`.
