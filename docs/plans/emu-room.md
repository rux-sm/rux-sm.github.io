---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library, Emu's front page, is one tile: the room on its left, with the TV
and every console always in it, and the chosen console's games on its right,
a wall of covers. It opens on the game last played, with Play under the TV.
Press a console and its games fill the wall, press a game and it goes on the
TV, press Play. A game this Mac lacks stands in the same wall, faded, so there
is no separate store. It is `emu/index.html`, drawn by `emu/room.js`; the rest
of Emu is unchanged.

## Decisions

The page:

- **Every Emu page stands in the scheduler's frame,** Design's wide frame at
  82rem, with the pages' menu and Search in the shell, so nothing in the shell
  moves from page to page.
- **The room's tile fills the frame,** as tall as the window leaves and never
  under 28rem, so the page does not scroll; only the wall does.
- **The tile's head is the room's name and the strip,** and its foot a button
  for each drawer, Saves and Controllers, as now.
- **The room is the tile's left, 520px, and the games its right,** a rule
  between them, because the games are what is looked through.
- **Carbon lays out everything around the room and the art pixel everything
  inside it,** since a drawing between pixels blurs. The consoles are two CSS
  pixels to an art pixel and the TV four, whole scales never stretched.
- **Motion follows Carbon's curves,** and every move makes its small sound,
  which the TV's menu turns off.

The consoles:

- **Every console stands in the room always, in one fixed grid of five
  across,** in the collection's order, its drawing over its name, so all
  fifteen are in view and none moves.
- **There is no taking out and no putting away,** because playing a game
  never needed it.
- **One console is chosen, always,** on Carbon's selected layer. The wall, the
  TV, Saves and Search all follow that one choice, so they never disagree.
  Pressing the chosen console again does nothing.
- **A console not set up is faded with a download arrow,** as a game not on
  this Mac is, so away looks the same everywhere. Its games still fill the
  wall, and Download on one sets its console up first.
- **A console's menu is a button in the wall's head,** and a right click on the
  console: Download, or Remove. So no control is drawn on the room.
- **Removing asks first and names every console that goes,** such as "Remove
  Mesen 2? The NES and SNES go too. Your saves are kept.", since one emulator
  plays several. Its saves and settings are kept in Supabase and checked
  before the helper moves it to the Trash.
- **Setting up is the helper's install,** made ready with the settings this Mac
  kept. The console's power light blinks while it is set up or removed, and is
  lit while it is set up.
- **Which consoles are set up is read live from the helper,** never stored.

The wall:

- **The wall is the chosen console's games,** four across, as covers in their
  own shape with no name under them: those on this Mac first, favourites
  leading, then the server's, faded with a download arrow, each A to Z.
- **Its head is the console's name, how many are on this Mac and how many on
  the server,** and a switch, All or On this Mac, which starts on All.
- **A cover with no art shows its name,** and one arriving sits under a veil
  that lifts as it comes.

The TV:

- **The TV shows the chosen game's cover, whole, for every console,** handhelds
  too, with its name, when it was last played and one button under it.
- **The button is the one next move:** Play; Download with its size; how far a
  download has come; or why not, such as setting up. Details beside it opens
  the side panel.
- **The page opens on the game last played that this Mac holds,** from
  `emu_notes.played_at`, its console chosen; with none, the first console set
  up and its first game. Choosing a console shows its last played game, else
  its first.
- **Nothing about the room is kept,** since the last game played says what to
  open on.
- **Play is one thing, wherever it is pressed:** the cartridge drops into its
  console or the disc slides onto its tray, the jingle plays, the strip names
  it and the saves are carried. The panel's Play is the same one.
- **A game dropped on the TV or a console plays,** as an extra; the word under
  the pointer says what letting go will do. Every move works without dragging.
- **A minute with nothing touched, the TV shows the screensaver.**

The side panel:

- **The panel opens with Play, this game's saves and rux's notes;** its
  region, format, list name and fingerprints are one fold, shut, below them.

Saves and controllers:

- **A card is one game's save and its save states, swapped as one,** so a game
  never plays files from two cards. Only one is in at a time; the others are
  in Saves under their names, kept in `emu_cards`.
- **Taking a card out starts a new save at the next Play,** and no card is ever
  deleted by a move. A card out keeps its files under `cards/`.
- **A card taken out is marked so in Supabase,** its path's newest copy holding
  no bytes, so it is not carried back up from another Mac.
- **Where one real card holds many games' saves, as on the PS2 and GameCube,**
  it belongs to its console, and states stay with the game.
- **Saves calls a save what its console does,** a word each system has in
  `emu/emulators.json`.
- **Controllers is each controller this Mac sees,** by Chrome's Gamepad API; its
  layouts join it once `docs/plans/emu-emulator-profiles.md` carries them.

## Questions

- Should consoles not set up, now the PlayStation, PlayStation 2 and Xbox,
  always stand in the room faded? Recommended: yes, so there is no separate
  place to get one.
- Without the helper, as on the phone, should the page be the same consoles and
  wall with no Play or Download? Recommended: yes, the consoles on top as one
  row and the wall below, with no TV.

## Tasks

- [ ] Make one chosen console and one chosen game the page's whole state,
      opening on the game last played, with Saves and Search following it.
- [ ] Lay the room out: the TV, its button, the grid of consoles and the wall.
      Take out the console columns, taking out, putting away and their drag.
- [ ] Put the server's games in the wall and consoles not set up in the grid,
      with Download on both, and take out Rux's Server.
- [ ] Make Play one function, the room's, which the side panel calls too.
- [ ] Fold the side panel's facts below its saves and notes.
- [ ] Name every console that goes when an emulator is removed.
- [ ] Lay it out without the helper and on the phone, and see it in Safari.
- [ ] Take out the kept room: its calls in `emu/data.js`, then the `room` column
      of `emu_macs` as its own database step on rux's yes.
- [ ] Choose a console and a game with a controller, A to play and B back, from
      `emu/gamepad.js`, which nothing listens to.
- [ ] Give Rux Emu Helper a call that says whether the home server answers, and
      show it on the strip.
- [ ] Update each Mac to Rux Emu Helper 35 or later, which takes a carried save
      off a Mac to the Trash on `removeCarried`.
- [ ] Have Rux Emu Helper say which game runs and take a quit request, so the
      strip names active play and removing a console stops its game first.
- [ ] Move a card where a save is a folder under a title or disc ID, as on the
      3DS, Wii U, Switch, Xbox, GameCube and Wii, once which files are one
      game's alone is proven; Saves lists those cards with no moves.
- [ ] Offer a game's other card from its side panel as a card, in place of the
      copy `carry.js` sets aside in this browser.
- [ ] Draw a card in pixel art, and draw a game's card on its cover.
- [ ] Show each controller's layouts for each console on its card in
      Controllers, once the profiles carry them.
