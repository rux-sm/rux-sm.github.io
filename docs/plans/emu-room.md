---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library is a room that fills the page: Your Mac, holding the consoles
this Mac has set up. It is the page itself with a single CRT TV, and the
TV and the consoles stand wherever they are left. Two buttons at the foot open a drawer on each side: Server on the left
is every console and game the server holds, borrowed by dragging it into the
room; My Stuff on the right is what is yours, the games on this Mac and the
saves the account keeps. Getting a game, setting up its console and playing
it are one gesture each, and the page is fun to use while staying plain. It
is Emu's front page, `emu/index.html`, drawn by `emu/room.js`; the rest of
Emu is unchanged.

## Decisions

- **The room holds only the TV and the consoles.** It is the page's own
  background, with no fill, wall, floor, furniture, shelves or heading, so
  there is nothing to read but what this Mac has.
- **The TV is a CRT in pixel art, `emu/brand/consoles/tv.png`, which starts
  at the top in the middle and is dragged anywhere like a console, and it is
  the room's one communication surface,** its words on its glass, not a pretend game screen or a notification
  log. At rest it shows only this Mac's name and its free space, and says so
  when the helper or the server does not answer, opening Status. While a room
  action is underway it names that one action: setting up an emulator,
  downloading a game, getting a game ready to play or playing a home-console
  game. A download may show its progress; setup names the emulator but has
  no made-up percentage. The newest action replaces the previous one, and
  completion settles back to rest after a short acknowledgement.
- **The TV says what a room move did and offers its Undo.** A status region
  announces the same change to assistive technology. Errors that say where to
  act stay at their source: a wrong console speaks beside that console, a
  game-panel action stays in its panel and Update stays on Status.
- **The whole room is for the TV and the consoles in the room,** each a
  thing on the floor standing where it was last left, its top-left corner in
  art pixels from the room's, dragged to move it. One brought in stands
  where it was let go, and one brought without a drag in the first clear
  spot clear of the TV. Each one's spot is kept with this Mac's room, in the
  `room` column of its `emu_macs` row. An empty room says faintly "Drag a
  console here from Server."
- **A smaller window sweeps the room's things into a pile, and they stay
  there.** Its edges push in whatever is past them, and whatever then
  overlaps takes the nearest free spot, so things end up touching but not
  overlapping while the room can hold them; the thing just dropped holds
  still and the others make room. The swept spots are kept, so a larger
  window leaves the pile as it is, and things are put back by hand.
- **Two solid buttons at the foot of the page, Server and My Stuff, each open
  their drawer,** on Design's foot bar, `frame-bar` in
  `design/css/rux-frame.css`. A drawer slides over its side of the room and
  the rest stays in view, so a drag out of it lands a short move away.
  Pressing its button again, or Escape, closes it, and a closed drawer leaves
  nothing behind. Both start closed each time the page loads, so the room
  shows whole. The menu is behind the header's button at every
  width, and the account is the header's round button, so nothing else
  stands around the room.
- **Collection, Problems, Status, Saves and Emulators stay plain pages** in
  the menu, as now; only the Library is drawn as a room.
- **The left drawer is headed Rux's Server,** so it is not mistaken for the
  Collection page in the menu.
- **Rux's Server is a panel of consoles over the picked console's
  games.** Each console is a tile with its drawing, name and count; pressing
  it shows its games and dragging it brings it into the room. While a console
  is in the room its tile stands outlined and faint, as the place it goes back
  to, and still shows its games when pressed. One whose emulator this Mac has
  shows a green light.
- **The picked console's games have a heading:** its name, its count, where
  it stands, such as "In your room, unplugged", and Bring to Your Mac while
  it is not in the room. The games are covers that wrap down the panel, A
  to Z; one this Mac has is dimmed with a tick, and can still be
  picked up. There is no All, because one console at a time is neater.
- **My Stuff has two tabs, Games and Saves,** so the room needs no separate
  Saves button.
