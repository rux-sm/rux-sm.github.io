---
type: plan
---

# Plan: Rux Emu Helper, the Mac's sidekick

## Goal

A small Mac app, Rux Emu Helper, installed with one double-click, that the
Rux Emu site talks to: Play starts a game at once, Status and Update read
the Mac and the collection live, and Set up this Mac installs and points
every emulator, so a new Mac plays in one step, from the T7 now and from the
home server later. The site's other plans are `docs/plans/emu-app.md`,
`docs/plans/emu-front-end.md` and `docs/plans/emu-server.md`.

## Decisions

- **It is a Swift app, `Rux Emu Helper.app`, built from `emu/helper/`,**
  because a new Mac has no Node, and Swift needs nothing beside the app.
- **It starts at log-in, with no window and an icon in the menu bar** that
  says whether it has the collection and has Quit; macOS asks once to open
  it, since it is not from the App Store.
- **The site starts it when it is not running,** through a `rux-emu://` link
  the helper registers, since a page cannot start an app any other way; Chrome
  asks once, and Always allow keeps it from asking.
- **The site talks to it on `127.0.0.1` only,** never the network, and it
  answers only requests from the Rux Emu site; Chrome asks once whether the
  site may reach this Mac, and Allow keeps it.
- **It opens only a game file inside the collection's `roms/` folder, in
  that system's emulator,** with the same command ES-DE uses, so nothing the
  site sends can open anything else.
- **The collection is wherever it is found:** the T7 now, the home server's
  share later, and the helper tells the site which.
- **Set up this Mac follows `emu/docs/emulator-setup.md`:** it installs each
  emulator from the installers kept beside the games, copies the
  keys and firmware, and writes each emulator's settings so it reads games
  from and saves to the collection; the how-to stays the record of what it
  does.
- **The helper is kept beside the games and built by
  `emu/tools/build-helper.mjs`,** so the T7 or the server always carries the
  version that matches the site.
- **It replaces the test shortcut, Rux Emu Open, and in time
  `Check this Mac.command` and the folder Update asks for,** since the
  helper reads the Mac and the collection itself.

## Questions

None open.

## Tasks

- [ ] Delete the test shortcut, Rux Emu Open, in Shortcuts.
- [ ] Run Update through the helper, with no folder to choose, and retire
  `Check this Mac.command`.
- [ ] Add Set up this Mac, installing and pointing every emulator.
- [ ] Read the collection from the home server's share once it is built.
