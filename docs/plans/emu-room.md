---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library is a room that fills the page: Your Mac, holding what this Mac
has set up and downloaded. A panel opens on each side of it and closes to a
tab. On the left Rux's Server is every console and game the server
holds, borrowed by dragging it into the room; on the right Storage is what
belongs to the account playing, its saves and each console's controls.
Getting a game, setting up its console and playing it are one gesture each,
and the page is fun to use while staying plain. It is Emu's front page, `emu/index.html`,
drawn by `emu/room.js`; the rest of Emu is unchanged.

## Decisions

- **The room draws Your Mac and Rux's Server from the real games and
  this Mac;** a game or a console is dragged between them,
  a plug sets an emulator up, putting an unplugged console back takes it
  off, and a game opens its side panel when pressed.
- **Until a Mac's room is kept, the console of each game it holds stands in
  the room,** plugged in where this Mac has its emulator and unplugged where
  it has not, so a Mac with every emulator installed still starts with a
  handful.
- **The room fills the page, with a panel on each side that closes to a
  tab:** Rux's Server on the left and Storage on the right, so a drag is
  a short move sideways and the room is never scrolled away. The collection
  starts open and Storage closed, and each stays as it was last left,
  remembered in the browser. The page takes Design's wide frame, and in a
  window under 66rem the three stack, the room first. The menu is Carbon's rail on this page, a strip of
  icons, which Design's frame clears, and a line beside Your Mac says whether
  the helper runs and the server answers, opening Status.
- **Collection, Problems, Status, Saves and Emulators stay plain pages** in
  the menu, as now; only the Library is drawn as a room.
- **The left panel is headed Rux's Server,** so it is not mistaken for the
  Collection page in the menu.
- **Rux's Server is a panel of consoles over the picked console's
  games.** Each console is a tile with its drawing, name and count; pressing
  it shows its games and dragging it brings it into the room. While a console is in the
  room its tile stands outlined and faint, as the place it goes back to, and
  still shows its games when pressed. One whose emulator this Mac has shows
  a green light.
- **The picked console's games have a heading:** its name, its count, where
  it stands, such as "In your room, unplugged", and Bring to Your Mac while
  it is not in the room. The games are covers that wrap down the panel, A
  to Z; one this Mac has is dimmed with a tick, and can still be
  picked up. There is no All, because one console at a time is neater.
- **There is no Recently played,** because a Mac holds only a handful of
  games, and those are on its shelf or in Favourites.
- **Your Mac is a media wall as tall as the page.** In the middle the TV stands on a stand of cubbies, one per home console in the
  room and one ghost cubby to drop the next on, never fewer than three, so
  the stand is only as big as what it holds. Handhelds stand in a dock on the
  stand's top beside the TV, since they light their own screen. A bookcase on
  the right holds Favourites face out on its top shelf and this Mac's other
  games as spines below, A to Z. The floor is
  only ground, and how much room is free is in the heading. An empty room is
  three cubbies under the TV, the ghost one saying "Drag a console up here."
- **An empty cubby or dock spot names the console it waits for,** faintly,
  so where a console goes shows before it is brought.
- **The plug is a socket under its console, in its cubby,** with a target of
  at least 24px. Plugged in it is pushed in with a light beside it;
  unplugged its cable hangs loose, its socket blinks and it says "Plug in".
- **A console's face shows only what its next step needs:** the power
  button while its game runs, and the card light once it is unplugged. When
  that light turns green the console lifts a little out of its cubby, ready
  to carry back.
- **A console comes in unplugged, and plugging it in installs its
  emulator.**
- **An emulator comes off this Mac by putting its console away, one step at
  a time, with no question,** so no single press removes anything. The game
  comes out of the console, which stops it. The plug comes out, which only
  stands the console unplugged, its emulator still on this Mac. Its card
  light turns green once every card of its games is in storage, which the
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
  stored. Only which consoles stand in this Mac's room, and which of those
  are unplugged, is kept, since an unplugged Game Boy can stand beside a
  plugged-in Game Boy Color while mGBA stays installed. It is kept in
  Supabase, in the `room` column of the Mac's `emu_macs` row, as each
  console's name and whether it is plugged in, which that row's other writes
  leave alone. A Mac has that row once Status has saved it; until then the
  page says its room is not kept.