- **Games lists every game on this Mac,** favourites first, then the rest A to
  Z, as covers that are dragged onto a console to play. A favourite is
  `emu_notes`' favourite mark, and one this Mac lacks is dimmed. A game whose
  console is not plugged in is dimmed, its title naming the console it needs.
  There is no Recently played, because a Mac holds only a handful of games.
- **Saves follows the picked console and the game in it,** under a heading
  for each kind: that game's cards, and the console's own, such as a PS2's
  whole cards and its controls. It is headed with the console and its game,
  such as "SNES, Moon Tower", and with no console picked it lists each
  console in the room with what it keeps. A thing is dragged from it onto its
  game or console to swap it in, and the one swapped out goes back to Saves.
- **A game's side panel opens over My Stuff,** on the right, and closing it
  shows My Stuff as it was. Pressing a game opens its side panel and leaves
  My Stuff as it is, so one press does one thing.
- **The room draws Your Mac and Rux's Server from the real games and
  this Mac;** a game or a console is dragged between them,
  a plug sets an emulator up, putting an unplugged console back takes it
  off, and a game opens its side panel when pressed.
- **Until a Mac's room is kept, the console of each game it holds stands in
  the room,** plugged in where this Mac has its emulator and unplugged where
  it has not, so a Mac with every emulator installed still starts with a
  handful.
- **The plug is a socket beside its console,** with a target of at least
  24px. Plugged in it is pushed in with a light beside it; unplugged its
  cable hangs loose, its socket blinks and it says "Plug in".
- **A console's face shows only what its next step needs:** the power
  button while its game runs, and the card light once it is unplugged. When
  that light turns green the console lifts a little, ready to carry back.
- **A console comes in unplugged, and plugging it in installs its
  emulator.**
- **An emulator comes off this Mac by putting its console away, one step at
  a time, with no question,** so no single press removes anything. The game
  comes out of the console, which stops it. The plug comes out, which only
  stands the console unplugged, its emulator still on this Mac. Its card
  light turns green once every card of its games is in Saves, which the
  page carries there itself. Dragging it back to its place in Rux's
  Server is the last step, and takes the emulator off once no other
  console in the room uses it. Each step refuses until the one before is
  done, with "Take the game out first.", "Unplug me first." or "Still
  keeping your saves.", and plugging back in before the last step changes
  nothing.
- **Plugging in is the helper's install, putting back is `R.carry.remove`,**
  which carries the saves and keeps the settings in Supabase before the
  emulator goes to the Trash; the light blinks while the install's request is
  waiting, since it reports no progress. Bringing the console back and
  plugging it in restores this Mac's kept settings, so it comes back as it
  was.
- **Whether an emulator is installed is read live from the helper,** never
  stored. Only which consoles stand in this Mac's room, where each stands and
  which are unplugged, is kept, since an unplugged Game Boy can stand beside
  a plugged-in Game Boy Color while mGBA stays installed. It is kept in
  Supabase, in the `room` column of the Mac's `emu_macs` row, which that
  row's other writes leave alone. A Mac has that row once Status has saved
  it; until then the TV says its room is not kept.
- **An emulator that plays several consoles readies them all.** Plugging in
  the Game Boy installs mGBA, so the Game Boy Color and Game Boy Advance show
  a green light in Rux's Server, and each arrives plugged in when dragged
  into the room; until then their games cannot be played from the room.
- **A game moves the same way:** onto My Stuff or the room's open space
  downloads it, `this-mac.js`'s Download, and it shows in Games; onto its
  console plays it, the helper's Play; straight from Rux's Server onto its
  console downloads and then plays. A home console's game dropped on the TV
  counts as dropped on its console. Dragged back anywhere on Rux's Server it
  leaves this Mac at once, with Undo, and its files go a few seconds later,
  so Undo downloads nothing; its saves stay, and there is no separate return
  area. Picking it up turns the collection to its console, so its own cover
  is there to light up.
