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
  a plug sets an emulator up or takes it off, and a game opens its side
  panel when pressed.
- **Until a Mac's room is kept, the console of each game it holds stands in
  the room,** plugged in where this Mac has its emulator and unplugged where
  it has not, so a Mac with every emulator installed still starts with a
  handful.
- **Your Mac is a band across the top that stays in view while the page
  scrolls,** and Rux's Collection fills the full width below it, so a drag
  is a short move up. The menu folds to a strip of icons on this page, and a
  line beside Your Mac says whether the helper runs and the server answers,
  opening Status.
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
- **Your Mac is one scene.** One TV and the consoles stand on a board on the
  left, with a power strip under it; this Mac's games stand on the same board
  on the right, with Favourites on a wall shelf above them and how much room
  is free in the heading. An empty room says "Drag a console up here."
- **The plug is the whole socket under its console.** Plugged in it sits in
  the strip; unplugged it hangs loose, its socket blinks and it says "Plug
  in".
- **A console comes in unplugged, and plugging it in installs its
  emulator.** Unplugging it takes the emulator off this Mac, once no other
  plugged-in console uses it, and an unplugged console goes back to its spot
  with no question; a plugged-in one says "Unplug me first."
- **Plugging in is the helper's install, unplugging is `R.carry.remove`,**
  which carries the saves and keeps the settings in Supabase before the
  emulator goes to the Trash; the light blinks while the install's request is
  waiting, since it reports no progress. Plugging back in restores this Mac's
  kept settings, so a console comes back as it was.
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
- **The TV shows a home console's game while it runs,** and a handheld
  lights its own screen.
- **A word follows what is held and says what letting go will do:**
  Download, Play, Download and play, Add to Favourites, Take off this Mac,
  Bring in, Put back, or in red why not, such as "Doesn't fit the Game Boy"
  and "Plug it in first". The place it will land lights up. The word and the
  move come from one function, so they never disagree.
- **One line beside Your Mac's name says what a move did,** such as
  "Playing." or why the helper refused, with Undo where it can be taken back.
- **A game on this Mac whose console is not plugged in is dimmed,** with a
  small tag naming the console it needs.
- **Favourites is a shelf you drag games onto,** from Rux's Collection or
  the room, and off again back to Rux's Collection; it is `emu_notes`'
  favourite mark. A favourite this Mac lacks is dimmed.
- **Picking up a game lights the consoles it fits and dims the rest,** so
  where it goes shows before it is dropped.
- **A game goes in as it would on the real console:** a cartridge drops into
  its slot, a disc slides onto a tray that opens and shuts, then the screen
  lights. A download fills its cover from the bottom as it comes.
- **Each plugged-in console has a power button,** lit while it plays;
  pressing it stops the game. The helper quits an emulator only from the
  controller's + and − today, so the page needs a quit request from it.
- **The wrong console says no and does nothing:** it shakes its head, buzzes
  and says a short line, such as "Doesn't fit. Try the SNES.", and the game
  goes back. An unplugged console says "Plug me in first."
- **Every move makes a small sound,** made in the browser with no sound
  files: a click to pick up, a thunk and rising tone to plug in, a chime
  when a download finishes, a start-up jingle to play, a buzz for no. A
  switch in the header turns them off.
- **Every move works without dragging:** pressing a game opens its side
  panel, `game-panel.js`, with its details, saves and notes and the same
  moves as buttons; pressing a console, in the room or the collection, picks
  it, and its heading has Bring to Your Mac or Put back; the plug is a
  button, Enter does on a keyboard, and on a controller A picks up and A
  puts down.
- **The consoles are Emu's own set, `emu/brand/consoles.svg`,** one plain
  flat drawing per system on the foot of one 3:2 box, which `room.js` puts
  into its page, since a drawing in another file draws nothing in Safari.
  Every fill is an
  `--emu-console-*` property that `app.css` sets from Design's tokens, so a
  console follows the theme, and a handheld's screen is its own property, to
  light while it plays. The home consoles stand beside the one TV.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, Your Mac is not shown,** and
  Rux's Collection is the library to browse.
- **The room, the stand, the shelves and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The prototype is a private page with invented games,**
  claude.ai/artifact/929Ubm6MhbfpgRuFbaTphS, and is not part of the site.

## Questions

None open.

## Tasks

- [ ] Give Rux Emu Helper a quit request the page can send, for the power
      button, and have it say which game runs, to light the TV or a
      handheld's screen.
- [ ] Fold the menu to a strip of icons on `room.html`.
- [ ] Lay out a room of more than eight consoles, where each is now too
      narrow for its name.
- [ ] Tag a game whose console is not plugged in with that console; it is
      only dimmed.
- [ ] Pick up and put down a game or console with a controller's A.
- [ ] Add the wrong-console reaction, the game going into its console, and
      the sounds.
- [ ] Lay it out on the phone without Your Mac, and see the drawings in
      Safari.
- [ ] Make the room `index.html`, update `emu/README.md` and drop the
      front-page lines from `docs/plans/emu-front-end.md`.
