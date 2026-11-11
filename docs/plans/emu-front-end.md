---
type: plan
---

# Plan: Emu as the front end for the games

## Goal

Emu's front page becomes a wall of box art for every game on the drive,
one row per system, and Play on a game opens it in its emulator on the
MacBook Pro, so the site, not ES-DE, is where a game is picked. The rest of
Emu is `docs/plans/emu-app.md`.

## Decisions

- **The front page is the library:** one row of box art per system, newest
  played first, with search; a game opens a side panel with its art, notes,
  save, played and favourite, and Play. The Collection table moves to its
  own page.
- **Play runs one Apple Shortcut, Rux Emu Open,** through a
  `shortcuts://run-shortcut` link, because a web page cannot open a Mac app
  itself. Chrome asks once, and Always allow keeps it from asking again.
- **The shortcut takes `<system>|<file>` and opens only that file from the
  drive's `roms/<system>/` folder, in that system's emulator,** so nothing a
  page sends can open anything else; a path with `..`, a system it does not
  know or a missing file opens nothing.
- **Each system opens the way ES-DE's own standalone command does on macOS,**
  so a game starts the same from the page or from ES-DE.
- **The shortcut is built from the repository,** by
  `emu/tools/build-shortcut.mjs`, which writes it from `emulators.json`,
  signs it with `shortcuts sign` and opens it to be added, so a new system
  is one line in `emulators.json`.
- **Box art comes from libretro's thumbnails by each game's list name,**
  which is the name the drive's files carry; it is loaded from
  thumbnails.libretro.com and cached by the browser, and nothing is stored.
  A game the lists do not name shows its title on a plain tile.
- **A controller moves around the page** through Chrome's Gamepad API: the
  stick or pad moves between tiles, A opens a game, A again plays, B goes back.
- **Play shows only where it can work:** on a Mac in Chrome. Elsewhere, such
  as the phone, the page is the library to browse, with no Play button.
- **ares opens N64 games without its Transfer Pak prompt,** by the
  `NoFilePrompt` setting the how-to sets, so Play goes straight to the game.

## Questions

- libretro has no Switch box art. Should Switch tiles use the game's own
  icon, which Ryujinx shows, read from the game file by the scan?

## Tasks

- [ ] Write `emu/tools/build-shortcut.mjs` with every system's command, and
  replace the test shortcut with it.
- [ ] Make the front page the box-art library, and move the Collection table
  to its own page.
- [ ] Add Play to the game's side panel, shown on a Mac in Chrome.
- [ ] Move around the library with a controller.
- [ ] Add the shortcut and the ares setting to `emu/docs/emulator-setup.md`.
