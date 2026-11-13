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

- **Your Mac is a band across the top that stays in view while the page
  scrolls,** and Rux's Collection fills the full width below it, so a drag
  is a short move up. The menu folds to a strip of icons on this page, and a
  line beside Your Mac says whether the helper runs and the server answers,
  opening Status.
- **Collection, Problems, Status, Saves and Emulators stay plain pages** in
  the menu, as now; only the Library is drawn as a room.
- **Rux's Collection has two parts, Rux's Consoles and Rux's Games.** Every
  console has its own spot in Rux's Consoles; while it is in the room the
  spot stands empty, outlined, as the place it goes back to.
- **Rux's Games has a label per console, with its count, and All.** A label
  shows that console's games; All shows every console's games, each under
  its name. Games are in A to Z order, and one this Mac has is dimmed with a
  tick.
- **Your Mac holds the consoles on a stand above a power strip on the
  left, and the Favourites shelf over the On this Mac shelf on the right,**
  with how much room is used.
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
  plugged-in Game Boy Color while mGBA stays installed.
- **An emulator that plays several consoles readies them all.** Plugging in
  the Game Boy installs mGBA, so the Game Boy Color and Game Boy Advance show
  Ready in Rux's Consoles, and each arrives plugged in when dragged into the room;
  until then their games cannot be played.
- **A game moves the same way:** onto Your Mac downloads it, `this-mac.js`'s
  Download; onto its console plays it, the helper's Play, and the screen
  lights up while it runs; straight from Rux's Games onto its console
  downloads and then plays. Dragged back anywhere on Rux's Games, where its
  own cover lights up, it comes off this Mac at once, with Undo, since its
  saves stay and getting it back is one drag; there is no separate return
  area.
- **Favourites is a shelf you drag games onto,** from Rux's Games or the
  room, and off again back to Rux's Games; it is `emu_notes`' favourite mark.
- **The wrong console says no and does nothing:** it shakes its head, buzzes
  and says a short line, such as "Doesn't fit. Try the SNES.", and the game
  goes back. An unplugged console says "Plug me in first."
- **Every move makes a small sound,** made in the browser with no sound
  files: a click to pick up, a thunk and rising tone to plug in, a chime
  when a download finishes, a start-up jingle to play, a buzz for no. A
  switch in the header turns them off.
- **Every move works without dragging:** pressing a game opens its side
  panel, `game-panel.js`, with its details, saves and notes and the same
  moves as buttons; pressing a console opens a small menu with its moves; the plug is a button, Enter does on a keyboard, and on a
  controller A picks up and A puts down.
- **The consoles are a new set, drawn for the room,** each a plain flat
  drawing with a screen that glows; the home consoles stand under a TV.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, Your Mac is not shown,** and
  Rux's Collection is the library to browse.
- **The room, the stand, the shelves and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The prototype is a private page with invented games,**
  claude.ai/artifact/69qMaJrD8rSz8nXS5xeTng, and is not part of the site.

## Questions

- Rux's Games as covers, or as spines on a bookshelf that fit many more
  across? The prototype's Covers and Shelf switch shows both.
- Recently played has no place in the room yet: drop it, or keep it as a
  row in Rux's Collection above the consoles?
- Later, should a controller plug into a console the same way, to set up
  its buttons?
- Where is each Mac's room kept: in Supabase per Mac, so it follows a helper
  reinstall, which is a database change shown to rux first; or in the
  browser, where clearing it empties the room?

## Tasks

- [ ] Keep which consoles stand in each Mac's room, and which are unplugged.
- [ ] Draw the new console set.
- [ ] Draw Rux's Collection and Your Mac from the real games, consoles and this Mac.
- [ ] Build the drag with pointer events, the menu, the plug, and the
      controller's pick up and put down.
- [ ] Wire the moves to Download, Install, `R.carry.remove`, Play, Remove a
      game and the favourite mark, loading `carry.js` and `saves-rules.js`.
- [ ] Add the wrong-console reaction and the sounds.
- [ ] Lay it out on the phone without Your Mac.
- [ ] Update `emu/README.md` and drop the front-page lines from
      `docs/plans/emu-front-end.md`.
