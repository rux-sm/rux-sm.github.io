---
type: plan
---

# Plan: One way to handle every emulator

## Goal

Every console behaves the same to the person playing. Play opens a game
with its latest saves on any Mac, quitting puts them back in the
collection, and the Emulators page shows each emulator as one profile with
the same parts in the same order. What differs between emulators is written
once, in `emu/emulators.json`, and Rux Emu Helper handles it. The rest of
Emu is `docs/plans/emu-app.md`, the helper `docs/plans/emu-helper.md` and
the home server `docs/plans/emu-server.md`.

## Decisions

One rule for every emulator:

- **Every kind of file an emulator writes has one of five classes,** named
  in `emulators.json`: shared, which is saves, memory cards and save states,
  carried both ways; collected, which is screenshots, carried from the Mac to
  the collection; provided, which is BIOS, keys and firmware, carried from
  the collection to the Mac; the Mac's own, which is settings, controls and
  per-game settings, backed up to the collection; and local, which is caches,
  logs and recent lists, never carried.
- **An emulator keeps its files in its own folder on the Mac, and the helper
  carries them to and from the collection,** because no setting moves every
  file: Dolphin's and Azahar's save states, Mesen 2's firmware and Cemu's
  keys cannot be pointed anywhere, and Mesen 2, Azahar and Ryujinx go back to
  the Mac's folder without a word when the drive is missing.
- **Play is one session, the same for every console:** the helper checks the
  app is the drive's version, writes the settings Emu manages, brings down
  what is newer in the collection, starts the game, and when the emulator
  quits takes up what changed and tells the page.
- **The helper also carries when the collection appears, when any emulator
  quits and when the Mac goes to sleep,** so a game opened from ES-DE or the
  Dock, or left open under a closed lid, is not left out.
- **The helper's menu bar icon says where the saves stand:** carrying, or
  all in the collection and safe to unplug, since that is where the eye is
  when the drive comes out.
- **The collection keeps its layout,** `saves/<system>/` as the scan reads
  it; `emulators.json` maps each place on the Mac to its folder there.
- **A save is carried whole, as the scan groups it:** one file per game for
  Mesen 2, mGBA, ares, melonDS and DuckStation, one folder per game for
  Dolphin, Azahar, Cemu and PCSX2, and everything at once for Ryujinx's save
  tree and for xemu's disk image with its EEPROM, which index their own
  contents.
- **Nothing is overwritten unseen:** the helper remembers each save's
  fingerprint at its last carry; changed on one side, it is copied; changed
  on both, the newest plays and the other is kept; and the collection keeps
  the last five copies of each save.
- **Play never waits on a question:** the game's panel says when two copies
  were found and which is playing, with one press to use the other.
- **Emu manages a short list of settings per emulator,** written before each
  Play and shown on its profile: its save folders inside its own home where
  the default is beside the game, as mGBA's, ares's and melonDS's is; its own
  updater off; DuckStation's one card per game and PCSX2's folder cards; and
  xemu's welcome screen off. Every other setting is the Mac's own.
- **Each Mac's settings are backed up after a session that changed them,**
  into `settings/<mac>/<emulator>/` in the collection with the last five
  copies kept, and the profile puts any of them back on that Mac.
- **One set of settings per emulator can be kept as preferred,** from the
  profile, into `settings/preferred/<emulator>/`; a new Mac starts from it,
  and any Mac takes it only when asked, with the settings Emu manages
  written over it.
- **A settings file is stored with the Mac's home folder written as `~`,**
  so a set kept on one Mac opens on another, and a file or line that holds a
  log-in, as PCSX2's `secrets.ini` and Dolphin's achievements token do, is
  left out.
- **The collection is found, never named in an emulator's setting,** so the
  drive mounting under another name, or the home server replacing it, changes
  nothing on a Mac.

Versions:

- **The installer on the drive is the version every Mac should have,** and
  the helper installs from it and writes a receipt naming it, since three
  apps do not say their own: Mesen 2.1.1 reports `1.0`, Ryujinx 1.3.3
  reports `1.2`, and the Cemu build `0.0.0`.
- **An app with no receipt is read from its own version key where that is
  true,** which is every other one, and is otherwise said to be unknown.
- **The helper asks each project's own feed for the newest during Update,**
  and saves it with the drive's row: GitHub's latest release for Mesen 2,
  mGBA, ares, melonDS, Azahar, xemu and Cemu; the commits from `0.1` to the
  `latest` tag for DuckStation; `api.pcsx2.net` for PCSX2; the newest tag and
  `dl.dolphin-emu.org` for Dolphin; `update.ryujinx.app` for Ryujinx; and
  `updates.es-de.org` for ES-DE.
- **A newer one out is a to-do to download it onto the drive,** never an
  update on one Mac alone, so a save state made on one Mac opens on another.
- **Cemu stays on a development build, named by its build,** since its last
  release is Intel only.

The profile, the same for every emulator, in this order, in plain words:
the page says in the collection, backed up or stays on this Mac, and the
class names stay in `emulators.json`.

- **Version:** this Mac's, the drive's and the newest.
- **Needs:** each BIOS, key or firmware file, and whether the collection has
  it.
- **Files:** each kind it writes under its class, where it is on the Mac,
  where it is in the collection, and whether this Mac is in step.
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
| mGBA | 0.10.5 | 0.10.5 | universal | `~/Library/Application Support/mGBA/config.ini` | its game library |
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

- [ ] Make the helper ask the feeds during Update, and show the newest on
  each profile. Settle which folder mGBA writes its settings in, since its
  source names `~/.config/mgba`, and name the setting that turns off the
  updater in Azahar, mGBA and Ryujinx.
- [ ] Download the newer Azahar, PCSX2 and Dolphin onto the drive, and move
  the GameCube save into `GC/USA/`.
- [ ] Make the helper install from the drive with a receipt.
- [ ] Make the helper back up each Mac's settings, put a backup back, and
  keep and take the preferred set.
- [ ] Make the helper carry for mGBA alone, on the iMac with mGBA installed
  from the drive, each place in `emulators.json` naming its folder in the
  collection: fingerprints, the five kept copies, the newest playing when
  both changed, the session around Play, sleep and the menu bar icon.
- [ ] Carry for the other emulators, a full backup first, the simple ones
  first and Dolphin's Wii storage, Cemu, Ryujinx and xemu last, with xemu's
  EEPROM beside its disk image; say on a game's panel whether its saves are
  in step.
- [ ] Rewrite `emu/docs/emulator-setup.md`.
