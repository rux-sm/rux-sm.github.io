---
type: plan
---

# Plan: A profile for each emulator

## Goal

The Emulators page shows one profile per emulator, not per system: its
systems, the version each Mac has against the one on the drive and the
newest out, where it keeps its settings, and a checklist of every kind of
file it writes, each with where it goes, the setting that sends it there,
and whether each Mac has it so. Nothing an emulator writes lands somewhere
Emu does not know about. The rest of Emu is `docs/plans/emu-app.md`.

## Decisions

The profile:

- **One profile per emulator, its systems listed in it,** since Mesen 2,
  mGBA and Dolphin each play more than one system and their settings are one.
- **`emulators.json` gains, for each emulator, every kind of file it
  writes:** the kind, where it goes by default, the setting that moves it,
  and the plan for it: to the drive, kept on each Mac, or turned off. It is
  the one home of these facts; the page, Status and the helper read it.
- **The checklist on a profile is that list, checked on each Mac by the
  helper,** as Status checks saves now; Status keeps the one line per
  emulator and links to the profile for the rest.
- **What goes to the drive:** saves, save states, memory cards, NAND and
  SD folders, BIOS and keys, cheats and per-game settings where the emulator
  can move them. What stays on each Mac: shader and pipeline caches, game
  list caches, logs and recent-file lists, which are rebuilt and differ
  between Macs. Screenshots go to the drive's `screenshots/<system>/` where
  the emulator can move them.
- **The drive keeps its name,** because every emulator stores an absolute
  `/Volumes/<drive>/emulation` path; Status says when it is mounted under
  another name, such as `<drive> 1`.

Versions:

- **The installed version is read from the key that holds it,** per
  emulator, since three apps report the wrong one in the usual key: Mesen 2
  always says `1.0`, Ryujinx `1.3` with the full version in
  `CFBundleVersion`, ares `0.148.0` for `v148`, Cemu `2.6.0` for `v2.6`.
  Where no key holds it, as Mesen's, the installer kept on the drive is the
  version.
- **The newest version is asked of each project's own feed,** listed in
  `emulators.json`: GitHub's latest release for Mesen 2, mGBA, ares,
  melonDS, Azahar, xemu and Cemu; the `latest` rolling tag's commit count
  for DuckStation; `api.pcsx2.net` for PCSX2; Dolphin's update check;
  `update.ryujinx.app` for Ryujinx; `updates.es-de.org` for ES-DE.
- **The drive's installer is the version every Mac should have,** and a
  newer one out is a to-do to download it onto the drive first.

Where each one stands, from its source and releases:

| Emulator | Drive | Newest | Settings on a Mac | Can live on the drive |
| :--- | :--- | :--- | :--- | :--- |
| Mesen 2 | 2.1.1 | 2.1.1 | `~/.config/Mesen2/settings.json` | no: its home also holds its libraries |
| mGBA | 0.10.5 | 0.10.5 | `~/.config/mgba/config.ini`, `qt.ini` | `portable.ini` beside the app |
| ares | v148 | v148 | `~/Library/Application Support/ares/settings.bml` | `--settings-file` |
| melonDS | 1.1 | 1.1 | `~/Library/Preferences/melonDS/melonDS.toml` | a `portable` folder beside the app |
| Azahar | 2125.1.3 | 2126.2 | `~/Library/Application Support/Azahar/config/qt-config.ini` | a `user` folder beside the app |
| DuckStation | 0.1-12640 | 0.1-12640 | `~/Library/Application Support/DuckStation/settings.ini` | no: only inside the bundle |
| PCSX2 | 2.6.3 | 2.8.2, Intel only | `~/Library/Application Support/PCSX2/inis/PCSX2.ini` | `portable.txt` beside the app |
| Dolphin | 2603a | 2609b | `~/Library/Application Support/Dolphin/Config/` | `portable.txt` beside the app, or `-u` |
| Cemu | dev build b487cb7, Apple Silicon | 2.6, Intel only | `~/Library/Application Support/Cemu/settings.xml` | a `portable` folder beside the app |
| Ryujinx | 1.3.3 | 1.3.3 | `~/Library/Application Support/Ryujinx/Config.json` | a link, `-r`, or a `portable` folder |
| xemu | 0.8.139 | 0.8.139 | `~/Library/Application Support/xemu/xemu/xemu.toml` | `-config_path` |
| ES-DE | 3.5.0 | 3.5.0 | `~/ES-DE/settings/es_settings.xml` | `--home` or a link |

