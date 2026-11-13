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

No emulator needs a save folder set by hand: before each Play, Emu points
it at a folder inside its own on the Mac and carries its saves to and from
Supabase. On the drive an emulator that plays several systems keeps one
folder, named for the first of them, and the scan reads it for all of them.
When the settings folder below is not where an emulator keeps its settings,
correct `settings` for it in `emu/emulators.json`.

- **Mesen 2, NES and SNES.** Mesen names each save after the game's file.
  Emu brings the SNES coprocessor, Famicom Disk System and Satellaview
  firmware from Supabase into its own `Firmware` folder.
- **mGBA, Game Boy, Game Boy Color and Game Boy Advance.** mGBA writes
  `<game>.sav`. The GBA BIOS is optional: put `gba_bios.bin` in
  `<drive>/bios/gba/`, and once Update puts it in Supabase, Emu brings it
  into mGBA's own `bios` folder and points mGBA at it.
- **Gopher64, N64.** It runs in Apple's sandbox, so Play opens a game with
  it as the Finder does, and its folder is inside its container,
  `~/Library/Containers/io.github.gopher64.gopher64/Data/Library/Application Support/gopher64`.
  macOS refuses Rux Emu Helper that folder until it has Full Disk Access:
  System Settings, Privacy & Security, Full Disk Access, **+**, Rux Emu
  Helper from Applications, turned on. Set its resolution, fullscreen and
  controller profile in its own Settings and Controller pages; Emu carries
  them as the Mac's settings. It names a save by the game's header title
  and the SHA-256 of its file, as `ZELDA MAJORAS MASK-<sha256>.fla`, and
  holds it in the same byte order ares did, so an ares save moves across by
  its name alone: `.flash` to `.fla`, `.ram` to `.sra`, `.eeprom` to `.eep`.
- **melonDS, DS.** The BIOS and firmware are optional for DS games; a
  DSi-only game needs the DSi files. `bios7.bin`, `bios9.bin` and
  `firmware.bin` in `<drive>/bios/nds/` go to Supabase with Update, and Emu
  brings them into melonDS's own `bios` folder and points melonDS at them.
- **Azahar, 3DS.** Azahar keeps each save under the game's title ID, which
  is how the scan matches it.
- **DuckStation, PS1.** Emu brings its BIOS from Supabase into its own
  `bios` folder, and sets card 1 to a separate card per game, so each
  game's card carries its serial.
- **PCSX2, PS2.** Its Mac build is for Intel, so the Mac needs Rosetta.
  Emu brings its BIOS from Supabase into its own `bios` folder. Settings,
  Memory Cards: a new Folder card as card 1, so each game's save is its own folder named by
  its serial.
- **Dolphin, GameCube and Wii.** Config, GameCube: slot A to GCI Folder.
  Dolphin names a GameCube save by the disc's ID and keeps a Wii one under
  it.
- **Cemu, Wii U.** The `cemu-bin-macos-arm64` download from
  [Cemu's automatic builds](https://cemu.info/ActionBuilds.php) is native on
  Apple Silicon; the 2.6 release runs under Rosetta. Saves sit under the
  game's title ID in its `mlc01` folder. Make the `.wua` from the game's
  folder in Tools, Title Manager.
- **Ryujinx, Switch.** From [ryujinx.app](https://ryujinx.app/download), the
  macOS download. Ryujinx keeps everything in one folder, which is the
  Mac's own, `~/Library/Application Support/Ryujinx`, and never a link to
  the drive. A save sits in `bis/user/save` under a numbered folder, whose
  `ExtraData0` holds the game's title ID, which is how the scan matches it;
  Emu carries the saves with the index that numbers them, and brings
  `prod.keys` and `title.keys` from Supabase into its `system` folder and
  the firmware into `bis/system/Contents`. The firmware goes in as Ryujinx
  installed it: on one Mac, Tools, Install Firmware from the zip in
  `<drive>/bios/switch/`, then copy that Mac's
  `bis/system/Contents/registered` to `<drive>/bios/switch/Contents/` and
  Update.
- **xemu, Xbox.** Emu brings the MCPX boot ROM and the flash ROM from
  Supabase into xemu's own `bios` folder, keeps the hard disk image, where
  games save, and the EEPROM in its `disk` folder, and turns its welcome
  screen off, since xemu loads none of them while it is on.

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
   each, SRAM at 0x20800 for 32 KB, and flash at 0x28800 for 128 KB. Gopher64
   keeps each kind as its own file, `.eep`, `.sra`, `.fla` and `.mpk`, named
   as its entry above says, at the size its game list gives, such as 512
   bytes of EEPROM for most games. The EEPROM part is copied as it is; the
   SRAM and flash parts hold each four bytes reversed, and Gopher64 reads them
   in the cartridge's order, so each group of four is turned back. A
   Controller Pak that only holds the blank format is left behind.
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

Double-click `Install Rux Emu Helper.command` on the drive or the server's
share, or download the helper from the Status page. Its game controller
appears in the menu bar, and it starts at each log-in. Each Mac allows it
once: macOS asks to open it, Chrome asks whether the site may reach this
Mac, and macOS asks once whether it may read the drive and the share. It is
signed with the Rux Emu Helper certificate, so a newer build keeps every
permission given. When Supabase holds a newer one, Update on the Status page
puts it in place and starts it. Holding + and pressing − on a controller
quits the emulator in front, the same in every one, as ⌘Q would. `emu/tools/build-helper.mjs` builds it only on a Mac whose
keychain holds that certificate; to build on another, export it from
Keychain Access as a `.p12` file and import it there.

## Setting up a new Mac

1. Sign in at rux-sm.github.io/emu, open Status, download Rux Emu Helper,
   open it and allow it as above.
2. On Status, press **Set up this Mac**. It installs each emulator whose
   systems have games from Supabase, then starts each from the preferred
   settings with its BIOS, keys, firmware and saves, so the first game
   played opens as on any other Mac.
3. Download a game from the Collection and press Play.

Set up this Mac shows while an emulator is missing, older than the
installer Supabase holds, or never opened on the Mac.

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
