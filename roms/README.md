# Roms

The game collection on rux's portable drive: every game, which version it
is, and what needs fixing — one app on [design](../design/), served at
**rux-sm.github.io/roms/**.

The repository root's `AGENTS.md` is the policy, and
`docs/plans/roms-app.md` is what is still to build.

## What it is

`index.html` is the Collection: every game the last scan found, with search
and a filter per system and per status, a table on a wide screen and a list
on a phone. A game's status is its worst problem, as Problems lists them, or Good.
A game opens in a side panel with everything the scan read: its region,
version and format, each file's header and fingerprints, a Switch game's
update and add-ons, and its saves; rux's marks, played, finished and
favourite, and a note on it are saved from there.

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
by system, each with its kind, dates and rux's note on it.

`emulators.html` shows each system's emulator from `emulators.json`, why it
is the one, each file it needs and whether the drive holds it, and where its
saves, settings and installer live. `docs/emulator-setup.md` is how each is
set up on a Mac.

`import.html` takes a scan file and the backup zip of the same date, read on
this device, shows how many games are new, changed or gone since the last
save, and saves on a yes. Saving writes every game and save in the scan,
leaving rux's notes, moves the notes of a game the organize tool renamed,
removes what is no longer on the drive, replaces the BIOS list and the
drive's row, and uploads the zip to the `roms-backups` bucket, which keeps
every backup of the last 30 days and the newest of each month before.

## The scan

    node roms/tools/scan-roms.mjs "/Volumes/<drive>/emulation"

`tools/scan-roms.mjs` reads every game in the drive's emulation roms folder
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
Switch game against titledb's versions list; `tools/lib/lists.mjs` says how.
A CHD is matched by the tracks inside it, which chdman extracts once.

    node roms/tools/organize-roms.mjs "/Volumes/<drive>/emulation"          what it would do
    node roms/tools/organize-roms.mjs "/Volumes/<drive>/emulation" --yes    do it

`tools/organize-roms.mjs` turns PlayStation BIN and CUE games and PlayStation
2 ISOs into CHDs, adds a playlist beside a game on more than one disc, and
renames every other file and its saves to its list name, keeping each
rename for Import. It touches only games whose every
file is on the list, checks each CHD before its original moves, and moves
originals to a to-delete folder on the drive instead of deleting them. Scan
again after it. chdman comes from Homebrew's `rom-tools`.

    node roms/tools/backup-saves.mjs "/Volumes/<drive>/emulation"

`tools/backup-saves.mjs` is each Mac's copy: the newest backup zip, and the
firmware and installers too large for Supabase, into
`~/Documents/Roms backups/`, recorded on the drive for the Saves page.

## How it works

`roms_games`, `roms_bios`, `roms_saves` and `roms_drive` hold the last scan
saved, `roms_notes` rux's marks and notes, and the `roms-backups` bucket the
backup zips; only the owner reads them, and `docs/database-access.md` is the
rule. Nothing from the
collection is ever written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `emulators.json` | each system's emulator, why, how it names a save and what it needs; the scan reads it too |
| `app.js` | the systems, each one's preferred format, what each emulator needs, a game's problems and status, sizes and dates |
| `collection.js`, `problems.js`, `saves.js`, `emulators.js`, `import.js` | each page's own behaviour |
| `app.css` | the filters, rows and the side panel's facts, under `roms-` |
| `overrides.css` | the side panel hidden when closed and full width on a phone |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
