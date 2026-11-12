---
type: plan
---

# Plan: One way to handle every emulator

## Goal

Every console behaves the same to the person playing. Play opens a game
with its latest saves on any Mac, quitting puts them back in Supabase, and
the Emulators page shows each emulator as one profile with the same parts in
the same order. Everything but the games lives in Supabase, so a Mac needs
the drive only for games. What differs between emulators is written once, in
`emu/emulators.json`, and Rux Emu Helper handles it. The rest of Emu is
`docs/plans/emu-app.md`, the helper `docs/plans/emu-helper.md` and the home
server `docs/plans/emu-server.md`.

## Decisions

One rule for every emulator:

- **Supabase is the home of everything but the games:** saves, save states,
  each Mac's settings, BIOS, keys, firmware and installers, in one private
  bucket only the owner reads, laid out as the drive's `saves/`, `bios/` and
  `emulators/` folders are. It comes to under 2 GB of the plan's 100 GB, and
  follows to any Mac with the internet and no drive. The drive, and the home
  server after it, hold the games and a dated backup.
- **Every kind of file an emulator writes has one of five classes,** named
  in `emulators.json`: shared, which is saves, memory cards and save states,
  carried both ways; collected, which is screenshots, carried from the Mac to
  Supabase; provided, which is BIOS, keys and firmware, carried from
  Supabase to the Mac; the Mac's own, which is settings, controls and
  per-game settings, backed up to Supabase; and local, which is caches, logs
  and recent lists, never carried.
- **An emulator keeps its files in its own folder on the Mac,** because no
  setting moves every file: Dolphin's and Azahar's save states, Mesen 2's
  firmware and Cemu's keys cannot be pointed anywhere, and Mesen 2, Azahar
  and Ryujinx go back to the Mac's folder without a word when the folder
  they were pointed at is missing.
- **The site carries, and the helper keeps no log-in:** signed in as rux,
  the page compares what the helper reads on the Mac with what Supabase
  lists and moves each file between them, as Update uploads a Mac's saves; a
  file too large to pass through the page goes straight between the helper
  and Supabase by a link the page signs, good for minutes.
- **`emu_files` lists each copy of each file Supabase holds, with its
  fingerprint and when it was saved,** so the page compares without
  downloading and the Saves page lists them; the bytes sit in the
  `emu-collection` bucket under their SHA-1, so a copy kept is a row and the
  same bytes are held once.
- **Play is one session, the same for every console:** the page brings down
  what is newer, the helper checks the app is the version Supabase holds,
  writes the settings Emu manages and starts the game, and when the emulator
  quits the page takes up what changed.
- **A save changed with the site closed, or with no internet, waits on the
  Mac:** the helper notes it, its menu bar icon says saves are waiting, and
  the site carries it when next open there; opening the site on a Mac also
  brings down what is newer.
- **A save is carried whole, as the scan groups it:** one file per game for
  Mesen 2, mGBA, ares, melonDS and DuckStation, one folder per game for
  Dolphin, Azahar, Cemu and PCSX2, and everything at once for Ryujinx's save
  tree and for xemu's disk image with its EEPROM, which index their own
  contents.
- **Nothing is overwritten unseen:** the helper remembers each save's
  fingerprint at its last carry; changed on one side, it is copied; changed
  on both, the newest plays and the other is kept; and Supabase keeps the
  last five copies of each save.
- **Play never waits on a question:** the game's panel says when two copies
  were found and which is playing, with one press to use the other.
- **Emu manages a short list of settings per emulator,** written before each
  Play and shown on its profile: its save folders inside its own home where
  the default is beside the game, as mGBA's, ares's and melonDS's is; its own
  updater off; DuckStation's one card per game and PCSX2's folder cards; and
  xemu's welcome screen off. Every other setting is the Mac's own.
- **Each Mac's settings are backed up after a session that changed them,**
  into `settings/<mac>/<emulator>/` with the last five copies kept, and the
  profile backs them up when asked and puts any copy back on that Mac, what
  is there backed up first. A settings file over a megabyte stays on the
  Mac.
- **One set of settings per emulator can be kept as preferred,** from the
  profile, into `settings/preferred/<emulator>/`; a new Mac starts from it,
  and any Mac takes it only when asked, with the settings Emu manages
  written over it.
- **A settings file is stored with the Mac's home folder written as `~`,**
  so a set kept on one Mac opens on another, and a file or line that holds a
  log-in, as PCSX2's `secrets.ini` and Dolphin's achievements token do, is
  left out: a file `emulators.json` gives another class, and a line whose
  key names a token, password or secret.
- **Nothing on a Mac names the drive:** a game opens from wherever the
  collection is found, and everything else comes from Supabase.
- **The drive keeps a dated zip of the saves, settings, BIOS and keys,**
  which Update writes from Supabase, so there are three copies: Supabase,
  each Mac that plays, and the drive.

Versions:

- **The installer Supabase holds is the version every Mac should have,**
  and the helper installs it by a link the page signs and writes a receipt
  naming it, since three apps do not say their own: Mesen 2.1.1 reports
  `1.0`, Ryujinx 1.3.3 reports `1.2`, and the Cemu build `0.0.0`.
- **An app with no receipt is read from its own version key where that is
  true,** which is every other one, and is otherwise said to be unknown.
- **The helper asks each project's own feed for the newest during Update,**
  and saves it with the drive's row: GitHub's latest release for Mesen 2,
  mGBA, ares, melonDS, Azahar and xemu; the commits from `0.1` to the
  `latest` tag for DuckStation; `api.pcsx2.net` for PCSX2; the greatest tag
  for Dolphin; `update.ryujinx.app` for Ryujinx; and `updates.es-de.org` for
  ES-DE.
