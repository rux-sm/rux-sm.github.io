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
- **Play asks Rux Emu Helper to open the game,** because a web page cannot
  open a Mac app itself; the helper is `docs/plans/emu-helper.md`.
- **Box art comes from libretro's thumbnails by each game's list name,**
  which is the name the drive's files carry; it is loaded from
  thumbnails.libretro.com and cached by the browser, and nothing is stored.
  A game the lists do not name shows its title on a plain tile.
- **A controller moves around the page** through Chrome's Gamepad API: the
  stick or pad moves between tiles, A opens a game, A again plays, B goes back.
- **Play shows only where it can work:** where the helper answers and has
  the collection. Elsewhere, such as the phone, the page is the library to
  browse, with no Play button.
- **A Switch game shows a plain tile with its name** until its art is settled.
- **ES-DE goes once the library and Play work,** since without internet a
  game is opened from its own emulator, whose settings already save to the
  collection.
- **ares opens N64 games without its Transfer Pak prompt,** by the
  `NoFilePrompt` setting the how-to sets, so Play goes straight to the game.

## Questions

- libretro has no Switch box art. Should Switch tiles use the game's own
  icon, which Ryujinx shows, read from the game file by the scan?

## Tasks

- [ ] Move around the library with a controller.
- [ ] Remove ES-DE from the how-to, `emulators.json`, the Mac check and
  Status, and from the MacBook Pro.
