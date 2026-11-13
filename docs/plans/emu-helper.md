---
type: plan
---

# Plan: Rux Emu Helper, the Mac's sidekick

## Goal

A small Mac app, Rux Emu Helper, installed with one double-click, that the
Rux Emu site talks to: Play starts a game at once, Status and Update read
the Mac and the collection live, and Set up this Mac installs and points
every emulator, so a new Mac plays in one step, from the T7 or the home
server. The site's other plans are `docs/plans/emu-app.md`,
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
- **It opens only a game file inside a `roms/` folder, this Mac's library's
  or a plugged-in drive's, in that system's emulator,** with the same command
  ES-DE uses, so nothing the site sends can open anything else.
- **The collection is wherever it is found:** the T7 plugged in or the home
  server's share mounted, and the helper tells the site which.
- **Set up this Mac follows `emu/docs/emulator-setup.md`:** it installs each
  emulator from the installers Supabase holds, by links the site signs,
  takes the keys and firmware the same way, and writes the settings Emu
  manages, as
  `docs/plans/emu-emulator-profiles.md` lists them; the how-to stays the
  record of what it does.
- **The helper is kept beside the games and built by
  `emu/tools/build-helper.mjs`,** so the T7 or the server always carries the
  version that matches the site.
- **It replaces the test shortcut, Rux Emu Open,** since the site starts
  games through it.
- **Set up this Mac is one press on the Status page,** shown while any
  emulator whose systems have games is missing or older than the installer
  Supabase holds: it installs each, then starts each from the preferred
  settings and brings its BIOS, keys and firmware, as a first Play does, so
  the first game played opens with its saves. ES-DE is not installed.
- **The helper updates itself on a press,** offered on every page while
  Supabase holds a newer one: it fetches its own zip by a link the site
  signs, checks it, puts it in Applications and starts it, since a new build
  otherwise means copying it from the server by hand on each Mac.
- **It is signed with one lasting identity, a free certificate made in
  Keychain Access,** so macOS keeps each permission it gave across builds
  instead of asking again for the drive or the share after every one; every
  Mac then behaves alike, allowing the helper once by hand and never again.
  A paid Developer ID is not used.
- **The certificate lives in the keychain of each Mac that builds the
  helper,** exported once from the first and imported on another, since a
  build signed by a second certificate is a different app to macOS.

## Questions

None open.

## Tasks

- [ ] Delete the test shortcut, Rux Emu Open, in Shortcuts.
- [ ] Have the helper update itself on a press, from the newest zip
  Supabase holds.
- [ ] Add Set up this Mac to the Status page.
