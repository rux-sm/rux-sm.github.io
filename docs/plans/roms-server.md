---
type: plan
---

# Plan: Roms' home server and setup kit

## Goal

The game collection lives on rux's old gaming PC, at home, instead of on the
T7 carried between Macs, and any Mac, at home or away, is set up from it in
one step and downloads the games it plays from the Roms app. The rest of
Roms is `docs/plans/roms-app.md`.

## Decisions

The home server, so the drive is not carried between Macs:

- **Until the server is built, the T7 stays the collection's home,** carried
  between Macs as now, and everything Roms does today reads it.

- **rux's old gaming PC becomes the collection's home,** holding the games,
  BIOS, keys, firmware, installers and backups; it only stores, and every
  game is played on another machine.
- **It starts on rux's spare SSD alone,** and a second drive of at least its
  size is attached later to mirror it, which TrueNAS does without starting
  over; until then the T7 is its copy, and Supabase the saves'.
- **It runs TrueNAS Community Edition,** free storage software made for a
  mirrored pair, which shares the collection over the network to Macs and,
  later, a PC.
- **It runs with no screen, managed from a browser;** the processor's
  built-in graphics shows the installer once, so it needs no graphics card.
- **Tailscale reaches it from anywhere,** for the Mac that is not at home.
- **A Mac plays from its own copy of a game,** downloaded from the app, so a
  game never loads over the network and plays the same at home or away.
- **Saves are kept on each Mac and mirrored to the server with Syncthing,**
  since an emulator writing a save over the network loses it if the
  connection drops; the server's copy is the one the scan reads.
- **The server scans itself every night and saves the scan to Supabase,**
  with a key kept only on the server, so Import is needed only for the T7.
- **Download to this Mac, in a game's side panel,** writes the game into the
  Mac's own library folder, under its system's folder as on the server,
  with a multi-disc game's playlist and a Switch game's update and add-ons;
  Remove from this Mac frees the space. ES-DE reads that folder.
- **The download goes straight into the folder through Chrome,** which lets a
  page write into a folder rux chooses once; Safari cannot, so the app says
  to use Chrome for it.
- **The server sends a game only to Tailscale devices,** over HTTPS at its
  Tailscale address, answering only the app's own site.
- **The Collection marks what this Mac holds,** from the library folder it
  reads, so a game to download and one ready to play are told apart.
- **The T7 becomes the travel copy and the server's backup,** refreshed from
  it.

The setup kit, so any Mac is set up from the server in one step:

- **`roms/tools/build-kit.mjs` downloads each emulator's Mac installer,** from
  the project's own releases on a yes, into the server's `emulators/mac/`,
  with each download's address in `emulators.json`.
- **`Set up this Mac.command` on the server** installs ES-DE and each
  emulator from those copies, copies the BIOS, keys and firmware, and writes
  each one's settings so it reads games from the Mac's library folder and
  keeps saves where Syncthing mirrors them.
- **The Emulators page is the kit's checklist:** each emulator's Mac copy
  and version on the server, and whether this Mac's settings point at it.
- **A PC follows the same way later,** from `emulators/windows/`, where
  nearly every emulator runs portably and needs no install.

## Questions

- How big is the spare SSD, and is it SATA or NVMe? Its size is how much
  the server holds until a second drive mirrors it.
- Should every Mac backup folder become the server's, now the server holds
  a copy and the T7 another?

## Tasks

- [ ] Confirm the processor has built-in graphics: a model ending in F, or
  an AMD one before the 7000 series without a G, has none.
- [ ] Put the SSD in the PC, install TrueNAS, and share the collection; copy
  the T7 onto it.
- [ ] Add Tailscale and Syncthing on the server and each Mac.
- [ ] Run the scan on the server each night, saving to Supabase with a key
  kept there.
- [ ] Serve the games over HTTPS on Tailscale, and add Download to this Mac,
  Remove from this Mac and the mark of what this Mac holds.
- [ ] Write `roms/tools/build-kit.mjs`, the download addresses, and
  `Set up this Mac.command`, and show the kit on the Emulators page.
