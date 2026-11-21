---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library is one tile at the top of the page, in the shell every Emu
page has, as wide as the page's frame: its head, then the room, Your Mac, the play surface for what is in use now,
with a single CRT TV, every console set up on this Mac and their favourite games, each
standing wherever it is left. One primary button in the head, Rux's
Server, opens the store: a modal of every console and game the server
holds, each with Download. The tile's foot, mirroring its head, has a
button for each drawer of what this Mac and the account keep: Games,
Saves and Controllers, each opening up over the room's foot. Getting a game, setting up its console and playing it are
one press or one drag each, and the page is fun to use
while staying plain. It is Emu's front page, `emu/index.html`, drawn by
`emu/room.js`; the rest of Emu is unchanged.

## Decisions

- **The room holds only the TV, the consoles set up on this Mac and their
  favourite games.** It is the tile's own surface, layer-01, with no wall,
  floor, furniture or shelves, so there is nothing to read but what this
  Mac has.
- **The TV is a CRT in pixel art, `emu/brand/consoles/tv.png`, which starts
  in the middle of the room and is dragged anywhere like a console, and its
  glass shows only the game,** a home console's cover once it has started,
  and is dark otherwise, so it is never a notification log.
- **Every Emu page stands in the scheduler's frame,** Design's wide frame
  at 82rem, 1312px centred, with the pages' menu behind the header's
  button, so nothing in the shell moves from page to page or from app to
  app. A list or a table fills the frame and a paragraph keeps 42rem.
- **The room's tile fills the frame,** under the menu button and the
  account, and is as tall as the window leaves under the header and the
  page's padding, never under 28rem, so the page does not scroll. It starts
  at the top of the page, as every page's content does.
- **The room tile's head is the room's name, the strip and Rux's Server,**
  a primary button at its end, on the md size token's height over a rule,
  in by the theme's toolbar inset as the scheduler's heads are, its name in
  heading-compact-02, as the scheduler's week name is. In a narrow window
  the room's name gives way first.
- **The shell keeps the pages' menu and Search, as on every page,** since
  Carbon's shell is the same throughout a product. The TV's menu holds what
  is the room's alone, Sound and Tidy up.
- **The strip is the room's one communication surface.** At rest it is
  Carbon's icon indicators, only what it is for: Connected while Rux Emu
  Helper answers, its version in its tooltip, or "Update the helper",
  opening Status, where Supabase holds a newer one; this Mac's free space,
  a caution under 10 GB, or a failure where a current helper keeps no
  library; and "Needs sync", opening Status, only once Update has not saved
  for 30 days, read again when the page comes back. No drive is named,
  since games come from this Mac's library or the server. In a window under 66rem it is
  one indicator, the first caution, or Ready. While a room action is
  underway it names that one action in their place: setting up an emulator,
  downloading a game, getting a game ready to play or playing a
  home-console game. A download may show its progress; setup names the
  emulator but has no made-up percentage. The newest action replaces the
  previous one, and completion settles back to rest after a short
  acknowledgement.
- **The strip says what a room move did and offers its Undo.** A status region
  announces the same change to assistive technology. Errors that say where to
  act stay at their source: a wrong console speaks beside that console, a
  game-panel action stays in its panel and Update stays on Status.
- **A console has two places.** In Rux's Server it is not on this Mac. In
  the room it is set up on this Mac, ready to play, and it stays there until
  Remove in its menu takes its emulator off and sends it back to Rux's
  Server. There is no putting one away.
- **A console that is set up brings its favourite games out with it.** They
  hop out of it and land around it, covers 20 art pixels tall: the
  favourites of its system that this Mac holds, A to Z, twelve shared among
  the consoles and at most 8 each, so the floor holds about twelve. A cover
  is a thing on the floor like any other: it stays where it landed or was
  left, is carried with weight, and is dropped on its console to play. Any
  other game is dragged from Games.
- **The whole room is for the TV, the consoles and the covers,** each a
  thing on the floor standing where it was last left, its top-left corner in
  art pixels from the room's, dragged to move it. A console just set up
  stands in the first clear spot clear of the TV. Each one's spot is kept
  with this Mac's room, in the `room` column of its `emu_macs` row. An empty
  room says faintly "Download a console from Rux's Server."
- **A smaller window sweeps the room's things into a pile, and they stay
  there.** Its edges push in whatever is past them, and whatever then
  overlaps takes the nearest free spot, so things end up touching but not
  overlapping while the room can hold them; the thing just dropped holds
  still and the others make room. The swept spots are kept, so a larger
  window leaves the pile as it is, and things are put back by hand.
