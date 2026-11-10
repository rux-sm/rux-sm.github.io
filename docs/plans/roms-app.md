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
- **A BIOS is named where libretro's system list knows it.** That list holds
  few PlayStation 2 files and no Xbox or Switch ones, so a BIOS it lacks is
  not flagged.
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
- **Conversion uses chdman, from Homebrew's `rom-tools`,** for CHD. Cemu
  makes a `.wua` only from its Title Manager window, so the Wii U game is
  converted there by hand and the scan checks the result.

What the scan records for every game:

| Field | Where it comes from | Systems |
| :--- | :--- | :--- |
| system | the folder name | all |
| title, region, languages, revision | the file name's tags, then the list's entry | all |
| files, format, size | the file system | all |
| CRC32, MD5, SHA-1 | read from the whole file | cartridge and handheld systems, BIN and ISO, BIOS |
| list match | the fingerprint looked up in No-Intro or Redump, a CHD by the tracks inside it, GameCube and Wii by disc ID | all but Switch and Wii U |
| latest update | titledb's versions list | Switch |
| internal title, game code, version byte | the cartridge header | GB, GBC, GBA, N64, NDS |
| header kind | the first bytes: iNES or NES 2.0, a copier header on SNES, N64 byte order | NES, SNES, N64 |
| header checksum | recomputed and compared | GB, GBC, GBA, SNES, N64 |
| product code, encrypted or not | the NCSD and NCCH headers | 3DS |
| disc ID, maker, disc number, revision | the disc header | GameCube, Wii |
| serial | `SYSTEM.CNF` inside a BIN or ISO, and the list's entry for a matched disc | PS1, PS2 |
| tracks, and whether every track the CUE names is there | the CUE sheet | PS1 BIN and CUE |
| CHD version and stored SHA-1 | the CHD header | PS1, PS2 |
| title ID, version, kind (game, update, add-on) | the file name's brackets, then the NSP or XCI header | Switch |
| title ID, version | `meta.xml` in the game's folder | Wii U |
| save file, save state, memory card | `emulation/saves/`, matched by each emulator's rule below | all |

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

- **Save with no game:** a save whose game is not on the drive, so a game
  renamed or removed without its save.
- **Missing BIOS:** a file the system's emulator needs, below, not in
  `emulation/bios/`.
- **Original waiting:** a converted game's original still in
  `emulation/to-delete/`.

A game with more than one newer revision is one row under Newer version,
naming the latest, because the older ones are not worth getting.

Emulators, chosen fresh rather than kept from what is installed:

- **ES-DE is the one library,** launching each system's emulator, because it
  reads the drive's `emulation/roms/<system>/` folders as they are named
  and runs on macOS.
- **Each system runs its best standalone emulator, and RetroArch goes,**
  because each standalone is the most accurate for its system and keeps its
  saves as plain files, at the cost of RetroArch's shared shaders, rewind
  and run-ahead.
- **Each emulator's installer is kept in `emulation/emulators/`,** with the
  version in its name, because a download can vanish, as Switch emulators'
  have.

| System | Emulator | Why | It needs |
| :--- | :--- | :--- | :--- |
| NES, SNES | Mesen 2 | the most accurate for both, native on macOS | nothing |
| GB, GBC, GBA | mGBA | accurate and light, saves as plain `.sav` | nothing; a GBA BIOS is optional |
| N64 | ares | accurate, native on macOS | nothing |
| DS | melonDS | the most accurate, native on macOS | nothing for DS games; DSi BIOS and firmware only for DSi-only games |
| 3DS | Azahar | the maintained successor to Citra | nothing for a decrypted `.3ds` |
| PS1 | DuckStation | the most accurate and fastest, reads CHD and `.m3u`, one memory card per game | a PS1 BIOS, `scph5501.bin` for USA games |
| PS2 | PCSX2 | the only mature PS2 emulator; it runs under Rosetta, as only unofficial forks are native | a PS2 BIOS |
| GameCube, Wii | Dolphin | the only mature one, reads RVZ | nothing |
| Wii U | Cemu | the only mature one, native on macOS | nothing for a `.wua` |
| Switch | Eden | the most active, with the best Apple Silicon support now Ryubing only maintains | `prod.keys`, `title.keys` and firmware |
| Xbox | xemu | the only mature one, for when Xbox games join | the MCPX and flash BIOS and a hard disk image |

- **The table lives in `app.js`** beside each system's preferred format, so
  the app and the scan read one list.
- **A needed file is checked by name and, where libretro's list knows it, by
  MD5;** keys are checked by name only and never read.
- **Each emulator's settings stay on each Mac;** the Emulators page says where
  each keeps them, its saves and its installer.
- **`roms/docs/emulator-setup.md` is the how-to** for installing each one on a
  Mac and pointing it at the drive, so both Macs are set up the same.
- **The Xbox BIOS and hard disk image stay,** for when Xbox games join.

Saves:

- **Saves live on the drive, one folder per emulator,** under
  `emulation/saves/<system>/`, named for the first system it plays, so both
  Macs play from the same saves and the scan sees every one; where an
  emulator keeps saves inside its NAND or MLC folder, that whole folder lives
  there.