What each writes beyond its saves, and where it goes:

- **Mesen 2.** Save states, every 5 minutes as slot 11 too, to the drive by
  `OverrideSaveStateFolder`; each folder setting needs its `Override*` flag
  on. Battery saves are written only when a game stops. Firmware, cheats,
  per-game settings and recent games cannot move and stay on the Mac. If the
  drive is missing it saves to the Mac without a word.
- **mGBA.** States, screenshots and cheats sit beside the game unless moved
  (`savestatePath`, `screenshotPath`, `cheatsPath`); all go to the drive, so
  nothing lands in `roms/`. Its BIOS paths are per file.
- **ares.** States share the saves folder; screenshots move by
  `Paths/Screenshots`. Every path gets the system's name added, so saves land
  in `saves/n64/Nintendo 64/`, and must end in `/`. It writes saves every 30
  seconds.
- **melonDS.** States and cheats move by `SavestatePath` and
  `CheatFilePath`. With its own BIOS on, it writes each Mac's user settings
  into the firmware file in `bios/nds/`. `rtc.bin` and `wfcsettings.bin` stay
  on the Mac.
- **Azahar.** States, cheats, mods and keys (`sysdata/`) cannot move apart
  from the whole user folder, so they stay on the Mac unless it runs
  portable. If it opens without the drive it puts its own folders back into
  its settings, and saves go to the Mac from then on.
- **DuckStation.** Every folder moves (`[Folders]`): states, per-game
  settings, cheats, covers and screenshots to the drive; `cache/` stays.
  Memory cards are named for the game's title, so every Mac must use the
  same card mode.
- **PCSX2.** Every folder moves (`[Folders]`): states, cheats, patches and
  per-game settings to the drive; `cache/` and `logs/` stay. `inis/secrets.ini`
  holds the achievements log-in and stays on the Mac.
- **Dolphin.** GameCube saves land in a region folder, `saves/gc/GC/USA`.
  States, screenshots, per-game settings and caches cannot move apart from
  the whole user folder. The Wii NAND holds installed channels and system
  settings as well as saves.
- **Cemu.** The MLC holds installed games, updates and DLC as well as saves,
  and `keys.txt`, `otp.bin` and `seeprom.bin` are console files that stay
  private. Shader caches, graphic packs and per-game profiles cannot move.
- **Ryujinx.** Everything moves together as one folder, which the drive
  holds through a link: saves, firmware, keys, shader caches, mods and
  profiles. Saves are named by save ID, never copied one by one. With the
  drive missing the link points nowhere.
- **xemu.** States live inside the hard disk image. `eeprom.bin` is made new
  if missing, so it moves to `saves/xbox/` beside the image; screenshots
  default to wherever it was started, so they are set. The shader cache
  stays.
- **ES-DE.** Gamelists, scraped media and collections are in `~/ES-DE`;
  media moves by `MediaDirectory`. It finds Ryujinx and xemu only in
  `/Applications`.

## Questions

- Do the emulators stay installed on each Mac with their folders pointed at
  the drive, as now, or run from the drive in their portable modes where
  they have one? Portable keeps every file on the drive, but Mesen 2 and
  DuckStation have none, and the home server plan keeps saves on each Mac.
- Is a development build all right where the release is old or Intel only,
  as Cemu's is now and PCSX2's would be?
- Should the newest versions be read by the helper during Update and saved
  with the drive, or by the page each time the Emulators page opens?

## Tasks

- [ ] Add each emulator's files, version key and release feed to
  `emulators.json`, correcting mGBA's and Mesen 2's settings folders.
- [ ] Make the helper read every setting the files name, and the newest
  versions.
- [ ] Draw the Emulators page as one profile per emulator with its
  checklist, and link Status to it.
- [ ] Rewrite `emu/docs/emulator-setup.md` from the files, each setting to
  change.
- [ ] Download the newer Azahar, PCSX2 and Dolphin onto the drive.
