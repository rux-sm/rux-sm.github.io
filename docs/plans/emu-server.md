---
type: plan
---

# Plan: Emu's home server and setup kit

## Goal

The game collection lives on rux's old gaming PC, at home, instead of on the
T7 carried between Macs, and any Mac, at home or away, is set up in one
step and downloads the games it plays from it through the Emu app. The rest of
Emu is `docs/plans/emu-app.md`.

## Decisions

The home server, so the drive is not carried between Macs:

- **Until the server is built, the T7 stays the games' home,** carried
  between Macs as now.
- **rux's old gaming PC becomes the games' home,** holding the games and the
  dated backup; everything else is in Supabase, as
  `docs/plans/emu-emulator-profiles.md` says. It only stores, and every game
  is played on another machine.
- **The collection lives on two matching 8 TB CMR NAS hard drives,
  mirrored,** about 7 TB usable for a collection of 800 GB that grows by
  hundreds at a time; hard drives cost a third of SSDs per terabyte, and the
  network, not the drives, sets the speed. The T7 stays a copy, and Supabase
  the saves'.
- **The drives are CMR, never SMR,** since an SMR drive slows to a crawl
  rebuilding a ZFS mirror.
- **TrueNAS runs from the PC's 1 TB NVMe, in place of Windows,** which the
  PC no longer needs, so no boot drive is bought; TrueNAS takes its whole
  boot drive and keeps no files there.
- **Its 32 GB of memory is ZFS's cache,** so listings, the nightly scan and
  repeated reads come from memory, not the disks.
- **It is on wired Ethernet,** since TrueNAS has no Wi-Fi.
- **It runs TrueNAS Community Edition,** free storage software made for a
  mirrored pair, which shares the collection over the network to Macs and,
  later, a PC.
- **It runs with no screen, managed from a browser;** its i7-13700K's
  built-in graphics shows the installer once, so it needs no graphics card.
- **Tailscale reaches it from anywhere,** for the Mac that is not at home.
- **A Mac plays from its own copy of a game,** downloaded from the app, so a
  game never loads over the network and plays the same at home or away.
- **Saves are kept on each Mac and carried to and from Supabase,** as
  `docs/plans/emu-emulator-profiles.md` says, since an emulator writing a
  save over the network loses it if the connection drops.
- **The server scans itself every night and saves the scan to Supabase,**
  with a key kept only on the server, so Update is needed only for the T7.
- **Download to this Mac, in a game's side panel,** writes the game into the
  Mac's own library folder, under its system's folder as on the server,
  with a multi-disc game's playlist and a Switch game's update and add-ons;
  Remove from this Mac frees the space. Play opens a game from there.
- **The download goes straight into the folder through Chrome,** which lets a
  page write into a folder rux chooses once; Safari cannot, so the app says
  to use Chrome for it.
- **The server sends a game only to Tailscale devices,** over HTTPS at its
  Tailscale address, answering only the app's own site.
- **The Collection marks what this Mac holds,** from the library folder it
  reads, so a game to download and one ready to play are told apart.
- **The T7 becomes the travel copy and the server's backup,** refreshed from
  it.

The setup kit, so any Mac is set up in one step:

- **`emu/tools/build-kit.mjs` downloads each emulator's Mac installer,** from
  the project's own releases on a yes, into Supabase's `emulators/mac/`,
  with each download's address in `emulators.json`.
- **Rux Emu Helper sets up a Mac from those copies,** as
  `docs/plans/emu-helper.md` says, pointing each emulator at the Mac's
  library folder.
- **A PC follows the same way later,** from `emulators/windows/`, where
  nearly every emulator runs portably and needs no install.

## Questions

- Should every Mac backup folder become the server's, now the server holds
  a copy and the T7 another?

## Tasks

- [ ] Check the case has two free 3.5" bays and the board two free SATA
  ports, then buy two 8 TB WD Red Plus (WD80EFPX), with SATA cables if the
  board came without spares.
- [ ] Copy off anything wanted from the PC's Windows, then install TrueNAS on
  its 1 TB NVMe, make the mirrored pool and share the collection, and copy
  it on.
- [ ] Add Tailscale on the server and each Mac.
- [ ] Run the scan on the server each night, saving to Supabase with a key
  kept there.
- [ ] Serve the games over HTTPS on Tailscale, and add Download to this Mac,
  Remove from this Mac and the mark of what this Mac holds.
- [ ] Write `emu/tools/build-kit.mjs` and the download addresses.
