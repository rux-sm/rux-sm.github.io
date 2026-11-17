---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library is one tile that fills the page, as the scheduler's board does:
its head, then the room, Your Mac, the play surface for what is in use now,
with a single CRT TV, up to three consoles and their favourite games, each
standing wherever it is left. A button at each end of the head opens a
drawer tile over that side of the room: Rux's Server on the left is every
console and game the server holds, borrowed by dragging it into the room; My
Room on the right is everything on this Mac, its consoles put away, its
games and the saves the account keeps. Getting a game, setting up its
console and playing it are one gesture each, and the page is fun to use
while staying plain. It is Emu's front page, `emu/index.html`, drawn by
`emu/room.js`; the rest of Emu is unchanged.

## Decisions

- **The room holds only the TV, the consoles that are out and their
  favourite games.** It is the tile's own surface, layer-01, with no wall,
  floor, furniture or shelves, so there is nothing to read but what this
  Mac has.
- **The TV is a CRT in pixel art, `emu/brand/consoles/tv.png`, which starts
  in the middle of the room and is dragged anywhere like a console, and its
  glass shows only the game,** a home console's cover once it has started,
  and is dark otherwise, so it is never a notification log.
- **The room tile's head is Rux's Server's toggle, the room's name, the
  strip, My Room's toggle and the room's ⋮ menu,** on the md size token's
  height over a rule, in by the theme's toolbar inset as the scheduler's
  heads are, its name in heading-compact-02, as the scheduler's week name
  is. Each toggle is Carbon's open-panel icon for its side, named by its
  tooltip, filled and selected while its drawer is open, and the menu holds
  Tidy up and Put everything away. In a narrow window the room's name gives
  way first.
- **The strip is the room's one communication surface.** At rest it is
  Carbon's icon indicators: the helper and its version, a caution opening
  Status where Supabase holds a newer one; the collection it found, a drive
  or the home server's share, quiet as "No drive" where this Mac keeps a
  library, and a caution where it has neither; this Mac's free space, a
  caution under 10 GB, or a caution where a current helper keeps no
  library; and when Update last saved, opening Status, a caution after 30
  days, read again when the page comes back. In a window under 66rem it is
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
- **A console has three places.** In Rux's Server it is not on this Mac. In
  My Room it is set up on this Mac and put away. In the room it is out,
  ready to play. Putting one away is harmless, and only taking it back to
  Rux's Server removes its emulator.
- **At most three consoles are out at once,** so the floor never fills. A
  fourth is refused as a wrong game is: it goes back and the strip says "Three
  is plenty. Put one away first."
- **A console that is out brings its favourite games out with it.** They
  hop out of it and land around it, covers 20 art pixels tall: the
  favourites of its system that this Mac holds, A to Z, 8 for one console
  out, 6 each for two and 4 each for three, so the floor holds about twelve.
  A cover is a thing on the floor like any other: it stays where it landed
  or was left, is carried with weight, and is dropped on its console to
  play. It goes back into My Room when its console is put away. Any other
  game is dragged from My Room.
- **The whole room is for the TV, the consoles and the covers,** each a
  thing on the floor standing where it was last left, its top-left corner in
  art pixels from the room's, dragged to move it. One brought in stands
  where it was let go, and one brought without a drag in the first clear
  spot clear of the TV. Each one's spot is kept with this Mac's room, in the
  `room` column of its `emu_macs` row. An empty room says faintly "Drag a
  console here from Rux's Server or My Room."
- **A smaller window sweeps the room's things into a pile, and they stay
  there.** Its edges push in whatever is past them, and whatever then
  overlaps takes the nearest free spot, so things end up touching but not
  overlapping while the room can hold them; the thing just dropped holds
  still and the others make room. The swept spots are kept, so a larger
  window leaves the pile as it is, and things are put back by hand.
- **Each drawer is a tile floating over its side of the room, under the
  head,** 22rem wide and 8px in from the room's edges, raised with Carbon's
  raised shadow, its own head its title and close, its title taking the
  focus as it opens, as Carbon's side panel's does, and the rest stays in
  view, so a drag out of it lands a short move away. It floats rather than
  standing beside the room, so opening one never narrows the room and
  sweeps its things. It unfolds from its side on Carbon's moderate-02.
  Pressing its button again, its close, or Escape closes it, and a closed
  drawer leaves nothing behind. Both start closed each time the page loads, so the room
  shows whole. The menu is behind the header's button at every
  width, and the account is the header's round button, so nothing else
  stands around the room.
