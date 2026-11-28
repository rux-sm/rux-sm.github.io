---
type: plan
---

# Plan: Emu without a drive

## Goal

Emu stops reading a drive or a mounted share on any Mac. The home server's
nightly scan is the only scan of the collection, a game reaches a Mac only
by downloading it into that Mac's library, and saves, settings, BIOS, keys
and installers come from Supabase. Every page, the helper and the tools
lose the code and the words for a drive, so nothing is left that only a
plugged-in drive would use. The server's own scan of its `games` folder
stays, since that is the server reading its own disk.

## Decisions

- **The home server's nightly scan, `emu/tools/scan-roms.mjs --save`, is
  the only scan.** Status's Update, which scans a drive from a Mac through
  the helper, goes, with `emu/update.js` and `emu/drive.js`.
- **A game plays only from this Mac's library.** Playing straight from a
  drive or share goes from `emu/this-mac.js`, `emu/library.js` and the helper's
  `/play`, so a game not downloaded says "Download it first."
- **Rux Emu Helper stops looking for a collection.** It drops `collection()`,
  every `/drive` call and the collection in `/status`, and its menu-bar
  title stops naming a drive. It ships as the next version, which each Mac
  takes from Status's "Update the helper".
- **Nothing is written beside the games from a Mac:** the fingerprints, the
  scan file and the dated backup zip Update wrote to the drive go. The zip's
  replacement, built from Supabase, stays a task of
  `docs/plans/emu-emulator-profiles.md`.
- **The strip's "Needs sync" follows the server's nightly scan,** since no
  Mac can scan any more: it shows when the last scan saved is older than
  two days, one missed night's grace, and says the server's scan is late.
- **Every page's words for a drive go:** Status, Saves, Problems, Collection
  and Emulators say "the server" or "this Mac" where they said "the drive".
- **`emu/tools/organize-roms.mjs` runs against the server's `games` folder,**
  renaming and converting there before the nightly scan.
- **`emu/tools/scan-roms.mjs` keeps only its `--save` mode,** the server's
  nightly scan; its run from a Mac against a drive goes.
- **The last scan's row is `emu_scan`,** since it holds the last scan's time
  and the newest emulator versions, not a drive.
- **The T7 is only the server's backup,** never a travel copy, as
  `docs/plans/emu-server.md` now says.

- **`location: 'drive'` in `emu_saves` stays as data,** marking a save in
  the server's `saves/` folder; only the words shown change.

- **Status saves this Mac each time it opens,** with no button: its report
  to `emu_macs` and the saves it keeps itself, which Update saved before.
- **The nightly scan keeps its scan file beside its fingerprints in
  `$CACHE`,** and `emu/tools/organize-roms.mjs` reads and writes them there,
  since the server mounts the games read-only.
- **`emu/tools/build-helper.mjs` writes the helper's zip into the server's
  `emulators/` folder over its share,** and the nightly scan puts it in
  Supabase.
- **The old backups go:** `emu/tools/backup-saves.mjs`, `backups.json` and
  the drive's zip on Saves, so Saves shows what Supabase keeps until the
  backup built from Supabase lands.

## Questions

None open.

## Tasks

- [ ] Run `emu/tools/organize-roms.mjs` on the server where the scan's
      `scan-cache` volume is, as `emu/docs/home-server.md` should then say.
- [ ] Once the nightly scan has put Rux Emu Helper 47 in Supabase, update
      each Mac to it from Status and play a downloaded game on each.
