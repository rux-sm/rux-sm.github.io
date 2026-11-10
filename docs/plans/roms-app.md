---
type: plan
---

# Plan: Roms, a tracker for the game collection

## Goal

A new app, Roms, at `/roms/`, headed Rux Roms with the prefix `roms-`, that
lists every game on rux's portable drive and says, for each one, exactly
which version it is. It checks each file against the public lists of known
good copies, so it can point out a bad or odd copy, a game missing a disc
and a better version of a game rux already has, such as a later revision or
a missing update. It keeps the drive organized: every game named by the
lists and stored in its system's preferred format.

## Decisions

- **The collection is read from the drive, never typed in.** The drive holds
  one folder per system under `emulation/roms/`, and the scan walks those
  folders. A game is one entry in a system folder; the tracks and discs of
  one game count as one game, and a Switch game's updates, add-ons and mods
  are kept with the game they belong to.
- **A Mac tool scans, the app shows.** `roms/tools/scan-roms.mjs` reads the
  drive, because only the Mac can read 460 GB quickly and open every format;
  it writes its results to a scans folder on the drive, never into this
  repository, and the app's Import page reads that file and saves it on a
  yes, as Coins' Import page takes a bank file. A scan only reads the games.
- **The list lives in the Supabase project, in `roms_*` tables, and only
  rux's account can read it,** through `is_owner()` as LN Guide's and
  Pixels' tables are, so the list opens on rux's phone too. No game
  name, file name or scan result is ever committed, because this repository
  is public; Design's pages for Roms use invented titles.
- **Every game is checked against the public lists of known good copies:**
  No-Intro's for cartridge and handheld systems, Redump's for disc systems.
  A copy whose fingerprint is on a list is that exact version; one that is
  not is flagged. The lists are downloaded on a yes, kept outside this
  repository, and refreshed by the tool.
- **BIOS files are checked against the same lists,** so a missing or wrong
  BIOS shows on Problems.
- **Switch games are checked by title ID and version** against a public list
  of titles, because No-Intro lists the encrypted cartridge and these files
  will not match it.
- **Disc games in CHD or RVZ are checked by what is inside them,** because
  the lists fingerprint the plain disc: the tool reads the fingerprints CHD
  stores in its header, and expands an RVZ only when its header cannot
  answer.
- **The first scan fingerprints the whole drive,** about 15 to 30 minutes;
  fingerprints are kept, keyed by the file's path, size and date, so a later
  scan reads only new or changed files.

The preferred format of each system, the one its emulator reads best:

| System | Preferred format |
| :--- | :--- |
| NES, SNES, GB, GBC, GBA, N64, NDS | the plain file, not zipped, so it matches the list byte for byte |
| PS1 | CHD, one per disc, and an `.m3u` playlist for a game on more than one disc |
| PS2 | CHD |
| GameCube, Wii | RVZ |
| 3DS | decrypted `.3ds` |
| Wii U | `.wua`, one file holding the game, its update and its add-ons |
| Switch | the game as it is, its update and add-ons as `.nsp` files named to match it |

How the drive is organized:

- **`roms/tools/organize-roms.mjs` renames and converts, on a yes.** It
  reads the last scan, shows every rename and conversion it would make, and
  does them only when rux says yes.
- **Names are the lists' names,** so every file name carries its region and
  revision; a game the lists do not know keeps its name and is flagged.
- **One copy per game: the USA release, latest revision.** Other regions and
  revisions are flagged as extra copies, never removed by the tool.
- **A file is checked before it is converted,** so a bad copy is never
  sealed into a new format; a copy not on the list is left as it is.
- **Nothing is deleted by the tool.** A converted original moves to
  `emulation/to-delete/`, and rux empties that folder by hand once the new
  file plays.
- **Conversion uses chdman, from Homebrew's `rom-tools`,** for CHD, and
  Cemu's own converter for `.wua`.

What the scan records for every game:

