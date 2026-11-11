---
type: plan
---

# Plan: Emu as the front end for the games

## Goal

Emu's front page is a tile for each system, opening a grid of box art for
every game it has, and Play on a game opens it in its emulator on the
MacBook Pro, so the site, not ES-DE, is where a game is picked. The rest of
Emu is `docs/plans/emu-app.md`.

## Decisions

- **The front page is the library:** the recently played and the
  favourites as rows of box art, then a tile for each system with games,
  four of its covers on it, with a search across every game; a system's
  tile opens its games as a grid, all of them, its favourites or its
  recently played, at its own address so Back and a bookmark work. A game
  opens a side panel with its art, notes, played and favourite, and Play.
  The Collection table is its own page.
- **Play marks when a game was last played,** in `emu_notes.played_at`, for
  Recently played; it changes no mark or note.
- **Covers show a game's name without its list's tags,** region, languages
  and revision, which its panel keeps.
- **Play asks Rux Emu Helper to open the game,** because a web page cannot
  open a Mac app itself; the helper is `docs/plans/emu-helper.md`.
- **Box art comes from libretro's thumbnails by each game's list name,**
  which is the name the drive's files carry; it is loaded from
  thumbnails.libretro.com and cached by the browser, and nothing is stored.
  A game the lists do not name shows its title on a plain tile.
- **A controller moves around the page** through Chrome's Gamepad API: the
  stick or pad moves to the nearest tile or cover in that direction, A opens
  a system, then a game, then plays it, and B goes back a step.
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

- [ ] Remove ES-DE from the how-to, `emulators.json`, the Mac check and
  Status, and from the MacBook Pro.
