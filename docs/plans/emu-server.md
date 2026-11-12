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
- **The NAS is rux's own download cloud, reached through ports 443 and 80
  forwarded on the AT&T gateway,** 80 only for the certificate, so any
  machine downloads with nothing installed, no company in the middle and no
  size limit. Only the game downloads are on those ports; TrueNAS's own
  pages and its shares stay inside the home.
- **Not Cloudflare Tunnel,** since its free plan's terms cover a tunnel's
  public hostname serving "a disproportionate amount of large files".
- **The home's upload sets the speed away from home,** measured at 350 Mb/s
  or more, about a minute and a half for a 4 GB game.
- **A dynamic DNS name follows the home's address, with a free Let's
  Encrypt certificate,** so a link keeps working when AT&T changes the
  address.
- **The download server reads the games and never writes them,** so the one
  part the internet reaches cannot change the collection.
- **A broken download resumes where it stopped,** since a disc game is
  gigabytes over a hotel's Wi-Fi.
- **The log-in is the guard.** The server sends a file only on a request
  that proves one of rux's accounts is signed in, so it keeps no accounts or
  passwords of its own.
- **The proof is the signed-in account's own Supabase access token,** which
  the server checks against Supabase's public signing keys, since that
  needs no extra Supabase function and puts no secret on the server; with
  the same token it asks `emu_is_member()` whether the account is on the
  list `docs/plans/emu-accounts.md` keeps.
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
- **Rux Emu Helper does every download,** given the page's access token:
  from the server's home address when it answers, since the gateway loops
  the public name back slowly, stalling 5 to 19 seconds or failing, and
  from the public name otherwise. The helper writes the folder itself, so
  any browser works and Play already needs it on the Mac.
- **The server answers only the app's own site** in a browser, and anything
  carrying a signed-in account's token, as the helper does.
- **The Collection marks what this Mac holds,** from the library folder it
  reads, so a game to download and one ready to play are told apart.
- **On this Mac is a view of the Collection,** listing only the games this
  Mac holds, each with its size and Remove, over how much they take and how
  much the Mac has free, so a Mac short of room swaps one game for another.
- **Removing a game takes its files alone.** Its saves and settings are in
  the emulator's own folder and in Supabase, as
  `docs/plans/emu-emulator-profiles.md` says, so a game downloaded again
  plays on from where it stopped.

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

- [ ] Copy the collection onto the `games` share, leaving out
  `to-delete`.
- [ ] Copy the collection from the server to the T7.
- [ ] Run the scan on the server each night, saving to Supabase with a key
  kept there.
- [ ] Have Rux Emu Helper download a game from the home address or the
  public name, resuming a broken download, and add Download to this Mac,
  Remove from this Mac, the mark of what this Mac holds and the On this Mac
  view.
- [ ] Write `emu/tools/build-kit.mjs` and the download addresses.
