---
type: plan
---

# Plan: Emu as the front end for the games

## Goal

Emu shows every game as box art, and Play on a game opens it in its emulator
on the MacBook Pro, so the site, not ES-DE, is where a game is picked. The
front page is `docs/plans/emu-library.md`, and the rest of Emu
`docs/plans/emu-app.md`.

## Decisions

- **Play marks when a game was last played,** in `emu_notes.played_at`; it changes
  no mark or note.
- **Covers show a game's name without its list's tags,** region, languages
  and revision, which its panel keeps.
- **Play asks Rux Emu Helper to open the game,** because a web page cannot
  open a Mac app itself; the helper is `docs/plans/emu-helper.md`.
- **The page shows only the covers the server keeps,** read from Supabase
  and kept in the browser under each picture's SHA-1, so a cover never
  depends on another site; how the server finds them is
  `emu/docs/home-server.md`. A game with no cover shows its title.
- **Play shows only where it can work:** where the helper answers and has
  the collection. Elsewhere, such as the phone, the page is the collection to
  browse, with no Play button.
- **ES-DE goes once the library and Play work,** since without internet a
  game is opened from its own emulator, whose settings already save to the
  collection.
- **ares opens N64 games without its Transfer Pak prompt,** by the
  `NoFilePrompt` setting the how-to sets, so Play goes straight to the game.

## Questions

None.

## Tasks

- [ ] Remove ES-DE from the how-to, `emulators.json`, the Mac check and
  Status, and from the MacBook Pro.
