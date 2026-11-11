---
type: how-to
---

# Setting up the emulators on a Mac

Each system's emulator, and why it is the one, is in `emu/emulators.json`,
which the Emulators page shows. This is how each is installed on a Mac and
pointed at the drive, so the Mac plays from the drive's games and saves. `<drive>` below is the drive's `emulation` folder, such as
`/Volumes/<drive>/emulation`.

## Before the first emulator

1. Download each emulator from its own site or its project's releases page,
   never a mirror, and copy the download into `<drive>/emulators/` with its
   version in the name, such as `Dolphin-2512.dmg`. The scan lists them, and
   the Emulators page says which one has its installer kept.
2. Make one folder per emulator under `<drive>/saves/`, named for the
   first system it plays as under `<drive>/roms/`: `nes` for Mesen, `gb`
   for mGBA, `n64`, `nds`, `n3ds`, `psx`, `ps2`, `gc` for Dolphin, `wiiu`,
   `switch` and `xbox`.
3. Put each BIOS file the Emulators page asks for in `<drive>/bios/<system>/`.
4. Remove RetroArch, after moving its saves as the last section says.

## ES-DE, the library

Install ES-DE and, at its first start, point its ROM directory at
`<drive>/roms/`; its system folder names are the drive's. For each system,
choose the emulator in `emu/emulators.json` under Other settings, Alternative
emulators, so ES-DE launches the standalone and not a RetroArch core.

ES-DE on macOS offers Mesen only as a RetroArch core, so NES and SNES get a
Mesen 2 entry of their own: copy the `nes` and `snes` systems from
`ES-DE.app/Contents/Resources/resources/systems/macos/es_systems.xml` into
`~/ES-DE/custom_systems/es_systems.xml`, inside one `<systemList>`, and add
as each one's first command:

    <command label="Mesen 2 (Standalone)">/Applications/Mesen.app/Contents/MacOS/Mesen %ROM%</command>

## Each emulator

Where an emulator's settings name a folder for saves, it is
`<drive>/saves/<system>/`. An emulator that plays several systems keeps one
folder, named for the first of them, and the scan reads it for all of them.
When the settings folder below is not where an emulator keeps its settings,
correct `settings` for it in `emu/emulators.json`.

- **Mesen 2, NES and SNES.** Settings, Preferences, Folders: the save data
  folder to `<drive>/saves/nes/`, for both systems; Mesen names each save
  after the game's file.
- **mGBA, Game Boy, Game Boy Color and Game Boy Advance.** Settings, Paths:
  Saves to `<drive>/saves/gb/`, for all three; mGBA writes `<game>.sav`.
  The GBA BIOS is optional, in Settings, BIOS.
- **ares, N64.** Settings, Paths: Saves to `<drive>/saves/n64/`. Quit ares
  and set `NoFilePrompt: true` under `General` in
  `~/Library/Application Support/ares/settings.bml`, so a game that can use
  the Transfer Pak opens without asking for a Game Boy game.
- **melonDS, DS.** Config, Path settings: Save files to
  `<drive>/saves/nds/`. The BIOS and firmware are optional for DS games; a
  DSi-only game needs the DSi files.
- **Azahar, 3DS.** Emulation, Configure, Storage: both the NAND and the SD
  card folder under `<drive>/saves/n3ds/`, as `nand` and `sdmc`. Azahar
  keeps each save under the game's title ID, which is how the scan matches it.
- **DuckStation, PS1.** Settings, BIOS: the folder `<drive>/bios/psx/`.
  Settings, Memory Cards: card 1 to Separate Card Per Game (Serial), and the
  memory card folder to `<drive>/saves/psx/`, so each game's card carries its
  serial.
- **PCSX2, PS2.** Settings, BIOS: the folder `<drive>/bios/ps2/`. Settings,
  Memory Cards: the folder `<drive>/saves/ps2/`, and a new Folder card as
  card 1, so each game's save is its own folder named by its serial.
- **Dolphin, GameCube and Wii.** Config, GameCube: slot A to GCI Folder, its
  folder `<drive>/saves/gc/GC`. Config, Paths: the Wii NAND root to
  `<drive>/saves/gc/Wii`. Dolphin names a GameCube save by the disc's ID and
  keeps a Wii one under it.
