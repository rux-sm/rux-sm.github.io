---
type: plan
---

# Plan: Controller types

## Goal

A game is played with the controller it was made for, chosen in one place:
a Controller type dropdown in a controller's Buttons window, listing only
what the chosen console's emulator offers, such as GameCube controller or
Game Boy Advance on the GameCube, and Wii Remote with Nunchuk or Classic
Controller on the Wii. The choice is kept with the game, Emu sets the
emulator up for it before Play, and the Buttons window shows that
controller's photo and buttons. It starts with the GameCube and the Wii,
both Dolphin; Play with Game Boy Advances, in a GameCube game's menu, is
`emu/library.js` and `emu/pads.js` today, and becomes one of the types.

## Decisions

- **The type belongs to the game, not the player,** because it is the game
  that needs it: Four Swords wants a Game Boy Advance for every player,
  Donkey Konga bongos. Every player of that game gets it.
- **One dropdown, Carbon's inline Dropdown, in the Buttons window a player's
  box opens,** shown only where the console has more than one type, so the
  tiles keep their rows; the game's menu loses Play with Game Boy Advances,
  so there is one way to choose.
- **The first type in a console's list is its default,** GameCube controller
  and Wii Remote with Nunchuk, the setup Dolphin has now, so no game changes
  until a type is chosen for it.
- **Each console's types are in `emu/emulators.json`,** beside its emulator,
  each with its name, its photo and how the emulator is told, so the
  dropdown, the Buttons window and Play read one list.
- **The choice is kept in `emu_notes` as one text column, `controller`,**
  holding the type's id, none on the console's own controller.
- **Dolphin is told in its file for the game, `GameSettings/<disc ID>.ini`,**
  which it reads over its own, as the Game Boy Advances are now: a GameCube
  type sets each player's port, `SIDevice0` to `SIDevice3`; a Wii type
  names a controller profile Emu writes in `Config/Profiles/Wiimote/`, with
  its extension and its buttons, by `WiimoteProfile1` to `4`. A game left
  on its default has no such lines, so Dolphin's own setup applies.
- **Only the types the games here need, or that many games offer:** on the
  GameCube, the controller and the Game Boy Advance, for Four Swords; on the
  Wii, the Wii Remote with Nunchuk, the Wii Remote alone held sideways, the
  Classic Controller and the GameCube controller. Bongos, wheels, keyboards
  and the Balance Board are left out.
- **The Wii's GameCube controller turns the game's Wii Remotes off,**
  `WiimoteSource0` to `3` at 0 in its file, so only the GameCube ports,
  which Dolphin keeps on, reach the game.
- **A real Wii Remote is not a type:** it is Dolphin's own setting, Real
  Wii Remote, paired over Bluetooth or through a DolphinBar, and plays any
  Wii game as the console's own controller does.
- **The Wii U and the Switch, the other consoles where the type changes how
  a game plays, get plans of their own** once this is built.
- **Each type has its buttons and its photo,** as the Game Boy Advance has:
  a layout in `emu/pads.js`, Emu's by label on Nintendo pads as the others
  are, and a public-domain or freely licensed photo credited under the map.

## Questions

None.

## Tasks

- [ ] Play Four Swords on Game Boy Advances, then on GameCube controllers,
      and Super Mario Galaxy with the Nunchuk, the Remote sideways and the
      GameCube controller, and a Classic Controller game, and see each in
      the game and in the Buttons window.
