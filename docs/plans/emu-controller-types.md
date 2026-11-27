---
type: plan
---

# Plan: Controller types

## Goal

A game is played with the controller it was made for, chosen in one place:
a Controller type dropdown at the top of the controller tile, listing only
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
- **One dropdown, Carbon's inline Dropdown, in the controller tile's head,**
  as the console picker is, shown only where the console has more than one
  type; the game's menu loses Play with Game Boy Advances, so there is one
  way to choose.
- **The first type in a console's list is its default,** GameCube controller
  and Wii Remote with Nunchuk, the setup Dolphin has now, so no game changes
  until a type is chosen for it.
- **Each console's types are in `emu/emulators.json`,** beside its emulator,
  each with its name, its photo and how the emulator is told, so the
  dropdown, the Buttons window and Play read one list.
- **The choice is kept in `emu_notes` as one text column, `controller`,**
  holding the type's id, in place of the `gba` switch; Four Swords keeps its
  Game Boy Advances. The change is SQL shown to rux first.
- **Dolphin is told in its file for the game, `GameSettings/<disc ID>.ini`,**
  which it reads over its own, as the Game Boy Advances are now: a GameCube
  type sets each player's port, `SIDevice0` to `SIDevice3`; a Wii type
  names a controller profile Emu writes in `Config/Profiles/Wiimote/`, with
  its extension and its buttons, by `WiimoteProfile1` to `4`. A game left
  on its default has no such lines, so Dolphin's own setup applies.
- **Each type has its buttons and its photo,** as the Game Boy Advance has:
  a layout in `emu/pads.js`, Emu's by label on Nintendo pads as the others
  are, and a public-domain or freely licensed photo credited under the map.

## Questions

- **Which GameCube types besides the controller and the Game Boy
  Advance?** Dolphin also offers DK Bongos (Donkey Konga, Jungle Beat), a
  steering wheel and a keyboard, each played from a controller. Recommended:
  add the bongos only where a game here needs them, and leave the wheel and
  keyboard out.
- **Which Wii types?** Recommended: Wii Remote alone (held sideways), Wii
  Remote with Nunchuk, Classic Controller, and GameCube controller, the four
  Wii games are made for; the Balance Board left out.
- **Which consoles next?** The others with more than one controller are
  the Wii U (GamePad, Pro Controller, Wii Remotes) and the Switch (Pro
  Controller, two Joy-Con, handheld) where it changes how a game plays; the
  PlayStation (analog or digital), the N64 (which pak is plugged in) and
  light guns and mice on the NES, SNES and PlayStation, which few games
  need. Recommended: the Wii U and Switch next, each its own plan.

## Tasks

- [ ] Prove in Dolphin, by launching a game, each port number the GameCube
      types use and that `WiimoteProfile1` in a game's file loads a
      profile with its extension, and record them in
      `emu/docs/controller-settings.md`.
- [ ] Add each type to `emu/emulators.json` for the GameCube and the Wii.
- [ ] Apply the `emu_notes.controller` change, Four Swords on Game Boy
      Advance, and drop `gba`, once rux has seen the SQL.
- [ ] Generalise Play's Game Boy Advance step in `emu/pads.js` to every
      type: ports for the GameCube, a profile for the Wii, the game's file
      left with no such lines on its default.
- [ ] Give each new type its layout, its reader and writer lines, and its
      photo with its credit.
- [ ] Put the Controller type dropdown in the controller tile and take Play
      with Game Boy Advances out of the game's menu.
- [ ] Play Four Swords on Game Boy Advances, then on GameCube controllers,
      and Super Mario Galaxy with the Nunchuk and then the Classic
      Controller, and see each in the game and in the Buttons window.
