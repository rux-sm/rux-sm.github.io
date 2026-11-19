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
  drive or share goes from `emu/this-mac.js`, `emu/room.js` and the helper's
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
  two days, and says the server's scan is late.
- **Every page's words for a drive go:** Status, Saves, Problems, Collection
  and Emulators say "the server" or "this Mac" where they said "the drive".

## Questions

- `emu/tools/organize-roms.mjs` renames and converts games on a drive before
  a scan. Should it run against the server's `games` folder instead, or go?
- `emu/tools/scan-roms.mjs` also scans a drive from a Mac without `--save`.
  Should that mode go, keeping only the server's nightly `--save`?
- The `emu_drive` table holds the last scan's time, its backup and the
  newest emulator versions. Rename it `emu_scan` by a migration, or keep the
  name?
- `docs/plans/emu-server.md` keeps the T7 as the server's backup and a
  travel copy. Does the travel copy go, leaving the T7 only as the server's
  backup?
- Is two days right for "Needs sync", given the scan runs nightly?

## Tasks

- [ ] Drop the collection, `/drive` and play-from-collection from
      `emu/helper/main.swift`, bump its version, build it with
      `emu/tools/build-helper.mjs` and put it in Supabase.
- [ ] Remove Update from Status with `emu/update.js` and `emu/drive.js`, and
      Status's drive sections.
- [ ] Remove play-from-drive from `emu/this-mac.js` and `emu/room.js`, so a
      game not here says to download it.
- [ ] Point "Needs sync" at the nightly scan's age.
- [ ] Remove the drive's words from every Emu page and `emu/README.md`.
- [ ] Settle the tools and the table by the answers above.
- [ ] Update each Mac to the new helper and play a downloaded game on each.
