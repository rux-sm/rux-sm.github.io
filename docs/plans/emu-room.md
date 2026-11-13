---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library becomes two panels: Your Mac, a room holding what this Mac has
set up and downloaded, and below it Rux's Collection, every console and game
the collection holds. Things move between them by dragging, so getting a game,
setting up its console and playing it are one gesture each, and the page is
fun to use while staying plain. It replaces the front page that
`docs/plans/emu-front-end.md` describes; the rest of Emu is unchanged.

## Decisions

- **The room is built as its own page, `emu/room.html`, beside the
  Library,** which keeps working until the room takes its place; nothing
  links to the room until then. It draws Your Mac and Rux's Collection from
  the real games and this Mac; a game or a console is dragged between them,
  a plug sets an emulator up, putting an unplugged console back takes it
  off, and a game opens its side panel when pressed.
- **Until a Mac's room is kept, the console of each game it holds stands in
  the room,** plugged in where this Mac has its emulator and unplugged where
  it has not, so a Mac with every emulator installed still starts with a
  handful.
- **Your Mac is a band across the top that stays in view while the page
  scrolls,** and Rux's Collection fills the full width below it, so a drag
  is a short move up. The menu is Carbon's rail on this page, a strip of
  icons, which Design's frame clears, and a line beside Your Mac says whether
  the helper runs and the server answers, opening Status.
- **Collection, Problems, Status, Saves and Emulators stay plain pages** in
  the menu, as now; only the Library is drawn as a room.
- **Rux's Collection is one row of consoles over the picked console's
  games.** Each console is a tile with its drawing, name and count; pressing
  it shows its games and dragging it brings it up. While a console is in the
  room its tile stands outlined and faint, as the place it goes back to, and
  still shows its games when pressed. One whose emulator this Mac has shows
  a green light.
- **The picked console's games have a heading:** its name, its count, where
  it stands, such as "In your room, unplugged", and Bring to Your Mac while
  it is not in the room. The games are covers in one row that scrolls
  sideways, A to Z; one this Mac has is dimmed with a tick, and can still be
  picked up. There is no All, because one console at a time is neater.
- **There is no Recently played,** because a Mac holds only a handful of
  games, and those are on its shelf or in Favourites.
- **Your Mac is a media wall, about 430px tall,** so the room and Rux's
  Collection, with covers about 110×150, both fit an 850px window. In the
  middle the TV stands on a stand of cubbies, one per home console in the
  room and one ghost cubby to drop the next on, never fewer than three, so
  the stand is only as big as what it holds. Handhelds stand in a dock on the
  stand's top beside the TV, since they light their own screen. A bookcase on
  the right holds Favourites face out on its top shelf and this Mac's other
  games as spines below, A to Z; the pegboard is on the left. The floor is
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
  Collection is the last step, and takes the emulator off once no other
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
  a green light in Rux's Collection, and each arrives plugged in when dragged
  into the room; until then their games cannot be played from the room.
- **A game moves the same way:** onto Your Mac downloads it, `this-mac.js`'s
  Download; onto its console plays it, the helper's Play; straight from
  Rux's Collection onto its console downloads and then plays. A home
  console's game dropped on the TV counts as dropped on its console. Dragged
  back anywhere on Rux's Collection its cover leaves this Mac at once, with
  Undo, and its files go a few seconds later, so Undo downloads nothing;
  its saves stay, and there is no separate return area. Picking it up turns the collection to its console, so its own
  cover is there to light up.
- **A place means the same for everything:** in Rux's Collection a thing is
  kept on the server or in Supabase and not on this Mac, in the room it is
  on this Mac, and in or plugged into a console it is the one the next Play
  uses.
- **A memory card is one game's save,** drawn tucked into its game's cover
  and in its console's slot while the game is in. A game can have several,
  each with a name; only one is in at a time, since an emulator finds a save
  by a fixed name. A game's other cards hang on the pegboard, so the room
  stays plain, unless the game is a favourite.
- **The room has one pegboard, on the wall left of the stand, which holds
  what can be swapped on whatever is picked:** a picked game's cards, and a
  picked console's own, such as a PS2's whole cards. It is headed with what
  is picked and what hangs there, such as "Moon Tower, spare memory cards",
  and is not there when nothing is picked or nothing can be swapped. A thing
  is dragged from it onto its game or console to swap it in, and the one
  swapped out hangs back on the pegboard. Picking something else rehangs it.
- **No controller is drawn until button mappings exist.** Then a controller
  is a mapping, the coloured ones alternates a game can be given, and they
  hang on the pegboard like cards; putting a console away never waits on
  one, since a mapping holds nothing to lose.
- **The pegboard calls a save what its console does:** a memory card, a
  cartridge's save or save data, a word each system has in
  `emu/emulators.json`.
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
- **Favourites is a shelf you drag games onto,** from Rux's Collection or
  the room, and off again back to Rux's Collection; it is `emu_notes`'
  favourite mark. A favourite this Mac lacks is dimmed.
- **Favourites are what stays out.** A favourite's other cards stand
  beside its cover on the shelf and not on the pegboard, so the games played
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
  Collection, type, tokens, motion curves and target sizes follow Carbon,
  and the room's outer box takes Carbon's spacing; inside that box sizes,
  gaps and moves are whole art pixels, since Carbon's 8px steps do not
  divide by three and a sprite between pixels blurs.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, Your Mac is not shown,** and
  Rux's Collection is the library to browse.
- **The room, the stand, the shelves and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The prototype is a private page with invented games,**
  claude.ai/artifact/929Ubm6MhbfpgRuFbaTphS, and is not part of the site;
  the media wall is sketched beside the two layouts not taken, empty and
  full, at claude.ai/artifact/FfeSnK1ff9Bg2x3Ap73CTv.

## Questions

- Do a game's save states ride with its card, or stay with the game
  whichever card is in?
- Pressing a game opens its side panel today. Does pressing it also pick
  it for the pegboard, or does the pegboard follow only the game in a
  console?

## Tasks

- [ ] Name an empty cubby or dock spot after the console it waits for.
- [ ] Name the copies of a save Supabase keeps, as cards, and have the
      helper swap which one is on this Mac while its emulator is closed.
- [ ] Draw the pegboard and a game's cards, on its cover, in its console's
      slot and on the pegboard, with pulling one out, dropping one in and
      the console's card light.
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
- [ ] Lay it out on the phone without Your Mac, and see the drawings in
      Safari.
- [ ] Make the room `index.html`, update `emu/README.md` and drop the
      front-page lines from `docs/plans/emu-front-end.md`.
