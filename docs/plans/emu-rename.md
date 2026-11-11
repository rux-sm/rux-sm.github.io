---
type: plan
---

# Plan: Emu becomes Rux Emu

## Goal

The app is Rux Emu, at `/emu/`, because it now keeps the emulators, saves,
backups and each Mac's setup as well as the game files. Every name derives
from the one word, Emu: the folder and address `emu/`, the header Rux Emu,
the class prefix `emu-`, the commit scope `emu`, the database tables
`emu_*` and the bucket `emu-backups`.

## Decisions

- **One commit moves `roms/` to `emu/`** with `git mv`, renames every
  `roms-` class, the `window.Emu` global, the page titles and the header,
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
  in the same migration, the four backups in `emu-backups` are copied across
  signed in as rux, and `emu-backups` is deleted in the dashboard once the
  copies are checked.
- **The drive's `Check this Mac.command` opens `/emu/status.html`,** put on
  the drive again by `check-mac.mjs --install`.
- **The app keeps its icon;** only its name changes.
- **`/roms/` finds nothing once the app moves,** since nothing points at it.

## Questions

None open.

## Tasks

- [ ] Delete the `roms-backups` bucket in the dashboard, now its four
  backups are in `emu-backups`, then drop its four owner rules on a yes.
