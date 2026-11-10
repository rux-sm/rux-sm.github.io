---
type: plan
---

# Plan: Roms, a tracker for the game collection

## Goal

A new app, Roms, at `/roms/`, that lists every game on rux's portable drive
and says, for each one, exactly which version it is. It checks each file
against the public lists of known good copies, so it can point out a bad or
odd copy, a game missing a disc, a file in the wrong format, and a better
version of a game rux already has, such as a later revision or a missing
update.

## Decisions

- **The collection is read from the drive, never typed in.** The drive holds
  one folder per system under `emulation/roms/`, and the scan walks those
  folders. A game is one entry in a system folder; the tracks and discs of
  one game count as one game, and a Switch game's updates, add-ons and mods
  are kept with the game they belong to.
- **A Mac tool scans, the app shows.** `roms/tools/scan-roms.mjs` reads the
  drive, because only the Mac can read 460 GB quickly and open every format;
  it writes one file of results outside this repository, and the app's
  Import page reads that file and saves it on a yes, as Coins' Import page
  takes a bank file. A scan only reads; it never renames, moves or deletes a
  file on the drive.
- **The list lives in the Supabase project, in `roms_*` tables, and only
  rux's account can read it,** through a `roms_is_owner()` check as Coins
  has `coins_is_member()`. No game name, file name or scan result is ever
  committed, because this repository is public; Design's pages for Roms use
  invented titles.
- **Every game is checked against the public lists of known good copies:**
  No-Intro's for cartridge and handheld systems, Redump's for disc systems.
  A copy whose fingerprint is on a list is that exact version; one that is
  not is flagged. The lists are downloaded on a yes, kept outside this
  repository, and refreshed by the tool.
- **Switch games are checked by title ID and version** against a public list
  of titles, because No-Intro lists the encrypted cartridge and these files
  will not match it.
- **Disc games in CHD or RVZ are checked by what is inside them,** because
  the lists fingerprint the plain disc: the tool reads the fingerprints CHD
  stores in its header, and expands an RVZ only when its header cannot
  answer.
- **Fingerprints are taken once and kept,** keyed by the file's path, size
  and date, so a second scan only reads new or changed files.
- **Four pages in a side nav,** each started from a Design template:
  - **Collection** is one table of every game: system, title, region,
    version, format, size and a status tag, with search and a filter per
    system and per status. A game opens in a side panel with every field
    below.
  - **Problems** lists only what needs a look, grouped by kind.
  - **Wanted** lists the better versions the lists know of and the
    collection lacks: a later revision, a missing disc, a missing update,
    and an English copy where rux has only another language.
  - **Import** takes a scan file, shows what changed since the last one,
    and saves on a yes.

What the scan records for every game:

| Field | Where it comes from | Systems |
| :--- | :--- | :--- |
| system | the folder name | all |
| title, region, languages, revision | the file name's tags, then the list's entry | all |
| files, format, size | the file system | all |
| CRC32, MD5, SHA-1 | read from the whole file | cartridge and handheld systems, BIN and ISO |
| list match | the fingerprint looked up in No-Intro or Redump | all but Switch |
| internal title, game code, version byte | the cartridge header | GB, GBC, GBA, N64, NDS |
| header kind | the first bytes: iNES or NES 2.0, a copier header on SNES, N64 byte order | NES, SNES, N64 |
| header checksum | recomputed and compared | GB, GBC, GBA, SNES, N64 |
| product code, encrypted or not | the NCSD and NCCH headers | 3DS |
| disc ID, maker, disc number, revision | the disc header | GameCube, Wii |
| serial | `SYSTEM.CNF` inside the disc | PS1, PS2 |
| tracks, and whether every track the CUE names is there | the CUE sheet | PS1 BIN and CUE |
| CHD version and stored SHA-1 | the CHD header | PS1 CHD |
| title ID, version, kind (game, update, add-on) | the file name's brackets, then the NSP or XCI header | Switch |
| title ID, version | `meta.xml` in the game's folder | Wii U |
| save file, save state | a matching name under `emulation/saves/` | all with a save folder |

The problems the app flags:

- **Not on the list:** a fingerprint no list knows, so a bad, trimmed, hacked
  or overdumped copy.
- **Wrong name:** the fingerprint matches a different entry than the file
  name says, such as Rev 0 named as Rev 1.
- **Duplicate:** the same fingerprint twice, or the same game in two regions
  with nothing to tell them apart.
- **Incomplete:** a disc or track missing from a multi-disc game or a CUE.
- **Mixed format:** one system holding the same kind of game in different
  formats, such as PS1 in both BIN and CUE and CHD.
- **Bad header:** a checksum that does not add up, a copier header, or N64
  byte order other than `.z64`.
- **Encrypted:** a 3DS copy the emulator cannot read as it is.
- **Out of date:** a Switch game with no update, or an older one than the
  title list knows.
- **No save:** a game played before, by its save folder, whose save is gone.

## Questions

- **Is the app called Roms,** headed Rux Roms, at `/roms/` with the prefix
  `roms-`? Another word would rename all of these.
- **May the game list sit in Supabase,** readable only by rux's account? The
  other choice is a page that opens the scan file each time and saves
  nothing, which keeps the list on the Mac but loses the Problems and Wanted
  history between scans.
- **Is a full fingerprint pass of the drive all right?** It reads all 460 GB
  once, likely 15 to 30 minutes with the drive plugged in; later scans read
  only what changed.
- **Should BIOS files be checked too,** against the same lists, so a missing
  or wrong BIOS shows on Problems?

## Tasks

- [ ] Start `roms/` from a Design template, with its `brand/icon.svg` drawn by
  `docs/app-icons.md` and its entry in `switcher.json`.
- [ ] Show the `roms_*` tables, `roms_is_owner()` and their grants to rux as SQL,
  and apply them on a yes as a named migration.
- [ ] Write `roms/tools/scan-roms.mjs`: walk the system folders, group files
  into games, read sizes, headers and fingerprints, and keep fingerprints
  between scans.
- [ ] Add the No-Intro and Redump lists and the Switch title list to the tool,
  downloaded on a yes and kept outside this repository, and match every
  game against them.
- [ ] Build Import: read a scan file, show what changed, save on a yes.
- [ ] Build Collection, with the side panel.
- [ ] Build Problems and Wanted from the matches.
- [ ] Add Roms' invented example pages to Design, and its `README.md`.
- [ ] Scan the drive, import it, and check every page in Chrome on :8641.