- **Collection, Problems, Status, Saves and Emulators stay plain pages** in
  the menu, as now; only the Library is drawn as a room.
- **The left drawer is headed Rux's Server,** so it is not mistaken for the
  Collection page in the menu.
- **Rux's Server has two tabs, Consoles and the picked console's Games,**
  as My Room has its own. Each console is a tile with its drawing, name and
  count; pressing it turns to its games and dragging it brings it into the
  room, and a thing dragged back turns Rux's Server to its own tab. While a console
  is in the room its tile stands outlined and faint, as the place it goes back
  to, and still shows its games when pressed. One whose emulator this Mac has
  shows a green light.
- **The picked console's games have a heading:** its name, its count, where
  it stands, such as "In your room, off", and Bring to Your Mac while
  it is not in the room. The games are covers that wrap down the panel, A
  to Z; one this Mac has is dimmed with a tick, and can still be
  picked up. There is no All, because one console at a time is neater.
- **My Room has three tabs, Consoles, Games and Saves.** Consoles is each
  console set up on this Mac and put away, as a tile that is dragged into
  the room or pressed to bring it out.
- **Games lists every game on this Mac,** favourites first, then the rest A to
  Z, as covers that are dragged onto a console to play. A favourite is
  `emu_notes`' favourite mark, and one this Mac lacks is dimmed. A game whose
  console is not out is dimmed, its title naming the console it needs.
  There is no Recently played, because a Mac holds only a handful of games.
- **Saves follows the picked console and the game in it,** under a heading
  for each kind: that game's cards, and the console's own, such as a PS2's
  whole cards and its controls. It is headed with the console and its game,
  such as "SNES, Moon Tower", and with no console picked it lists each
  console in the room with what it keeps. A thing is dragged from it onto its
  game or console to swap it in, and the one swapped out goes back to Saves.
- **A game's side panel opens over My Room,** on the right, and closing it
  shows My Room as it was. Pressing a game opens its side panel and leaves
  My Room as it is, so one press does one thing.
- **The room draws Your Mac and Rux's Server from the real games and
  this Mac;** a game or a console is dragged between them, and a game opens
  its side panel when pressed.
- **A room never kept is empty,** its set-up consoles in My Room.
- **A console has its own menu,** opened under it by pressing or
  right-clicking it, so no control is drawn on the room. One that is set up
  has Put away and "Remove mGBA from this Mac"; one that is not has "Set up
  Game Boy Advance", named for the console, and Put back.
- **A console's power light is on its drawing,** over the drawing's own
  light pixel, in the real console's colour: glowing softly while it is set
  up, flashing on and off while its emulator is set up or removed, with no
  tag, since the strip says how far it has got, and unlit with the whole
  drawing dimmed until it is set up.
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
- **Tidy up, in the room's menu, lays the TV in the middle of the
  room and the consoles in rows under it,** with Undo on the strip, since a
  swept pile stays until it is put back.
- **Put everything away, under Tidy up in the room's menu, puts every console that is out
  away,** with Undo on the strip.
- **A console from Rux's Server that is not set up comes in unlit, and Set
  up in its menu installs its emulator.** One this Mac has comes out lit
  from either drawer.
- **Removing an emulator is three steps, and the strip asks before it goes.**
  Remove in the console's menu, or dragging the console onto Rux's Server,
  has the strip ask "Remove mGBA from this Mac? Your saves are kept." with
  Remove and Keep. Remove keeps its saves and settings in Supabase,
  `R.carry.remove`, checks both are held, and only then has the helper move
  the emulator to the Trash; the console goes back to Rux's Server, and
  every console that played in it leaves My Room. Where keeping fails
  nothing is removed and the strip says why.
- **Setting up is the helper's install,** made ready with the settings this
  Mac kept, so an emulator comes back as it was; the light blinks while the
  install's request is waiting, since it reports no progress.