- **Rux's Server is Carbon's medium modal, a store,** about as wide as the
  room on a large window, so browsing the whole
  server never squeezes the room. Its close, Escape or the scrim closes it,
  and it opens again on the tab and console it was left on. The account is
  the header's round button, so nothing else stands around the room.
- **The tile's foot mirrors its head:** the md size token's height over a
  rule, in by the theme's inset, with a ghost button for each drawer from
  its start, Games, Saves and Controllers, each with a chevron that turns
  down while its drawer is open. Any other view of what this Mac or the account keeps joins
  them as a button.
- **A drawer opens up from its button, floating over the room's foot,** 8px
  in from its edges, raised with Carbon's raised shadow, unfolding on
  Carbon's moderate-02, one at a time. It floats rather than pushing the
  room up, so opening it never sweeps the room's things, and a drag from it
  into the room is a short move up. Its button pressed again, or Escape,
  closes it; another button turns it to that drawer. All start closed each
  time the page loads, so the room shows whole.
- **Games is one row that scrolls sideways, so it fits any width,** of this
  Mac's games. An empty row says faintly where to get one.
- **A console downloaded from the store comes into the room's first clear
  spot and is set up where it stands,** its light blinking; where setup
  fails it goes back to Rux's Server. Its card says "In your room" once it
  is set up.
- **Collection, Problems, Status, Saves and Emulators stay plain pages** in
  the menu, as now; only the Library is drawn as a room.
- **The store is headed Rux's Server,** so it is not mistaken for the
  Collection page in the menu.
- **The store has two tabs, Consoles and Games,** Carbon's contained tabs
  at full width. Each item is a card in a grid: a console's drawing, name
  and count, or a game's cover, name and console, then one button. Download
  where this Mac lacks it; a disabled "On this Mac" with a tick where it
  has it. Pressing a console's card, off its button, turns to Games with
  that console chosen.
- **Download on a console sets up its emulator; on a game it downloads the
  game,** the same `this-mac.js` and helper calls a drag makes today, and
  a game's button shows its progress while the strip names it. Where the
  chosen console is not set up, the count beside the selects adds
  "Download sets up the SNES too", and a game's Download sets it up first.
- **Games has a Console select and a Sort select over the grid:** Console
  starts on the first console with games, and Sort is A to Z or Favourites
  first, since a game row keeps no date it was added. The count of games
  shown sits beside them.
- **The games row lists every game on this Mac,** favourites first, then the rest A to
  Z, as covers that are dragged onto a console to play. A favourite is
  `emu_notes`' favourite mark, and one this Mac lacks is dimmed. A game whose
  console is not out is dimmed, its title naming the console it needs.
  There is no Recently played, because a Mac holds only a handful of games.
- **Saves follows the picked console and the game in it,** or the first
  console out in the room where this Mac does not play the picked one, under a heading
  for each kind: that game's cards, and the console's own, such as a PS2's
  whole cards. It is headed with the console and its game,
  such as "SNES, Moon Tower", and with no console picked it lists each
  console in the room with what it keeps. A thing is dragged from it onto its
  game or console to swap it in, and the one swapped out goes back to Saves.
- **A game's side panel opens on the right,** over the room, and closing it
  shows the room as it was. Pressing a game opens its side panel and leaves
  the drawer as it is, so one press does one thing.
- **The room draws Your Mac, its drawers and Rux's Server from the real games
  and this Mac;** a game is dragged from Games onto its console, and opens
  its side panel when pressed.
- **A room never kept stands each set-up console in its first clear spot.**
- **A console has its own menu,** opened under it by pressing or
  right-clicking it, so no control is drawn on the room: "Remove mGBA from
  this Mac", or what it is busy with.
- **A console's power light is on its drawing,** over the drawing's own
  light pixel, in the real console's colour: glowing softly while it is set
  up, flashing on and off while its emulator is set up or removed, with no
  tag, since the strip says how far it has got.
- **A console's name shows only under the pointer or the keyboard,** as a
  tag beneath it, so the room at rest is only its drawings.
- **A console in the room, or the TV, is itself carried, never a copy of
  it,** so it feels like a thing with weight: it lifts two art pixels off
  the floor over a longer shadow, follows the pointer a little behind, the
  TV further behind since it is heavier, leans the way it goes, and lands
  where it is put down. Let go outside the room it slides back.
- **Each thing on the floor throws a hard shadow two art pixels down and
  slides to a spot it is pushed to.** Things the window pushes into one
  another clack.
