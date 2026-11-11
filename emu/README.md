# Emu

The game collection on rux's portable drive: every game, which version it
is, and what needs fixing — one app on [design](../design/), served at
**rux-sm.github.io/emu/**.

The repository root's `AGENTS.md` is the policy, and
`docs/plans/emu-app.md` is what is still to build.

## What it is

`index.html` is the Library: the recently played and the favourites as
shelves of box art from libretro's thumbnails, then a tile for each system,
showing its console, that opens its games as a grid. `collection.html` is the
same games as a table, with a filter per system and per status. A game's
status is its worst problem, as Problems lists them, or Good. A game opens
in a side panel, `game-panel.js`, with its cover and Play on the Library,
which asks Rux Emu Helper, then its region, version and format, each file's
header and fingerprints, a Switch game's add-ons, its saves, and rux's notes.
Search, in every page's header, `search.js`, finds any game by its title
and opens it on the Library; ⌘K opens it too.

`problems.html` lists every game that needs a look, under one heading per
kind, worst first: a missing disc or track, a copy not on the list, a bad
header, an encrypted 3DS copy, a game to convert or rename, the newest
revision or update when the drive holds an older one, a converted game's
original still in the drive's to-delete folder, a BIOS file an emulator
needs, and a save whose game is not on the drive. It says when that folder
is safe to empty:
when every game converted from what is in it is marked as playing.

`saves.html` shows the three copies of the saves, on the drive, in Supabase
and on each Mac, with each backup in Supabase to download; then every save
by system, on the drive or a Mac, each with its kind, dates, how to restore
it and rux's note on it.

`status.html` starts with Update, which scans the drive through Rux Emu
Helper on a Mac, and runs by itself when the page opens and the helper has
the drive. It shows how many games are new, changed or gone since the last
save, and whether this Mac changed, and saves on a yes: every game and save in the scan, leaving
rux's notes, moving the notes of a game the organize tool renamed, removing
what is no longer on the drive, replacing the BIOS list and the drive's
row, uploading the backup zip to the `emu-backups` bucket, which keeps
every backup of the last 30 days and the newest of each month before, and
this Mac's report with any save it keeps itself. It writes the scan, the
fingerprints and the zip back to the drive, as the Mac scan does.

Then it says what is done and what is left. For the drive, from its last
scan: each BIOS a system with games needs, each emulator's installer
kept and whether its project has a newer one out, and saves still in a folder from before each emulator had its own.
For this Mac live from the helper, and each other as Update last saved it,
folded shut below it until opened: ES-DE reading the drive's games, each
emulator saving into its folder on the drive, and each retired app in
`emulators.json` still there or still holding files. Installing an app is
what says a Mac plays with it, so one not installed is grey, and red only
when its old folder still holds saves. An emulator whose systems have no
games is not needed yet.

`emulators.html` shows one profile per emulator from `emulators.json`, each
a fold Status links to: its version on the drive and each Mac, each file it
needs, every kind of file it writes with the setting that moves it, the
settings to have, and what is worth knowing. `docs/emulator-setup.md` is how
each is set up on a Mac.

## The scan

    node emu/tools/scan-roms.mjs "/Volumes/<drive>/emulation"

`tools/scan-roms.mjs` runs `scan.js`, the scan the Status page will run
too, which reads every game in the drive's emulation roms folder
and the BIOS in its bios folder, and writes the scan and the kept
fingerprints to a scans folder beside them, on the drive, and packs the
saves, BIOS and keys into a zip in its backups folder. It reads the games
and never changes them. Each save is matched to its game the way its
emulator names it, by file name, title ID, disc ID or serial, as
`emulators.json` says for each system. The first scan fingerprints every file; the next
reads only files that are new or changed. `--headers-only` skips the
fingerprints, for a quick look. Key files among the BIOS are listed by name
and never read.

When the drive's emulation folder holds a lists folder, every game is matched
against the No-Intro and Redump lists as libretro publishes them, and every
Switch game against titledb's versions list; `scan.js` says how.
A CHD is matched by the tracks inside it, which the organize tool keeps when
it makes the CHD, or chdman extracts once on a Mac.

    node emu/tools/organize-roms.mjs "/Volumes/<drive>/emulation"          what it would do
    node emu/tools/organize-roms.mjs "/Volumes/<drive>/emulation" --yes    do it

`tools/organize-roms.mjs` turns PlayStation BIN and CUE games and PlayStation
2 ISOs into CHDs, adds a playlist beside a game on more than one disc, and
renames every other file and its saves to its list name, keeping each
rename for the next save. It touches only games whose every
file is on the list, checks each CHD before its original moves, and moves
originals to a to-delete folder on the drive instead of deleting them. Scan
again after it. chdman comes from Homebrew's `rom-tools`.

    node emu/tools/backup-saves.mjs "/Volumes/<drive>/emulation"

    node emu/tools/build-helper.mjs "/Volumes/<drive>/emulation"

`tools/build-helper.mjs` builds Rux Emu Helper from `helper/main.swift` and
puts it on the drive with `Install Rux Emu Helper.command`, which copies it
into Applications. The menu bar helper answers only the Rux Emu site, on
`127.0.0.1:47647`, with the calls `helper/main.swift` lists: Play, this Mac
as it stands with the saves it keeps itself, the drive for Update's scan,
and each emulator's newest version out, asked of its project's feed. The app carries its own `emulators.json`, so build it again after a
change.

`tools/backup-saves.mjs` is each Mac's copy: the newest backup zip, and the
firmware and installers too large for Supabase, into
`~/Documents/Emu backups/`, recorded on the drive for the Saves page.

## How it works

`emu_games`, `emu_bios`, `emu_saves` and `emu_drive` hold the last scan
saved, `emu_macs` how each Mac stood, `emu_notes` rux's marks and notes, and
the `emu-backups` bucket the backup zips; only the owner reads them, and
`docs/database-access.md` is the rule. Nothing from the collection is ever
written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `emulators.json` | each system's emulator, why, how it names a save, what it needs and how it opens a game; and each emulator's profile: where it keeps saves on a Mac, every other file it writes by class, the settings to have and its notes; the scan and the helper read it too |
| `helper/main.swift` | Rux Emu Helper, the menu bar app the site asks to play a game, read this Mac and read and write the drive |
| `scan.js` | the scan, for the Mac tool and the page alike |
| `drive.js` | the drive as `scan.js` reads it, through the helper |
| `zip.js` | the backup zip, packed in the page |
| `saves-rules.js` | which game a save belongs to, for the scan and the Saves page alike |
| `app.js` | the systems, each one's preferred format, what each emulator needs, a game's problems and status, sizes and dates |
| `update.js` | Update, on the Status page |
| `game-panel.js`, `helper.js`, `gamepad.js` | one game in the side panel; asking Rux Emu Helper to play and to read this Mac; a controller as moves |
| `library.js`, `collection.js`, `problems.js`, `saves.js`, `status.js`, `emulators.js` | each page's own behaviour |
| `search.js` | Search, in every page's header |
| `app.css` | the filters, rows and the side panel's facts, under `emu-` |
| `overrides.css` | the side panel hidden when closed and full width on a phone; a search result as a row, not a link |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
