---
type: plan
---

# Plan: Emu's Library as a room

## Goal

The Library becomes two panels side by side: Storage, every game and console
the collection holds, and Your Mac, a room holding what this Mac has set up
and downloaded. Things move between them by dragging, so getting a game,
setting up its console and playing it are one gesture each, and the page is
fun to use while staying plain. It replaces the front page that
`docs/plans/emu-front-end.md` describes; the rest of Emu is unchanged.

## Decisions

- **Storage holds everything, Your Mac holds what is here.** Storage shows
  each console, then every game with a filter per system; a game or console
  this Mac already has is dimmed with a tick. Your Mac shows its consoles on
  a stand, each with its screen, and its downloaded games on a shelf below,
  with how much room is used.
- **Four moves, each one drag,** each the action Emu already has:
  - a game onto Your Mac downloads it, `this-mac.js`'s Download;
  - a console onto Your Mac installs its emulator, Emulators' Install;
  - a game onto its console plays it, the helper's Play, and the screen
    lights up while it runs; a game dropped on its console straight from
    Storage downloads and then plays;
  - anything dragged back to Storage comes off this Mac after a yes, a game
    leaving its saves and a console leaving its games.
- **The wrong console says no and does nothing:** it shakes its head and says
  a short line, such as "Doesn't fit. Try the SNES.", and the game goes back.
- **Every move works without dragging:** a press opens a small menu with the
  same moves, Enter does on a keyboard, and on a controller A picks up and
  A puts down.
- **Covers keep one height and their own art's width,** as now.
- **Without the helper, such as on the phone, Your Mac is not shown,** and
  Storage is the library to browse, as the page is today.
- **The room, the stand, the shelf and the drag are Emu's own,** under
  `emu-`, every colour a `--rux-*` token; motion follows Carbon's, and the
  head shake, which Carbon has no answer for, says so beside it.
- **The prototype is a private page with invented games,**
  claude.ai/artifact/69qMaJrD8rSz8nXS5xeTng, and is not part of the site.

## Questions

- One emulator plays several consoles: mGBA plays the Game Boy, Game Boy
  Color and Game Boy Advance, Dolphin the GameCube and Wii. Does dragging
  in one of them set up all of its emulator's consoles at once, each
  appearing on the stand?
- Do Recently played and Favourites stay, and where: as rows in Storage, or
  on Your Mac's shelf?
- Which pictures do the consoles use: rux's pixel art in
  `emu/brand/systems/` where drawn and libretro's elsewhere, as the system
  tiles do now, or a new set drawn for the room?
- Storage holds 821 games: does it open on one system at a time, picked
  from its consoles, or on all of them with the filter?
- Any sound: a click when a game goes in, a buzz when it does not fit?

## Tasks

- [ ] Draw Storage and Your Mac from the real games, consoles and this Mac.
- [ ] Build the drag with pointer events, the menu, and the controller's pick
      up and put down.
- [ ] Wire the four moves to Download, Install, Play and Remove.
- [ ] Add the wrong-console reaction.
- [ ] Lay it out on the phone without Your Mac.
- [ ] Update `emu/README.md` and drop the front-page lines from
      `docs/plans/emu-front-end.md`.
