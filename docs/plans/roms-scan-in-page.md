---
type: plan
---

# Plan: Scan from the Status page

## Goal

The Status page keeps itself current with one button: Update reads the
drive and this Mac's report in Chrome and saves them, so no Terminal, no
Import page and no Saves page upload are needed. The rest of Roms is
`docs/plans/roms-app.md`; when the home server exists, its nightly scan
(`docs/plans/roms-server.md`) does the same without the button.

## Decisions

- **Update, on the Status page, scans the drive in Chrome, and only
  Chrome.** Chrome lets a page read a folder rux picks once and remembers
  it, as the Saves page already does; Safari cannot, so there the page says
  to use Chrome, and the rest of Roms keeps working in Safari and on the
  phone.
- **The scan is one module that both Node and the page run,** as
  `roms/saves-rules.js` is, so the page and `scan-roms.mjs` never read a
  game differently. Reading files, hashing and the lists move into it;
  `scan-roms.mjs` becomes a thin Node wrapper kept for the server.
- **Fingerprints are hashed in the page with a WebAssembly hash library,**
  CRC32, MD5 and SHA-1 in one pass, because Chrome's own crypto has no MD5
  and cannot hash a file in pieces. Only new or changed files are hashed,
  from `scans/fingerprints.json` on the drive, as now.
- **The page never runs chdman.** A CHD's content fingerprints come from
  `fingerprints.json`, which the organize tool writes when it makes the
  CHD; a CHD it did not make is listed as not fingerprinted yet, and the
  organize tool fills it in.
- **The page packs the backup zip itself,** saves, BIOS and keys,
  uncompressed, and uploads it as Import does now.
- **Update shows what changed before saving:** games new, changed and gone,
  and saves on a yes, as Import does; the Import page goes.
- **This Mac's apps and settings still need one double-click,** because
  Chrome keeps `/Applications` and `~/Library` from every page.
  `Check this Mac.command` on the drive writes this Mac's report into the
  drive's `macs/` folder, so the same remembered folder carries it, and
  Update saves it with the scan.
- **Saves live on the drive now,** so the Mac report says what is installed
  and where each emulator saves, and copies only a save still kept on the
  Mac; the Saves page's own upload goes.
- **Update runs on its own when Status opens** and Chrome already allows
  the folder, since a scan reads only what changed; a click runs it again,
  and nothing is saved until rux says yes.
- **Update writes the page's progress as it goes,** files read and hashed
  and time left, and a scan stopped part way saves nothing.

## Questions

None open.

## Tasks

- [ ] Move the scan's reading, hashing and list matching from
  `roms/tools/scan-roms.mjs` and `roms/tools/lib/lists.mjs` into one shared
  module, with `scan-roms.mjs` calling it, and prove the Node scan's output
  is unchanged against today's scan.
- [ ] Run the shared module in the page over the drive folder with a
  WebAssembly hash library, and compare its output with the Node scan's.
- [ ] Pack the backup zip in the page.
- [ ] Turn `gather-saves.mjs` into `Check this Mac.command`, writing to the
  drive's `macs/` folder.
- [ ] Add Update to the Status page with the change summary and the save,
  remove the Import page and the Saves page upload, and update the README
  and `roms/docs/emulator-setup.md`.