- **One wire runs from the console that is playing to the TV,** while its
  game's cover is on the glass or while it is being set up, so which
  console is on the TV shows; it runs out from the console as it plugs in. A
  handheld lights its own screen and has none.
- **The TV behaves as a CRT:** scanlines on its glass, its picture opening
  from a line as a game's cover comes on and closing to a dot as it goes. A
  home console's game shows its cover on the glass once it has started,
  until the page is looked at again, since the helper does not say when a
  game ends. A minute with the glass dark and nothing touched, the mark
  drifts around it until the pointer or a key moves.
- **Tidy up, in the TV's menu, lays the TV in the middle of the
  room and the consoles in rows under it,** with Undo on the strip, since a
  swept pile stays until it is put back.
- **Removing an emulator is three steps, and the strip asks before it goes.**
  Remove in the console's menu has the strip ask "Remove mGBA from this Mac? Your saves are kept." with
  Remove and Keep. Remove keeps its saves and settings in Supabase,
  `R.carry.remove`, checks both are held, and only then has the helper move
  the emulator to the Trash; the console goes back to Rux's Server, and
  every console that played in it leaves the room with it. Where keeping fails
  nothing is removed and the strip says why.
- **Setting up is the helper's install,** made ready with the settings this
  Mac kept, so an emulator comes back as it was; the light blinks while the
  install's request is waiting, since it reports no progress.
- **Whether an emulator is installed, and so which consoles stand in the
  room, is read live from the helper,** never stored. Only where each thing
  in the room stands is kept. It is kept in
  Supabase, in the `room` column of the Mac's `emu_macs` row, which that
  row's other writes leave alone. A Mac has that row once Status has saved
  it; until then the strip says its room is not kept.
- **An emulator that plays several consoles readies them all.** Setting up
  the Game Boy installs mGBA, so the Game Boy Color and Game Boy Advance
  stand in the room too, and removing mGBA takes all three.
- **A game on this Mac is played by dragging it from Games onto its
  console,** the helper's Play; a home console's game dropped on the TV
  counts as dropped on its console. Remove from this Mac, in its side
  panel, takes it off; its saves stay.
- **A place means the same for everything:** in Rux's Server a thing is
  kept on the server and not on this Mac, in Games it is on
  this Mac, in Saves it is the account's own, kept in Supabase, in the room
  a console is set up on this Mac and a cover is out to play with, and in a
  console a thing is the one the next Play uses.
- **A memory card is one game's save,** drawn tucked into its game's cover
  and in its console's slot while the game is in. A game can have several,
  each with a name; only one is in at a time, since an emulator finds a save
  by a fixed name. A game's other cards are in Saves.
- **Controllers, a drawer from the foot, is each controller this Mac sees,**
  a card with Carbon's game-console glyph, its name as its maker gives it and
  whether it is connected, read from Chrome's Gamepad API, which shows a
  controller only once a button on it is pressed, so an empty drawer says to
  press one. Until the profiles carry them it says its button layouts stay
  on each Mac. Each controller's layouts for each console then show on its
  card, named for the controller, such as "Pro Controller", since an emulator keeps a
  layout for each controller it has seen. They travel with the account, as
  `docs/plans/emu-emulator-profiles.md` carries them, so a layout set on one
  Mac is there on the next, and removing a console carries them with its
  saves.
- **Saves calls a save what its console does:** a memory card, a
  cartridge's save or save data, a word each system has in
  `emu/emulators.json`.
- **A card's name, and which of a game's cards is in, is a row in
  Supabase,** in `emu_cards`, since a file's copies carry no name. A
  card out of its game keeps its files under `cards/`, so the copies dropped
  from a save never take a card's bytes.
- **A card is every carried file of its game,** its save and its save
  states, swapped as one, so a game never plays files from two cards.
- **A card taken out is marked so in Supabase,** its path's newest copy
  holding no bytes, and a carry takes it off any Mac whose copy Supabase
  already keeps, so it is not carried back up from another Mac.
- **A game's save states ride with its card,** since a card is one
  playthrough and a state loaded into another would be saved over it;
  swapping a card swaps its states. Where the card is a console's whole
  card, as on the PS2 and the GameCube, states stay with the game.
- **Pulling a game's card out starts a new save:** Play with no card in
  finds no save, the emulator makes one, and at quit it is a new card.
  Dropping another card onto the game swaps it in.
- **A card is a copy Supabase already keeps,** the ones `carry.js` sets
  aside, given a name; swapping is the helper moving the save's files while
  the emulator is closed, and no card is ever deleted by a move. Where one
  real card holds many games' saves, as on the PS2 and the GameCube, the
  card is that whole card and belongs to its console.
