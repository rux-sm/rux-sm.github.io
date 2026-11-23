---
type: plan
---

# Plan: Emu's Library

## Goal

The Library, Emu's front page, is one tile, read from the top down: a row of
every console, the chosen console's games as a wall of covers, and a bar with
the chosen game, its save, its controller and Play. It opens on the game last
played. Press a console and its games fill the wall, press a game and the bar
is that game's, press Play. A game this Mac lacks stands in the same wall,
faded, so there is no separate store. It is `emu/index.html`, drawn by
`emu/library.js`; the rest of Emu is unchanged.

## Decisions

The page:

- **Every Emu page stands in the scheduler's frame,** Design's wide frame at
  82rem, with the pages' menu and Search in the shell, so nothing in the shell
  moves from page to page.
- **The tile fills the frame,** as tall as the window leaves and never under
  28rem, so the page does not scroll; only the wall does.
- **The tile's head is the chosen console's wordmark, or its name,** which is the
  page's title, and at its end the strip, which says how this Mac stands and
  what a move is doing or did, and Sound, an icon button.
- **There is no TV and no room to arrange,** because the games are what is
  looked through.
- **The consoles are pixel art at two CSS pixels to an art pixel,** never
  stretched, and Carbon lays out everything else.
- **Motion follows Carbon's curves,** and every move makes its small sound.
- **A controller moves over the consoles and the covers,** A to choose and then
  to play, B to close what is open.
- **Every move works without dragging,** and a game dropped on its console
  plays, as an extra; the word under the pointer says what letting go will do.

The consoles:

- **Every console stands in the row always,** in the collection's order, its
  drawing with its name only in its title, since the tile's head names the
  chosen one, so all fifteen are in view at 1312px and none moves;
  a narrower window scrolls the row sideways to the chosen one.
- **There is no taking out and no putting away,** because playing a game
  never needed it.
- **One console is chosen, always,** on Carbon's selected layer. The wall, the
  bar and Search all follow that one choice, so they never disagree. Pressing
  the chosen console again does nothing.
- **A console not set up is faded with a download arrow,** as a game not on
  this Mac is, so away looks the same everywhere. Its games still fill the
  wall, and Download on one sets its console up first.
- **A console's menu is a right click on it:** Set up, or Remove. So no control
  is drawn on the row.
- **Removing asks first and names every console that goes,** such as "Remove
  Mesen 2? The NES and SNES go too. Your saves are kept.", since one emulator
  plays several. Its saves and settings are kept in Supabase and checked
  before the helper moves it to the Trash.
- **Setting up is the helper's install,** made ready with the settings this Mac
  kept. The console's power light blinks while it is set up or removed, and is
  lit while it is set up.
- **Which consoles are set up is read live from the helper,** never stored.

The wall:

- **The wall is the chosen console's games,** as covers in their own shape with
  no name under them, six across for wide covers and eight for tall: those on
  this Mac first, favourites leading, then the server's, faded with a download
  arrow, each A to Z.
- **There is no switch to this Mac's games alone,** since they come first in
  full colour and Collection lists only them.
- **The chosen game is raised off the wall,** a little larger over a deep
  shadow, with no ring.
- **A cover with no art shows its name,** and one arriving sits under a veil
  that lifts as it comes.

The bar, at the tile's foot:

- **It is the chosen game's:** its name and when it was last played, then Save,
  Controller, Details and one button, so what will play and with what shows
  before Play is pressed, and changing nothing keeps Play one press.
- **The button is the one next move:** Play; Download with its size; how far a
  download has come; or why not, such as setting up.
- **The page opens on the game last played that this Mac holds,** from
  `emu_notes.played_at`, its console chosen; with none, the first console set
  up and its first game. Choosing a console shows its last played game, else
  its first.
- **Nothing about the page is kept,** since the last game played says what to
  open on.
- **Play is one thing, wherever it is pressed:** the cartridge drops into its
  console or the disc slides onto its tray, the jingle plays, the strip names
  it and the saves are carried. The panel's Play is the same one.
- **What is wrong is said in the bar before Play,** such as "No controller" or
  "Two saves found", and never stops Play.
- **Save and Controller each open a short list up over the wall,** one at a
  time, and take the place of the Saves and Controllers drawers.

Save:

- **It says which card will play, its date and its save states,** from
  `R.carry.cardsFor`, or "New save" where the game has none.
- **Its list is the game's cards, each with its name to change, then Start a
  new save,** where a save's own name says whose it is, as on the NES, SNES,
  N64, Game Boy, Color, Advance, DS, PlayStation and PS2. On the other six it
  lists them with no moves, and one it cannot match to the game is what the
  scan knows of it, or "Kept in Dolphin", never called new.
- **A console's own saves, which name no game, are in the Saves page,** which
  the list links to.
- **A card is one game's save and its save states, swapped as one,** so a game
  never plays files from two cards. Only one is in at a time; the others keep
  their names in `emu_cards` and their files under `cards/`.
- **Starting a new save takes the card in out,** and no card is ever deleted by
  a move. A card taken out is marked so in Supabase, its path's newest copy
  holding no bytes, so it is not carried back up from another Mac.
- **Where one real card holds many games' saves, as on the PS2 and GameCube,**
  it belongs to its console, and states stay with the game.
- **Cards move only while the emulator is closed,** and the list says so while
  it is open.
- **A save is called what its console calls it,** a word each system has in
  `emu/emulators.json`.

Controller:

- **It says the controller connected,** by Chrome's Gamepad API, and "Press a
  button" until one is seen, since Chrome shows a controller only then.
- **It says whether that controller's buttons are set for the chosen console,**
  read by the helper from its emulator's own settings, which each emulator
  keeps in its own way, and says nothing for an emulator not yet read.
- **Change buttons opens the emulator,** because each already has an editor for
  them; Emu has none of its own.
- **Its list is each controller the emulator has buttons for;** picking another
  comes last, since it writes the emulator's settings.
- **Button layouts travel with the account** as
  `docs/plans/emu-emulator-profiles.md` carries them.

The side panel:

- **Details opens the panel: this game's saves and rux's notes, then Remove
  from this Mac;** its region, format, list name and fingerprints are one
  fold, shut, below them.

- **Without the helper, as on the phone, the page is the row and the wall
  alone,** with no Save, Controller, Play or Download, and a game pressed opens
  its panel.

## Questions

None.

## Tasks

- [ ] Drop the `room` column of `emu_macs`, which nothing reads, on rux's yes.
- [ ] See the Library in Safari.
- [ ] Give Rux Emu Helper a call that opens an emulator with no game, for
      Change buttons.
- [ ] Have the helper read which controller an emulator has buttons for, one
      emulator at a time, Dolphin first, whose `GCPadNew.ini` names it.
- [ ] Choose a controller from the list, once its layouts are carried.
- [ ] Give Rux Emu Helper a call that says whether the home server answers, and
      show it on the strip.
- [ ] Update each Mac to Rux Emu Helper 35 or later, which takes a carried save
      off a Mac to the Trash on `removeCarried`.
- [ ] Have Rux Emu Helper say which game runs and take a quit request, so the
      strip names active play and removing a console stops its game first.
- [ ] Move a card where a save is a folder under a title or disc ID, as on the
      3DS, Wii U, Switch, Xbox, GameCube and Wii, once which files are one
      game's alone is proven.
- [ ] Offer a game's other card in Save's list as a card, in place of the copy
      `carry.js` sets aside in this browser.
- [ ] Draw a card in pixel art, for Save's list.