- **A place means the same for everything:** in Rux's Server a thing is
  kept on the server and not on this Mac, in My Stuff's Games it is on this
  Mac, in its Saves it is the account's own, kept in Supabase, in the room a
  console is set up on this Mac, and in or plugged into a console a thing is
  the one the next Play uses.
- **A memory card is one game's save,** drawn tucked into its game's cover
  and in its console's slot while the game is in. A game can have several,
  each with a name; only one is in at a time, since an emulator finds a save
  by a fixed name. A game's other cards are in Saves.
- **A console's controls are an item in Saves for each controller,** named
  for the controller, such as "Pro Controller", since an emulator keeps a
  layout for each controller it has seen. They travel with the account, as
  `docs/plans/emu-emulator-profiles.md` carries them, so a layout set on one
  Mac is there on the next, and putting a console away carries them with its
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
  Download, Play, Download and play, Add to Favourites, Take off this Mac,
  Bring in, Put back, which names the emulator that will go, such as "Put
  back, and take mGBA off this Mac", or in red why not, such as "Doesn't fit
  the Game Boy" and "Plug it in first". A console moved in the room has no
  word, since the drag shows it. The place it will land lights up where it is
  one thing, such as a console or Rux's Server, never the whole room or My
  Stuff. The
  word and the move come from one function, so they never disagree.
- **Picking up a game lights the consoles it fits and dims the rest,** so
  where it goes shows before it is dropped.
- **A game goes in as it would on the real console:** a cartridge drops into
  its slot, a disc slides onto a tray that opens and shuts, then the TV names
  it. A download fills its cover from the bottom as it comes.
- **A console's power button is there while it plays,** lit;
  pressing it stops the game. The helper quits an emulator only from the
  controller's + and − today, so the page needs a quit request from it.
- **The wrong console says no and does nothing:** it shakes its head, buzzes
  and says a short line, such as "Doesn't fit. Try the SNES.", and the game
  goes back. An unplugged console says "Plug me in first."
- **Every move makes a small sound,** made in the browser with no sound
  files: a click to pick up, a thunk and rising tone to plug in, a chime
  when a download finishes, a start-up jingle to play, a buzz for no. A
  button in the header turns them off, remembered in the browser.
- **Every move works without dragging:** pressing a game opens its side
  panel, `game-panel.js`, with its details, saves and notes and the same
  moves as buttons; pressing a console, in the room or Rux's Server, picks
  it, and its heading has Bring to Your Mac or Put back; the plug is a
  button, Enter does on a keyboard, and on a controller A picks up and A
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
  everything inside it.** The frame, the foot bar, the drawers, type,
  tokens, motion curves and target sizes follow Carbon; inside the room
  sizes, gaps and moves are whole art pixels, since Carbon's 8px steps do not
  divide by three and a sprite between pixels blurs.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, the room and My Stuff are not
  shown,** and Rux's Server fills the page as the library to browse.
- **The room, the TV, the drawers and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The earlier prototypes show a furnished room and are superseded:**
  claude.ai/artifact/929Ubm6MhbfpgRuFbaTphS, a room seen from above with a
  stand of cubbies, and claude.ai/artifact/FfeSnK1ff9Bg2x3Ap73CTv, seen side
  on. Neither shows the solid room, the foot buttons or the drawers.

## Questions

None open.

## Tasks

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
- [ ] List a console's controls in Saves, one for each controller, once
      `docs/plans/emu-emulator-profiles.md` carries them.
- [ ] Draw a card and a plug or power button in pixel art.
- [ ] Move the emulator's removal from unplugging to putting the console
      back, the held word naming the emulator that goes, and have the plug
      refuse while the console's game runs, once the helper says which does.
- [ ] Give Rux Emu Helper a quit request the page can send, and have it say
      which game runs so the TV can name active play and a handheld can light
      its own screen.
- [ ] Pick up and put down a game or console with a controller's A.
- [ ] Lay it out on the phone as Rux's Server alone, and see the
      drawings in Safari.
- [ ] With no console picked, list each console in the room in Saves with
      what it keeps, in place of asking for a console to be pressed.
