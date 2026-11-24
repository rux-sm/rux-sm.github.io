---
type: plan
---

# Plan: Rux Emu on a Windows PC

## Goal

A Windows PC plays the collection as a Mac does. Play, Download, Install,
Remove and carrying saves through Supabase all work from the same site, through
a Windows Rux Emu Helper. The site already shows the collection on any
browser; only the helper and what it reads are Mac-only today:
`emu/helper/main.swift`, the `~/Library` folders and `.app` names in
`emu/emulators.json`, and the Mac test in `emu/helper.js`.

## Decisions

- **The Windows helper answers the same calls as the Mac's, on the same
  `127.0.0.1:47647`,** so the site talks to both the same way and barely
  changes.
- **Those calls are written down once, in `emu/docs/helper-calls.md`,** moved
  from the top of `emu/helper/main.swift`, since two helpers now keep to them.
- **It is written in C# on .NET, in `emu/helper-windows/`,** because .NET
  builds on this Mac for Windows as one file that needs nothing installed, and
  reaches the tray, the Recycle Bin, the registry and controllers.
- **It sits in the tray, starts at sign-in, and registers `rux-emu://`,** as
  the Mac's sits in the menu bar, so the site can start it the same way.
- **The PC's library is `%USERPROFILE%\Emulation\roms\<system>\`,** laid out
  as the Mac's, so a game's path means the same on both.
- **Each emulator is installed portable, in its own folder under
  `%LOCALAPPDATA%\Rux Emu\emulators\`,** where its project offers that, so its
  saves and settings sit in one known place and nothing needs an installer.
- **`emulators.json` gains each emulator's Windows facts beside the Mac's:**
  its program, its folder and where it saves, so the scan, the site and both
  helpers keep reading one file.
- **A PC's saves are carried through Supabase exactly as a Mac's are,** so a
  game saved on the PC continues on the Mac and back.
- **Removing sends files to the Recycle Bin,** as the Mac's helper uses the
  Trash.
- **The Back-and-Start quit combo works on the PC too,** read from the
  controller through Windows' own controller support.
- **The site says "this computer" where it may be a Mac or a PC,** and shows
  the Play area on any desktop whose helper answers, not only on a Mac.
- **Each Windows build and installer is named with `-Windows`,** as the Mac's
  carry `-macOS`, so the scan, Status and Emulators offer each computer its
  own.

## Questions

- **Which Windows PC will play?** The old PC now runs TrueNAS, and a session
  needs a PC to test each step on; without one, the work stops at what this
  Mac can prove.
- **Sign the Windows helper, or not?** Unsigned is free, but Windows warns
  "unknown publisher" on each new build until you press Run anyway. Azure
  Trusted Signing is about $10 a month and stops the warning. Recommended:
  unsigned first, signing later if the warning annoys you.

## Tasks

- [ ] Move the helper's calls to `emu/docs/helper-calls.md` and link
  `emu/helper/main.swift` and `emu/helper.js` to it.
- [ ] Add each emulator's Windows program, portable folder, save places and
  launch to `emu/emulators.json`, each checked against its project's own docs.
- [ ] Put each emulator's Windows build in the server's emulators folder, and
  have Status and Emulators offer the one for this computer.
- [ ] Write the Windows helper in `emu/helper-windows/`: Status, Play,
  Download, Library, Install, Remove, settings, carried and given files,
  saves, self-update and the quit combo.
- [ ] Teach `emu/tools/build-helper.mjs` to build the Windows zip.
- [ ] Record which system each computer runs in `emu_macs`, as a database
  change shown first, if its columns cannot already say Windows.
- [ ] Change the site's Mac test and its "this Mac" words where a PC counts.
- [ ] Write the PC's setup in `emu/docs/emulator-setup.md`.
- [ ] On the PC: install the helper, then Play, Download, carry a save to the
  Mac and back, Install, Remove, the quit combo and an update.