| Field | Where it comes from | Systems |
| :--- | :--- | :--- |
| system | the folder name | all |
| title, region, languages, revision | the file name's tags, then the list's entry | all |
| files, format, size | the file system | all |
| CRC32, MD5, SHA-1 | read from the whole file | cartridge and handheld systems, BIN and ISO, BIOS |
| list match | the fingerprint looked up in No-Intro or Redump | all but Switch |
| internal title, game code, version byte | the cartridge header | GB, GBC, GBA, N64, NDS |
| header kind | the first bytes: iNES or NES 2.0, a copier header on SNES, N64 byte order | NES, SNES, N64 |
| header checksum | recomputed and compared | GB, GBC, GBA, SNES, N64 |
| product code, encrypted or not | the NCSD and NCCH headers | 3DS |
| disc ID, maker, disc number, revision | the disc header | GameCube, Wii |
| serial | `SYSTEM.CNF` inside the disc | PS1, PS2 |
| tracks, and whether every track the CUE names is there | the CUE sheet | PS1 BIN and CUE |
| CHD version and stored SHA-1 | the CHD header | PS1, PS2 |
| title ID, version, kind (game, update, add-on) | the file name's brackets, then the NSP or XCI header | Switch |
| title ID, version | `meta.xml` in the game's folder | Wii U |
| save file, save state | a matching name under `emulation/saves/` | all with a save folder |

The problems the app flags:

- **Not on the list:** a fingerprint no list knows, so a bad, trimmed, hacked
  or overdumped copy.
- **Wrong name:** the file name is not the list's name for its fingerprint,
  such as Rev 0 named as Rev 1.
- **Not the preferred format:** a game not yet in its system's format above.
- **Extra copy:** the same fingerprint twice, or a second region or revision
  of a game the collection already has.
- **Incomplete:** a disc or track missing from a multi-disc game or a CUE.
- **Bad header:** a checksum that does not add up, a copier header, or N64
  byte order other than `.z64`.
- **Encrypted:** a 3DS copy the emulator cannot read as it is.
- **Out of date:** a Switch or Wii U game with no update, or an older one
  than the title list knows.
- **No save:** a game played before, by its save folder, whose save is gone.
- **BIOS:** a BIOS missing for a system with games, or one not on the list.

Five pages in a side nav, each started from a Design template:

- **Collection** is one table of every game: system, title, region, version,
  format, size and a status tag, with search and a filter per system and
  per status. A game opens in a side panel with every field above.
- **Problems** lists only what needs a look, grouped by kind.
- **Wanted** lists the better versions the lists know of and the collection
  lacks: a later revision, a missing disc, a missing update, and an English
  copy where rux has only another language.
- **Organize** shows what `organize-roms.mjs` would rename and convert, and
  how much space it saves, for rux to say yes to on the Mac.
- **Import** takes a scan file, shows what changed since the last one, and
  saves on a yes.

## Questions

- **Does Cemu's `.wua` converter run from the command line,** or only from
  its window? If only the window, the one Wii U game is converted by hand
  and the tool only checks the result.

## Tasks

- [ ] Add the No-Intro and Redump lists and the Switch title list to the tool,
  downloaded on a yes and kept outside this repository, and match every
  game against them.
- [ ] Write `roms/tools/organize-roms.mjs`: renames to the lists' names, CHD
  for PS1 and PS2, `.m3u` playlists, `.wua` for Wii U, originals moved to
  `emulation/to-delete/`, all shown first and done on a yes.
- [ ] Install `rom-tools` with Homebrew on a yes, and answer the Cemu question.
- [ ] Import the first full scan and check Collection and Import in Chrome on
  :8641.
- [ ] Show each game's list match in Collection, and build Problems, Wanted and
  Organize from the matches.
- [ ] Add Roms' invented example pages to Design, and its `README.md`.
- [ ] Organize the drive, scan and import it again, and check every page in
  Chrome on :8641.