- **A save is matched to its game the way its emulator names it:** Mesen,
  mGBA, melonDS and ares by the game's file name, Azahar, Cemu and Eden by
  title ID, Dolphin by disc ID, and DuckStation and PCSX2 by the disc's
  serial, which for a CHD comes from the list's entry for the disc, so no
  disc is extracted to read it.
- **The organize tool renames a save named after its game's file with the
  game,** because those emulators find a save only by that name.
- **PCSX2 uses folder memory cards and DuckStation one card per game, by
  serial,** so each game's save is its own and not one card shared by all.
- **What the scan records for a save:** its game, kind (save, save state or
  memory card), files, size, created and last saved, from the file's dates.
- **The RetroArch saves move to the new emulators:** GB, GBC, GBA and DS
  `.srm` files are plain save memory and only renamed, and an N64 `.srm`
  is split into the EEPROM, SRAM, flash and Controller Pak files ares reads;
  save states cannot move between emulators and are left behind.

Backups, three copies of everything small:

- **The drive** holds the saves the emulators play from.
- **Supabase** holds the offsite copy, in a private `roms-backups` bucket
  only the owner reads: the scan packs `saves/`, `bios/` and the keys into
  one dated zip on the drive, and Import uploads it with the scan, signed in
  as rux.
- **Each Mac** keeps a third copy: `roms/tools/backup-saves.mjs` copies the
  same zip, the firmware and the installers to a folder in its Documents.
- **Supabase keeps every backup of the last 30 days and one a month before
  that,** since the saves, BIOS and keys come to about 10 MB.
- **The firmware and installers stay off Supabase,** at 325 MB and more, so
  they live on the drive and each Mac.
- **A save is restored from the Saves page,** which downloads any backup's
  zip.

Saves found wherever each emulator keeps them, and backed up from the app:

- **`emulators.json` says where each emulator keeps saves on a Mac,** its
  default and the setting that moves it, because each keeps them its own
  way: in `~/Library/Application Support`, beside the game, or in a
  NAND or memory card folder.
- **`roms/tools/check-mac.mjs` finds every save on this Mac,** reading
  each installed emulator's settings for a moved save folder and its
  default otherwise, and writes this Mac's report to the drive's `macs/`
  folder with a copy of any save not on the drive; it only reads the saves.
- **`Check this Mac.command`, kept on the drive, runs it with a double-click**
  and opens the Status page, so no terminal is needed; it needs Node on the
  Mac.
- **Back up this Mac's saves, on the Saves page,** uploads a Mac's report
  through Chrome, picked once and remembered, file by file to the
  `roms-backups` bucket, and records each save by its game and Mac.
  The page cannot read `~/Library` itself, which Chrome keeps from pages.
- **The rules that match a save to its game live in one module,**
  `roms/saves-rules.js`, which the scan imports and the page loads, so they
  never match a save differently; the Mac check only copies.
- **A save beside a game on the drive is a save,** not a game, since mGBA
  and melonDS keep one there by default.
- **Each save says where it lives,** the T7 or a Mac by name, and when it was
  last backed up, so a save on one Mac only is plain to see.
- **Restore downloads a Mac save's files one by one,** each with the folder
  its emulator reads it from, and a drive save's backup zip.
- **Pointing every emulator at the T7's `saves/` stays the choice for playing
  across Macs,** and the gather tool finds the saves either way.

Rux's own notes:

- **A note on a save,** saying where it is in the game, is typed on the Saves
  page and kept with the save.
- **Played, finished, favourite and a note on a game** are typed in the side
  panel, kept in their own table, keyed by system and title.
- **Import never changes rux's notes,** and the organize tool lists its
  renames in the next scan so Import moves a renamed game's notes with it.
- **`plays` on a converted game** says its new file was played, and Problems
  says when every original in `to-delete/` is safe to empty.

Six pages in a side nav, each started from a Design template:

- **Collection** is one table of every game: system, title, region, format,
  size and a status tag, with search and a filter per system and per status.
  A game opens in a side panel with every field above and rux's notes.
- **Problems** lists every game with a problem under one heading per kind,
  worst first, which covers the better versions to look for and what the
  organize tool would convert or rename.
- **Saves** has one heading per system and a row per game with a save: kind,
  created, last saved, size, the note and a restore, and each backup
  location's last date at the top.
- **Status** says what is done and what is left, for the drive and for each
  Mac, so a Mac is set up from one checklist.
- **Emulators** has one row per system: the emulator, why, each file it needs
  and whether the drive has it, and where its saves, settings and installer
  live.
- **Import** takes a scan file, shows what changed since the last one, and
  saves on a yes.

## Questions

None open.

## Tasks

- [ ] Install ES-DE and each emulator fresh on both Macs, following
  `roms/docs/emulator-setup.md`, and keep each installer on the drive.
- [ ] Move the RetroArch and Azahar saves, and the other Mac's Dolphin,
  PCSX2, Cemu and Switch saves, into `emulation/saves/`, as the how-to says.
- [ ] Add a PS1 BIOS to `emulation/bios/psx/`.
- [ ] Convert the Wii U game to `.wua` in Cemu's Title Manager.