- **A newer one out is a to-do to put it in Supabase,** never an update on
  one Mac alone, so a save state made on one Mac opens on another. The drive
  is the way in: Update puts into Supabase each BIOS, key, firmware and
  installer the drive holds that it lacks, and a newer installer takes its
  emulator's older one's place.
- **Cemu stays on a development build, named by its build,** since its last
  release is Intel only.

The profile, the same for every emulator, in this order, in plain words:
the page says in Supabase, backed up or stays on this Mac, and the class
names stay in `emulators.json`.

- **Version:** this Mac's, the drive's and the newest.
- **Needs:** each BIOS, key or firmware file, and whether Supabase has it.
- **Files:** each kind it writes under its class, where it is on the Mac,
  where it is in Supabase, and whether this Mac is in step.
- **Settings:** each one Emu manages and its value, where the settings
  file is, this Mac's backups to put back, and the preferred set to keep or
  take.
- **Worth knowing:** one or two lines, such as that it writes a save only
  when the game stops.

Status keeps one line per emulator, linking to its profile, and a game's
panel says whether its saves are in step.

What each emulator's source and the installers on the drive say:

| Emulator | Drive | Newest | Build | Settings on a Mac | No setting moves |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Mesen 2 | 2.1.1 | 2.1.1 | Apple Silicon | `~/Library/Application Support/Mesen2/settings.json` | firmware, cheats, per-game settings, recent games |
| mGBA | 0.10.5 | 0.10.5 | universal | `~/.config/mgba/config.ini` | its game library |
| ares | v148 | v148 | universal | `~/Library/Application Support/ares/settings.bml` | nothing |
| melonDS | 1.1 | 1.1 | universal, not notarized | `~/Library/Preferences/melonDS/melonDS.toml` | its Wi-Fi settings file |
| Azahar | 2125.1.3 | 2126.2 | Apple Silicon, not notarized | `~/Library/Application Support/Azahar/config/qt-config.ini` | save states, cheats, keys, mods, shader cache |
| DuckStation | 0.1-12640 | 0.1-12640 | universal, not notarized | `~/Library/Application Support/DuckStation/settings.ini` | play time, its log |
| PCSX2 | 2.6.3 | 2.8.2 | Intel only, in every release | `~/Library/Application Support/PCSX2/inis/PCSX2.ini` | the achievements log-in |
| Dolphin | 2603a | 2609b | universal | `~/Library/Application Support/Dolphin/Config/` | save states, screenshots, per-game settings, caches |
| Cemu | build b487cb7 | 2.6, Intel only | Apple Silicon, not notarized | `~/Library/Application Support/Cemu/settings.xml` | keys, shader cache, graphic packs, per-game profiles, screenshots |
| Ryujinx | 1.3.3 | 1.3.3 | universal, not notarized | `~/Library/Application Support/Ryujinx/Config.json` | everything, which moves only as one folder |
| xemu | 0.8.139 | 0.8.139 | universal | `~/Library/Application Support/xemu/xemu/xemu.toml` | shader cache |
| ES-DE | 3.5.0 | 3.5.0 | Apple Silicon | `~/ES-DE/settings/es_settings.xml` | gamelists, collections |

- **Mesen 2** writes a battery save only when the game stops, and a save
  state every five minutes as slot 11.
- **mGBA, ares and melonDS** save beside the game unless a folder is set.
  ares adds the system's name to its folder, as `Nintendo 64/`.
- **melonDS** with its own BIOS on writes each Mac's user settings into the
  firmware file.
- **Azahar** opened without its storage folders puts its own back into its
  settings and keeps saving there.
- **DuckStation** names a card for the game's title, so every Mac uses the
  same card mode.
- **Dolphin** adds the region to a GameCube save folder, as `GC/USA/`. Its
  Wii NAND holds installed channels and system settings beside the saves.
- **Cemu's** MLC holds installed updates and add-ons beside the saves, so
  only `usr/save/` is carried.
- **Ryujinx** names a save folder by a number its own index gives out, so
  its saves and that index are carried together and never one by one.
- **xemu** keeps saves and save states inside the disk image, and makes a
  new EEPROM where it finds none.
- **Dolphin, PCSX2, DuckStation, Ryujinx, Cemu, xemu and ES-DE** each offer
  to update themselves.

## Questions

None open.

## Tasks

In this order, so what can lose a save comes last and proves itself first:

- [ ] Have the helper read and write mGBA's settings in `~/.config/mgba/`
  alone, where mGBA 0.10.5 keeps them on both Macs, and move the MacBook
  Pro's save folder there from `~/Library/Application Support/mGBA/config.ini`,
  which mGBA never reads, so Status stops saying it saves to the drive.
- [ ] Carry for mGBA alone, on the iMac with mGBA installed: each place in
  `emulators.json` naming its folder in Supabase, fingerprints, the five
  kept copies, the newest playing when both changed, the session around
  Play, with the settings Emu manages written before it and this Mac's
  settings backed up after it, and the menu bar icon.
- [ ] Carry for the other emulators, a backup first, the simple ones first
  and Dolphin's Wii storage, Cemu, Ryujinx and xemu last: the helper writing
  a managed setting into each one's kind of settings file, as it does an
  INI's, the drive's saves
  moved into Supabase, the GameCube save under `GC/USA/`, xemu's EEPROM
  beside its disk image, each emulator on the MacBook Pro back to its own
  folders, the Saves page listing Supabase, and a game's panel saying
  whether its saves are in step.
- [ ] Write the drive's dated zip from Supabase during Update, in place of
  the zip uploaded there.
- [ ] Rewrite `emu/docs/emulator-setup.md`.