- **Whether an emulator is installed is read live from the helper,** never
  stored. Only which consoles are out in this Mac's room, and where each
  thing in it stands, is kept. It is kept in
  Supabase, in the `room` column of the Mac's `emu_macs` row, which that
  row's other writes leave alone. A Mac has that row once Status has saved
  it; until then the strip says its room is not kept.
- **An emulator that plays several consoles readies them all.** Setting up
  the Game Boy installs mGBA, so the Game Boy Color and Game Boy Advance
  appear in My Room's Consoles, and removing mGBA takes all three.
- **A game moves the same way:** onto My Room or the room's open space
  downloads it, `this-mac.js`'s Download, and it shows in Games; onto its
  console plays it, the helper's Play; straight from Rux's Server onto its
  console downloads and then plays. A home console's game dropped on the TV
  counts as dropped on its console. Dragged back anywhere on Rux's Server it
  leaves this Mac at once, with Undo, and its files go a few seconds later,
  so Undo downloads nothing; its saves stay, and there is no separate return
  area. Picking it up turns the collection to its console, so its own cover
  is there to light up.
- **A place means the same for everything:** in Rux's Server a thing is
  kept on the server and not on this Mac, in My Room's Games it is on this
  Mac, in its Saves it is the account's own, kept in Supabase, in its Consoles it is set up and put away, in the
  room a thing is out to play with, and in a console a thing is the one the
  next Play uses.
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
  the Game Boy" and "Set it up first". A console moved in the room has no
  word, since the drag shows it. The place it will land lights up where it is
  one thing, such as a console or Rux's Server, never the whole room or My
  Room. The
  word and the move come from one function, so they never disagree.
- **Picking up a game lights the consoles it fits and dims the rest,** so
  where it goes shows before it is dropped.
- **A game goes in as it would on the real console:** a cartridge drops into
  its slot, a disc slides onto a tray that opens and shuts, then the strip names
  it. A download fills its cover from the bottom as it comes.
- **Putting a console away while its game runs stops the game first.** The
  helper quits an emulator only from the controller's + and − today, so the
  page needs a quit request from it.
- **The wrong console says no and does nothing:** it shakes its head, buzzes
  and says a short line, such as "Doesn't fit. Try the SNES.", and the game
  goes back. A console not set up says "Set me up first."
- **Every move makes a small sound,** made in the browser with no sound
  files: a click to pick up, a thunk and rising tone to set up, a chime
  when a download finishes, a start-up jingle to play, a buzz for no. A
  button in the header turns them off, remembered in the browser.
- **Every move works without dragging:** pressing a game opens its side
  panel, `game-panel.js`, with its details, saves and notes and the same
  moves as buttons; pressing a console, in the room or Rux's Server, picks
  it, and its heading has Bring to Your Mac, Put away or Put back; a console's menu opens
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
  everything inside it.** The frame, the tiles' heads, the strip, the drawers, type,
  tokens, motion curves and target sizes follow Carbon; inside the room
  sizes, gaps and moves are whole art pixels, since Carbon's 8px steps do not
  divide by three and a sprite between pixels blurs.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, the room's tile and My Room
  are not shown,** and Rux's Server fills the page as the library to browse.
- **The room, the TV, the drawers and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The earlier prototypes show a furnished room and are superseded:**
  claude.ai/artifact/929Ubm6MhbfpgRuFbaTphS, a room seen from above with a
  stand of cubbies, and claude.ai/artifact/FfeSnK1ff9Bg2x3Ap73CTv, seen side
  on. Neither shows the room's tile or the drawers.

## Questions

None open.

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
- [ ] List a console's controls in Saves, one for each controller, once
      `docs/plans/emu-emulator-profiles.md` carries them.
- [ ] Draw a card in pixel art.
- [ ] Have putting a console away stop its game first, once the helper says
      which runs.
- [ ] Give Rux Emu Helper a quit request the page can send, and have it say
      which game runs so the strip can name active play and a handheld can light
      its own screen.
- [ ] Pick up and put down a game or console with a controller's A.
- [ ] Lay it out on the phone as Rux's Server alone, and see the
      drawings in Safari.
- [ ] With no console picked, list each console in the room in Saves with
      what it keeps, in place of asking for a console to be pressed.