- **A word follows what is held and says what letting go will do:**
  Play, Download and play, or in red why not, such as
  "Doesn't fit the Game Boy". A console moved in the room has no word,
  since the drag shows it. The place it will land lights up where it is one
  thing, such as a console, never the whole room or a drawer. The word and
  the move come from one function, so they never disagree.
- **Picking up a game lights the consoles it fits and dims the rest,** so
  where it goes shows before it is dropped.
- **A game goes in as it would on the real console:** a cartridge drops into
  its slot, a disc slides onto a tray that opens and shuts, then the strip names
  it. A download fills its cover from the bottom as it comes.
- **Removing a console while its game runs stops the game first.** The
  helper quits an emulator only from the controller's + and − today, so the
  page needs a quit request from it.
- **The wrong console says no and does nothing:** it shakes its head, buzzes
  and says a short line, such as "Doesn't fit. Try the SNES.", and the game
  goes back.
- **Every move makes a small sound,** made in the browser with no sound
  files: a click to pick up, a thunk and rising tone to set up, a chime
  when a download finishes, a start-up jingle to play, a buzz for no. A
  button in the header turns them off, remembered in the browser.
- **Every move works without dragging:** pressing a game opens its side
  panel, `game-panel.js`, with its details, saves and notes and the same
  moves as buttons; a console's menu opens
  from the keyboard as from the pointer, Tidy up is a menu item, Enter does on a keyboard, and on a controller A picks up and A
  puts down.
- **The consoles are Emu's own set, `emu/brand/consoles/`,** one pixel
  drawing per system, a PNG in Sprites' palette on the standard shapes
  `emu/docs/drawing-consoles.md` sets. The room shows each as it is drawn,
  in the same colours in every theme, so a saved drawing shows on the next
  load.
- **The consoles and the TV are drawn as pixel art at one whole scale,**
  three CSS pixels to an art pixel where the TV takes at most half the
  room's width, else two, never scaled in between, so their edges stay
  sharp. Colour is kept for state: green ready, amber busy or saves not safe
  yet, red no, blue where a drop lands. The TV lights only while it has
  something to say.
- **Carbon lays out everything around the room, and the art pixel
  everything inside it.** The frame, the tiles' heads, the strip, the store, the drawers, type,
  tokens, motion curves and target sizes follow Carbon; inside the room
  sizes, gaps and moves are whole art pixels, since Carbon's 8px steps do not
  divide by three and a sprite between pixels blurs.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, the room's tile and its drawers
  are not shown,** and the store fills the page as the library to browse,
  with no Download buttons.
- **The room, the TV, the store's cards and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The earlier prototypes show a furnished room and are superseded:**
  claude.ai/artifact/929Ubm6MhbfpgRuFbaTphS, a room seen from above with a
  stand of cubbies, and claude.ai/artifact/FfeSnK1ff9Bg2x3Ap73CTv, seen side
  on. Neither shows the room's tile, the store or the drawers.

## Questions

- Besides Games, Saves and Controllers, what else should the foot open,
  such as favourites or time played?

## Tasks

- [ ] Give Rux Emu Helper a call that says whether the home server answers,
      and show it on the strip beside the collection.
- [ ] Update each Mac to Rux Emu Helper 35, which takes a carried save off
      a Mac to the Trash on `removeCarried`.
- [ ] Move a card where a save is a folder under a title or disc ID, as on
      the 3DS, Wii U, Switch, Xbox, GameCube and Wii, once which files are
      one game's alone is proven; Saves lists those cards with no moves.
- [ ] Offer a game's other card from its side panel as a card, in place of
      the copy `carry.js` sets aside in this browser.
- [ ] Draw a game's card on its cover and in its console's slot, with
      pulling one out, dropping one in from Saves and the console's card
      light.
- [ ] Show each controller's layouts for each console on its card in
      Controllers, once `docs/plans/emu-emulator-profiles.md` carries them.
- [ ] Draw a card in pixel art.
- [ ] Have removing a console stop its game first, once the helper says
      which runs.
- [ ] Give Rux Emu Helper a quit request the page can send, and have it say
      which game runs so the strip can name active play and a handheld can light
      its own screen.
- [ ] Pick up and put down a game or console with a controller's A.
- [ ] Lay it out on the phone as Rux's Server alone, and see the
      drawings in Safari.
- [ ] With no console picked, list each console in the room in Saves with
      what it keeps, in place of asking for a console to be pressed.
