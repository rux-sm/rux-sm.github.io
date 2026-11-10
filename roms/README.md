# Roms

The game collection on rux's portable drive: every game, which version it
is, and what needs fixing — one app on [design](../design/), served at
**rux-sm.github.io/roms/**.

The repository root's `AGENTS.md` is the policy, and
`docs/plans/roms-app.md` is what is still to build.

## What it is

`index.html` is the Collection: every game the last scan found, with search
and a filter per system and per status, a table on a wide screen and a list
on a phone. A game's status is its worst problem: Incomplete, Bad header,
Encrypted, Convert when it is not in its system's preferred format, or Good.
A game opens in a side panel with everything the scan read: its region,
version and format, each file's header and fingerprints, and a Switch
game's update and add-ons.

`import.html` takes a scan file, read on this device, shows how many games
are new, changed or gone since the last save, and saves on a yes. Saving
writes every game in the scan, removes the ones no longer on the drive, and
replaces the BIOS list.

## The scan

    node roms/tools/scan-roms.mjs "/Volumes/<drive>/emulation"

`tools/scan-roms.mjs` reads every game in the drive's emulation roms folder
and the BIOS in its bios folder, and writes the scan and the kept
fingerprints to a scans folder beside them, on the drive. It reads the games
and never changes them. The first scan fingerprints every file; the next
reads only files that are new or changed. `--headers-only` skips the
fingerprints, for a quick look. Key files among the BIOS are listed by name
and never read.

## How it works

Two tables, `roms_games` and `roms_bios`, hold the last scan saved, and only
the owner reads them; `docs/database-access.md` is the rule. Nothing from the
collection is ever written here, because this repository is public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `app.js` | the systems, each one's preferred format, a game's problems and status, sizes |
| `collection.js`, `import.js` | each page's own behaviour |
| `app.css` | the filters, rows and the side panel's facts, under `roms-` |
| `overrides.css` | the side panel hidden when closed and full width on a phone |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
