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
- **The collection lives on one 4 TB WD Red Plus hard drive, not mirrored,**
  about 3.6 TB usable for a collection of 800 GB, using the drive rux
  already has; hard drives cost a third of SSDs per terabyte, and the
  network, not the drive, sets the speed.
- **The 2 TB T7 becomes the server's backup and the travel copy,**
  refreshed from it, since one drive alone loses everything when it fails;
  Supabase keeps the saves' copy.
- **A matching drive added later turns the pool into a mirror,** which
  TrueNAS does without starting over.
- **Every drive is CMR, never SMR,** since an SMR drive slows to a crawl
  rebuilding a ZFS mirror; every WD Red Plus is CMR.
- **TrueNAS runs from the PC's 1 TB NVMe, in place of Windows,** which the
  PC no longer needs, so no boot drive is bought; TrueNAS takes its whole
  boot drive and keeps no files there.
- **Its 32 GB of memory is ZFS's cache,** so listings, the nightly scan and
  repeated reads come from memory, not the disks.
- **The drive plugs into one of the board's four chipset SATA ports,** not
  the two on its add-on ASMedia controller, which ZFS trusts less; the MSI
  MPG Z690 EDGE WIFI DDR4 has all six free, and the NVMe shares none of them.
- **It is on wired Ethernet,** since TrueNAS has no Wi-Fi; the board's
  2.5 Gb port links at 1 Gb today, which a 1 Gb switch or router sets.
- **It runs TrueNAS Community Edition,** free storage software made for a
  mirrored pair, which shares the collection over the network to Macs and,
  later, a PC.
- **It runs with no screen, managed from a browser;** its i7-13700K's
  built-in graphics shows the installer once, so it needs no graphics card.
- **It has one public address, through a tunnel it opens outward,** so any
  machine reaches it with nothing installed, and no port on the router is
  opened. Only the game downloads are on that address; TrueNAS's own pages
  and its shares stay inside the home.
- **The log-in is the guard.** The site asks Supabase for a link to one
  game, Supabase gives it only to one of rux's accounts, signed and good for
  minutes, and the server sends a file only on such a link, so it keeps no
  accounts or passwords of its own.
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
- **The server sends a game only on a signed link,** over HTTPS, answering
  only the app's own site.
- **The Collection marks what this Mac holds,** from the library folder it
  reads, so a game to download and one ready to play are told apart.

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
- Which tunnel carries the downloads? Cloudflare Tunnel and Tailscale Funnel
  are free and may limit files the size of a disc game; a forwarded port
  with its own certificate has no limit and opens the router. Recommended:
  measure one large download through Cloudflare Tunnel first.

## Tasks

- [ ] Copy the collection onto the `games` share, leaving out
  `to-delete`.
- [ ] Copy the collection from the server to the T7.
- [ ] Give the server its public address through the tunnel, the downloads
  alone on it.
- [ ] Sign a game's link in Supabase for one of rux's accounts, and have the
  server refuse a request without one.
- [ ] Run the scan on the server each night, saving to Supabase with a key
  kept there.
- [ ] Serve the games over HTTPS on signed links, and add Download to this Mac,
  Remove from this Mac and the mark of what this Mac holds.
- [ ] Write `emu/tools/build-kit.mjs` and the download addresses.