- **An emulator that plays several consoles readies them all.** Plugging in
  the Game Boy installs mGBA, so the Game Boy Color and Game Boy Advance show
  a green light in Rux's Server, and each arrives plugged in when dragged
  into the room; until then their games cannot be played from the room.
- **A game moves the same way:** onto Your Mac downloads it, `this-mac.js`'s
  Download; onto its console plays it, the helper's Play; straight from
  Rux's Server onto its console downloads and then plays. A home
  console's game dropped on the TV counts as dropped on its console. Dragged
  back anywhere on Rux's Server its cover leaves this Mac at once, with
  Undo, and its files go a few seconds later, so Undo downloads nothing;
  its saves stay, and there is no separate return area. Picking it up turns the collection to its console, so its own
  cover is there to light up.
- **A place means the same for everything:** in Rux's Server a thing is
  kept on the server and not on this Mac, in Storage it is the account's own,
  kept in Supabase, in the room it is on this Mac, and in or plugged into a
  console it is the one the next Play uses.
- **A memory card is one game's save,** drawn tucked into its game's cover
  and in its console's slot while the game is in. A game can have several,
  each with a name; only one is in at a time, since an emulator finds a save
  by a fixed name. A game's other cards are in Storage, so the room stays
  plain, unless the game is a favourite.
- **Storage follows the picked console and the game in it,** under a
  heading for each kind: that game's cards, and the console's own, such as
  a PS2's whole cards and its controls. It is headed with the console and
  its game, such as "SNES, Moon Tower", and with no console picked it lists
  each console in the room with what it keeps. Pressing a game opens its
  side panel and leaves Storage as it is, so one press does one thing. A thing is dragged from it onto its game or
  console to swap it in, and the one swapped out goes back to Storage.
- **A console's controls are an item in Storage for each controller,** named
  for the controller, such as "Pro Controller", since an emulator keeps a
  layout for each controller it has seen. They travel with the account, as
  `docs/plans/emu-emulator-profiles.md` carries them, so a layout set on one
  Mac is there on the next, and putting a console away carries them with its
  saves.
- **Storage calls a save what its console does:** a memory card, a
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
- **A game's side panel opens over Storage,** on the right, and closing it
  shows Storage as it was.
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
- **The TV shows a home console's game while it runs,** and a handheld
  lights its own screen.
- **A word follows what is held and says what letting go will do:**
  Download, Play, Download and play, Add to Favourites, Take off this Mac,
  Bring in, Put back, which names the emulator that will go, such as "Put
  back, and take mGBA off this Mac", or in red why not, such as "Doesn't fit
  the Game Boy" and "Plug it in first". The place it will land lights up. The word and the
  move come from one function, so they never disagree.
- **One line beside Your Mac's name says what a move did,** such as
  "Playing." or why the helper refused, with Undo where it can be taken back.
- **A game on this Mac whose console is not plugged in is dimmed,** its
  spine's label naming the console it needs, since a spine has no room for a
  tag.
- **A room of more than five cubbies is crowded:** the stand grows a second
  tier and the TV gets smaller, which holds all ten home consoles, and the
  dock takes handhelds on both sides of the TV. Past three shelves of spines
  the bookcase scrolls, its heading counting them all.
- **Favourites is a shelf you drag games onto,** from Rux's Server or
  the room, and off again back to Rux's Server; it is `emu_notes`'
  favourite mark. A favourite this Mac lacks is dimmed.
- **Favourites are what stays out.** A favourite's other cards stand
  beside its cover on the shelf and not in Storage, so the games played
  most swap a card in one drag. A card has no favourite mark of its own; it
  is out because its game is.
