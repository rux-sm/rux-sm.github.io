---
type: plan
---

# Plan: Emu's Library

## Goal

The Library, Emu's front page, is one tile: every
console down the side and the chosen console's games beside them as a wall
of covers, with the chosen game over them: its screenshot and facts, its save,
its controller and Play. The wall's title row holds the strip, Installed or All games and Sound.
It opens on the game last played. Choose a console and its games fill the
wall, press a game and it stands over the wall, press Play. A game this Mac lacks stands in the same wall,
faded, so there is no separate store. It is `emu/index.html`, drawn by
`emu/library.js`; the rest of Emu is unchanged.

## Decisions

The page:

- **Every Emu page stands in the scheduler's frame,** Design's wide frame at
  82rem, with the pages' menu and Search in the shell, so nothing in the shell
  moves from page to page.
- **The tile fills the frame,** as tall as the window leaves and never under
  28rem, so the page does not scroll; only the wall does.
- **The wall's title row is the wordmark, the strip, then Installed or All
  games and Sound,** an icon button, and stays put while the wall scrolls. Installed shows only the games
  this Mac holds or is fetching, and only their consoles; it is off while this
  Mac holds none. The page opens on Installed where the last played game is
  here.
- **The wall's title is the chosen console's wordmark,** or its name.
- **The strip is in the title row,** saying only what
  is wrong at rest, and what a move is doing or did.
- **There is no TV and no room to arrange,** because the games are what is
  looked through.
- **The consoles are pixel art at one CSS pixel to an art pixel,** never
  stretched, and Carbon lays out everything else.
- **Motion follows Carbon's curves,** and every move makes its small sound.
- **A controller moves over the consoles and the covers,** A to choose and then
  to play, B to close what is open.
- **Every move works without dragging,** and a game dropped on its console
  plays, as an extra; the word under the pointer says what letting go will do.

The consoles:

- **The consoles are a list down the side,** in the collection's order, each
  its drawing and its name, scrolling on their own where they do not fit.
  Under 42rem they are a row over the wall, scrolling sideways.
- **There is no taking out and no putting away,** because playing a game
  never needed it.
- **One console is chosen, always,** on Carbon's selected layer in the list.
  The wall, the chosen game and Search all follow that one choice, so they never
  disagree.
- **A console not set up is faded,** as a game not on
  this Mac is, so away looks the same everywhere. Its games still fill the
  wall, and Download on one sets its console up first.
- **A console's menu is a right click on it,** which chooses it: Set up, or
  Remove. So no control is drawn on a console.
- **Removing asks first and names every console that goes,** such as "Remove
  Mesen 2? The NES and SNES go too. Your saves are kept.", since one emulator
  plays several. Its saves and settings are kept in Supabase and checked
  before the helper moves it to the Trash.
- **Setting up is the helper's install,** made ready with the settings this Mac
  kept. The console's power light blinks while it is set up or removed, and is
  lit while it is set up.
- **Which consoles are set up is read live from the helper,** never stored.

The wall:

- **The wall is the chosen console's games,** as covers all in that console's box
  shape with no name under them, six across for wide covers and eight for tall: those on
  this Mac first, favourites leading, then the server's, faded, each A to Z.
- **There is no switch to this Mac's games alone,** since they come first in
  full colour and Collection lists only them.
- **The chosen game is raised off the wall,** a little larger over a deep
  shadow, with no ring.
- **A cover with no art shows its name,** and one arriving sits under a veil
  that lifts as it comes.

The chosen game, over the wall and still while it scrolls:

- **It is a screenshot of the game beside its name, when it was last played, its
  region and its size, over Save and Controller, and under them all a row
  of one button and About this copy, as Carbon starts an in-page form's
  buttons with the primary, and Remove from this Mac at the row's end,** so
  what will play and with what shows before Play is pressed, and changing
  nothing keeps Play one press. The screenshot is libretro's, a moment in
  play, else the title screen, else an empty screen, so the box shows only in
  the wall; it is faded where this Mac lacks the game.
- **Favourite and Finished are icons beside the name,** each saved as it
  changes; Played is the date Play keeps. rux's note is written in the
  phone's panel.
- **Remove from this Mac shows only where any of the game is here.**
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
- **What is wrong is said beside Play before it is pressed,** such as "Two saves found", and never stops Play.
- **Save and Controller each open a short list down over the wall,** one at a
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

- **It shows once a controller is seen,** by Chrome's Gamepad API, which shows
  one only once a button on it is pressed.
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

- **About this copy opens the panel on a Mac:** the game's problems, its saves,
  a converted game's mark that its originals can go, and its region, format,
  list name and fingerprints in one fold, open.
- **On the phone a game opens the whole panel:** its saves, rux's marks and
  note, and that fold, shut.

- **Without the helper, as on the phone, the page is the consoles and the
  wall alone, with no strip, switch, Sound or chosen game,** with no Save, Controller, Play or Download, and a game pressed opens
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
