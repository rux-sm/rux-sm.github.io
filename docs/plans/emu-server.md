---
type: plan
---

# Plan: Emu's home server and setup kit

## Goal

The game collection lives on rux's old gaming PC, at home, on one 4 TB hard
drive that a second later makes a mirror, instead of on the T7 carried
between Macs, and any Mac, at home or away, is set up in one step and
downloads the games it plays from it through the Emu app. The rest of Emu is
`docs/plans/emu-app.md`.

## Decisions

The server, rux's old gaming PC, and what each part does:

| Part | What it is | Its job |
| :--- | :--- | :--- |
| Processor | Intel Core i7-13700K | runs TrueNAS, with power to spare |
| Graphics | Intel UHD Graphics 770, built in | shows the installer once; no graphics card |
| Board | MSI MPG Z690 EDGE WIFI DDR4 (MS-7D31) | six SATA ports, so the hard drive needs no card |
| Memory | 32 GB DDR4-3600, two 16 GB Corsair Vengeance | ZFS's cache |
| Solid-state drive | Samsung 980 PRO 1 TB NVMe | TrueNAS's boot drive |
| Hard drive | WD Red Plus 4 TB (WD40EFPX), CMR | the collection |
| Network | Intel I225-V 2.5 GbE, linked at 1 Gbps | the wired connection TrueNAS uses |
| Wi-Fi | Intel Wi-Fi 6 AX201 | unused, since TrueNAS has no Wi-Fi |

The home server, so the drive is not carried between Macs:

- **Until the server is built, the T7 stays the games' home,** carried
  between Macs as now.
- **The PC becomes the games' home,** holding the games and the dated
  backup; everything else is in Supabase, as
  `docs/plans/emu-emulator-profiles.md` says. It only stores, and every game
  is played on another machine.
- **TrueNAS runs from the 980 PRO, in place of Windows,** which the PC no
  longer needs; TrueNAS takes its whole boot drive and keeps no files there,
  so the solid-state drive holds no games.
- **The collection lives on the one 4 TB WD Red Plus,** about 3.6 TB usable
  for a collection of 800 GB that grows by hundreds at a time; a hard drive
  costs a third of an SSD per terabyte, and the network, not the drive, sets
  the speed.
- **The drive is CMR, never SMR,** since an SMR drive slows to a crawl
  rebuilding a ZFS mirror, and every WD Red Plus is CMR.
- **The pool starts as a single drive and becomes a mirror** when a second
  matching 4 TB is extended onto it, which ZFS does in place with nothing
  copied off; a mirror is as big as its smaller drive, so the second matches.
- **Until the mirror, the T7 is the collection's only other copy,** since a
  single drive's nightly check finds a damaged file but has no second copy
  to mend it from.
- **The pool grows past 4 TB by replacing each drive with a bigger one,** one
  at a time, and takes the new size once both are replaced.
- **Its 32 GB of memory is ZFS's cache,** so listings, the nightly scan and
  repeated reads come from memory, not the disk.
- **It is on wired Ethernet,** since TrueNAS has no Wi-Fi; the router's
  1 Gbps, about 110 MB a second, is what a single hard drive keeps up with.
- **It runs TrueNAS Community Edition,** free storage software that shares
  the collection over the network to Macs and, later, a PC.
- **It runs with no screen, managed from a browser.**
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

- Does the case have a free 3.5" bay, or does the drive need a 3.5" mount?
- When is the second 4 TB bought, which ends the T7 being the only other
  copy?
- Should every Mac backup folder become the server's, now the server holds
  a copy and the T7 another?

## Tasks

- [ ] Fit the 4 TB WD Red Plus in a 3.5" bay on a SATA port, with the
  board's SATA cable and a power lead from the supply.
- [ ] Install TrueNAS on the 980 PRO over Windows, which holds nothing
  kept, make a single-drive pool on the 4 TB and share the collection, and
  copy it on from the T7 through a Mac, since TrueNAS cannot read the T7's
  APFS.
- [ ] Buy a second 4 TB WD Red Plus (WD40EFPX) and extend the pool onto it,
  making it a mirror.
- [ ] Add Tailscale on the server and each Mac.
- [ ] Run the scan on the server each night, saving to Supabase with a key
  kept there.
- [ ] Serve the games over HTTPS on Tailscale, and add Download to this Mac,
  Remove from this Mac and the mark of what this Mac holds.
- [ ] Write `emu/tools/build-kit.mjs` and the download addresses.