- **Picking up a game lights the consoles it fits and dims the rest,** so
  where it goes shows before it is dropped.
- **A game goes in as it would on the real console:** a cartridge drops into
  its slot, a disc slides onto a tray that opens and shuts, then the screen
  lights. A download fills its cover from the bottom as it comes.
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
  moves as buttons; pressing a console, in the room or the collection, picks
  it, and its heading has Bring to Your Mac or Put back; the plug is a
  button, Enter does on a keyboard, and on a controller A picks up and A
  puts down.
- **The consoles are Emu's own set, `emu/brand/consoles.svg`,** one drawing
  per system on the foot of one 3:2 box, which `room.js` puts into its page,
  since a drawing in another file draws nothing in Safari. Every fill is an
  `--emu-console-*` property that `app.css` sets from Design's tokens, so a
  console follows the theme, and a handheld's screen is its own property, to
  light while it plays.
- **The room is drawn as pixel art at one whole scale,** three CSS pixels to
  an art pixel on a laptop and two below about 1200px wide, never scaled in
  between, so its edges stay sharp. Each material has three shades mixed
  from one token, and colour is kept for state: green ready, amber busy or
  saves not safe yet, red no, blue where a drop lands. The day theme is a
  pale wall and warm wood; in the evening the room is dark and its lights
  light it, a playing TV glowing on the wall in its game's colour.
- **Carbon lays out everything around the room, and the art pixel
  everything inside it.** The frame, the headings, the status line, Rux's
  Server, Storage, type, tokens, motion curves and target sizes follow Carbon,
  and the room's outer box takes Carbon's spacing; inside that box sizes,
  gaps and moves are whole art pixels, since Carbon's 8px steps do not
  divide by three and a sprite between pixels blurs.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, the room and Storage are not
  shown,** and Rux's Server fills the page as the library to browse.
- **The room, the stand, the shelves and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The prototype is a private page with invented games,**
  claude.ai/artifact/929Ubm6MhbfpgRuFbaTphS, and is not part of the site;
  the media wall is sketched beside the two layouts not taken, empty and
  full, at claude.ai/artifact/FfeSnK1ff9Bg2x3Ap73CTv. Both show the
  collection below the room, not beside it.

## Questions

None open.

## Tasks

- [ ] Name an empty cubby or dock spot after the console it waits for.
- [ ] Update each Mac to Rux Emu Helper 35, which takes a carried save off
      a Mac to the Trash on `removeCarried`.
- [ ] Take a real card out and put it back from Storage, which no test
      against a stand-in proves of the database and the helper together.
- [ ] Move a card where a save is a folder under a title or disc ID, as on
      the 3DS, Wii U, Switch, Xbox, GameCube and Wii, once which files are
      one game's alone is proven; Storage lists those cards with no moves.
- [ ] Offer a game's other card from its side panel as a card, in place of
      the copy `carry.js` sets aside in this browser.
- [ ] Draw a game's card on its cover and in its console's slot, with
      pulling one out, dropping one in from Storage and the console's card
      light.
- [ ] List a console's controls in Storage, one for each controller, once
      `docs/plans/emu-emulator-profiles.md` carries them.
- [ ] Draw each console in pixels, as `emu/docs/drawing-consoles.md` says.
- [ ] Draw the rest of the room in pixel art: the TV 80×54 art pixels, a
      card 8×10, a plug or power button 8×8, and the furniture as 16×16
      tiles that grow.

- [ ] Move the emulator's removal from unplugging to putting the console
      back, the held word naming the emulator that goes, and have the plug
      refuse while the console's game runs, once the helper says which does.

- [ ] Give Rux Emu Helper a quit request the page can send, for the power
      button, and have it say which game runs, to light the TV or a
      handheld's screen.
- [ ] Pick up and put down a game or console with a controller's A.
- [ ] Lay it out on the phone as Rux's Server alone, and see the
      drawings in Safari.
