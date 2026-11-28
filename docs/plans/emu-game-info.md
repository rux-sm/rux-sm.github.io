---
type: plan
---

# Plan: every game's facts, words and pictures, kept

## Goal

Every game's facts, description, cover, screenshot and title screen are
fetched once by the home server's nightly scan and kept in Supabase, so the
Library reads them from there and never asks libretro or ScreenScraper
itself. A game's facts and description stand under its name on the Library.

## Decisions

- **Facts and words live in `emu_info`,** one row a game by system and title,
  apart from `emu_games`, because the scan rewrites a game's row each night
  and these are fetched once. A row stays when its game leaves the server.
  Only the owner reads or writes it, as `docs/database-access.md` rules.
- **A row is the game's facts,** year, genre, developer, publisher and
  players, **its description, and how it was asked,** a number the scan bumps
  when a new source joins, so every game is asked again once.
- **libretro's database comes first,** its `metadat` files: the facts for the
  NES, SNES, N64, Game Boy, Color, Advance and DS, and facts with a
  description for the PlayStation and PS2. A game is found by the names its
  cover is found by.
- **ScreenScraper fills what libretro lacks:** a description for every
  game, and the facts for the 3DS, GameCube, Wii, Wii U, Xbox and Switch. A game
  is asked by the fingerprints the scan already holds, in English.
- **Pictures are kept as covers are,** in the `emu-collection` bucket: the
  cover under `art/` and the screenshot under `shot/`, a moment in play else
  the title screen, since the Library shows one; each from libretro's
  thumbnails, else ScreenScraper's.
- **The Library shows the kept picture first** and libretro's live address
  only where none is kept yet.

- **ScreenScraper is asked with a developer login and rux's own,** both kept
  on the scan's server as the Supabase key is: every call needs the
  developer's, and rux's raises how many calls a day it answers.

## Questions

None.

## Tasks

- [ ] Ask ScreenScraper for what libretro lacks, once rux's account and the
      developer login asked for on its forum are on the server.
