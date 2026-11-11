---
type: plan
---

# Plan: Roms becomes Rux Emu

## Goal

The app is Rux Emu, at `/emu/`, because it now keeps the emulators, saves,
backups and each Mac's setup as well as the game files. Every name derives
from the one word, Emu: the folder and address `emu/`, the header Rux Emu,
the class prefix `emu-`, the commit scope `emu`, the database tables
`emu_*` and the bucket `emu-backups`.

## Decisions

- **One commit moves `roms/` to `emu/`** with `git mv`, renames every
  `roms-` class, the `window.Roms` global, the page titles and the header,
  and updates `switcher.json`, the Names table in `AGENTS.md`,
  `docs/database-access.md` and `tools/inline-sprite.mjs`; the plans
  `roms-*.md` become `emu-*.md`.
- **What names the game files keeps "roms":** the drive's `roms/` folder
  and the tools that act on game files, `scan-roms.mjs` and
  `organize-roms.mjs`, since those are ROMs, not the app.
- **The six tables are renamed in one migration,** `alter table … rename`,
  which keeps their rows, their `owner_all` rule and their grants; it is
  shown to rux, applied on a yes, and the push follows at once, since the
  published pages read the new names.
- **Supabase cannot rename a bucket, and SQL cannot make or drop one,** so
  `emu-backups` is made private in the dashboard, its four owner rules come
  in the same migration, the four backups in `roms-backups` are copied across
  signed in as rux, and `roms-backups` is deleted in the dashboard once the
  copies are checked.
- **The drive's `Check this Mac.command` opens `/emu/status.html`,** put on
  the drive again by `check-mac.mjs --install`.
- **The app keeps its icon;** only its name changes.

## Questions

- `/roms/` will find nothing once the app moves, as GitHub Pages has no
  redirects. Is a bookmark or a phone home-screen icon pointing at it? If
  so, a page at `/roms/` that sends on to `/emu/` keeps it working.

## Tasks

- [ ] Move `roms/` to `emu/` and rename every name above, with the checks
  passing.
- [ ] Show rux the migration for the tables and the bucket rules, and apply
  it on a yes, then push.
- [ ] Make `emu-backups` in the dashboard, copy the four backups across, and
  delete `roms-backups` once they are checked.
- [ ] Put the new `Check this Mac.command` on the drive, and check every page
  in Chrome on :8641.