- **Cemu, Wii U.** The `cemu-bin-macos-arm64` download from
  [Cemu's automatic builds](https://cemu.info/ActionBuilds.php) is native on
  Apple Silicon; the 2.6 release runs under Rosetta. General settings: the
  MLC path to `<drive>/saves/wiiu/mlc01`. Saves sit under the game's title
  ID in it. Make the `.wua` from the game's folder in Tools, Title Manager.
- **Ryujinx, Switch.** From [ryujinx.app](https://ryujinx.app/download), the
  macOS download. Ryujinx has no setting that moves its saves, so its whole
  folder, keys, firmware, profile and saves, lives at
  `<drive>/saves/switch/Ryujinx`, and the Mac's own folder is a link to it.
  Open Ryujinx once and quit it, then:

      mv ~/Library/Application\ Support/Ryujinx ~/.Trash/Ryujinx-empty
      ln -s "<drive>/saves/switch/Ryujinx" ~/Library/Application\ Support/Ryujinx

  A save sits in `bis/user/save` under a numbered folder, whose
  `ExtraData0` holds the game's title ID, which is how the scan matches it.
  The scan reads only that folder, so the firmware stays out of the backup.
- **xemu, Xbox.** Settings, System: the MCPX boot ROM, the flash ROM and the
  hard disk image from `<drive>/bios/xbox/`.

## Moving the RetroArch saves

RetroArch's saves are in `<drive>/saves/Retroarch Saves/` and
`<drive>/saves/Retroarch Save States/`, and Azahar's in
`<drive>/saves/Azahar Save/`. The Saves page lists what still sits there.

1. **Game Boy, Game Boy Color, Game Boy Advance and DS.** A `.srm` is the
   cartridge's save memory as it is: move it to `<drive>/saves/gb/`, or
   `<drive>/saves/nds/` for DS, and rename `.srm` to `.sav`. Pokémon
   Crystal's `.rtc`, its clock, is not needed by mGBA.
2. **N64.** RetroArch's `.srm` holds four kinds of save memory one after
   another: EEPROM at 0 for 2 KB, four Controller Paks at 0x800 for 32 KB
   each, SRAM at 0x20800 for 32 KB, and flash at 0x28800 for 128 KB. ares
   keeps each kind as its own file named after the game, `<game>.eeprom`,
   `.ram`, `.flash` and `.pak`, in `<drive>/saves/n64/Nintendo 64/`, at the
   size its game list gives, such as
   512 bytes of EEPROM for most games. The EEPROM part is copied as it is;
   the SRAM and flash parts hold each four bytes reversed, and ares reads them
   in the cartridge's order, so each group of four is turned back. A Controller
   Pak that only holds the blank format is left behind.
3. **3DS.** Move `<drive>/saves/Azahar Save/Nintendo 3DS` to `<drive>/saves/n3ds/sdmc/Nintendo 3DS`
   before pointing Azahar at it.
4. **Save states** belong to the emulator that made them and are left
   behind; the Little Mermaid one goes with RetroArch.
5. **A Mac that no longer plays.** Before removing an emulator there, copy its
   saves into the system's folder: Dolphin's GC and Wii folders, PCSX2's and
   DuckStation's memory cards, Cemu's `mlc01/usr/save`, and the Switch
   emulator's `nand/user/save`.

Then scan and import: the Saves page lists every save by its game, and
Problems lists a save with no game.

## Rux Emu Helper

Double-click `Install Rux Emu Helper.command` on the drive. Its game
controller appears in the menu bar, and it starts at each log-in. The first
time the Rux Emu site asks it something, Chrome asks whether the site may
reach this Mac: Allow.

## Checking a Mac

With the helper running, the Status page shows this Mac live: what is
installed, where each emulator saves, from its own settings or its default
folder, and each retired app still there or still holding files. Update
saves it for every other Mac to see, with a copy of any save this Mac keeps
itself. That list is also the check that `emulators.json` names each one's
folders rightly; correct `macSaves` there when one is not found, then build
the helper onto the drive again and install it:

    node emu/tools/build-helper.mjs "/Volumes/<drive>/emulation"

## Backups

Each scan packs the saves, BIOS and keys into `<drive>/backups/`, and
Update on the Status page uploads that zip to Supabase. On each Mac, now and then:

    node emu/tools/backup-saves.mjs "/Volumes/<drive>/emulation"

The Saves page shows when each of the three copies was last made.
