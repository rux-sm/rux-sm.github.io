---
type: how-to
---

# Setting up the emulators on a Mac

Each system's emulator, why it is the one, what it needs and what is worth
knowing about it are on the Emulators page, from `emu/emulators.json`. Emu
sets each emulator's folders, BIOS and settings itself and carries its saves
through Supabase, so a Mac needs only the steps below. `<share>` is the home
server's `games` share, such as `/Volumes/games`.

## Setting up a new Mac

1. Sign in at rux-sm.github.io/emu, open Status, download Rux Emu Helper,
   unzip it, drag it into Applications and open it. Its game controller
   appears in the menu bar, and it starts at each log-in.
2. Allow it once: macOS asks to open it, Chrome asks whether the site may
   reach this Mac, and macOS asks once whether it may read the share.
3. Give it Full Disk Access, which Gopher64's sandboxed folder needs: System
   Settings, Privacy & Security, Full Disk Access, **+**, Rux Emu Helper from
   Applications, turned on.
4. On Status, press **Set up this Mac**. It installs each emulator whose
   systems have games, then starts each from its settings with its BIOS,
   keys, firmware and saves. A Mac starts from the preferred settings, or
   from its own where it kept some before.
5. PCSX2's Mac build is for Intel: let macOS install Rosetta when it asks.
6. Download a game from the Library and press Play.

Set up this Mac shows while an emulator is missing, older than the
installer Supabase holds, or never opened on the Mac.

The helper is signed with the free Rux Emu Helper certificate, so a newer
build keeps every permission given, and Update on Status puts a newer one in
place. `emu/tools/build-helper.mjs` builds it only on a Mac whose keychain
holds that certificate; to build on another, export it from Keychain Access
as a `.p12` file and import it there.

## Adding games, BIOS and installers

1. Copy a game into `<share>/roms/<system>/`, a BIOS, key or firmware file
   into `<share>/bios/<system>/`, and an emulator's installer into
   `<share>/emulators/` with its version in its name, as `Dolphin-2609b.dmg`.
   Download an installer only from the emulator's own site or releases page.
2. For PlayStation and PlayStation 2 discs, run the organize tool, which
   `emu/README.md` describes, so each disc is one CHD and each file has its
   list name.
3. The server's nightly scan, which `emu/docs/home-server.md` sets up, puts
   them in Supabase by the next morning. For sooner, press **Update** on
   Status, then **Save**.

Each Mac takes a new BIOS or installer on its next Play or Set up this Mac.

## Steps an emulator still needs

- **Ryujinx's firmware** goes in as Ryujinx installed it: on one Mac, Tools,
  Install Firmware from the zip in `<share>/bios/switch/`, then copy that
  Mac's `~/Library/Application Support/Ryujinx/bis/system/Contents/registered`
  to `<share>/bios/switch/Contents/` and Update. Its keys go in
  `<share>/bios/switch/` as `prod.keys` and `title.keys`.
- **A Wii U game** plays as one `.wua` file: make it from the game's folder
  in Cemu's Tools, Title Manager.
- **ES-DE** reads the games from the folder Status names. At its first start,
  point its ROM directory there, and for each system choose the emulator in
  `emu/emulators.json` under Other settings, Alternative emulators. ES-DE
  on macOS offers Mesen only as a RetroArch core, so copy the `nes` and
  `snes` systems from
  `ES-DE.app/Contents/Resources/resources/systems/macos/es_systems.xml` into
  `~/ES-DE/custom_systems/es_systems.xml`, inside one `<systemList>`, and add
  as each one's first command:

      <command label="Mesen 2 (Standalone)">/Applications/Mesen.app/Contents/MacOS/Mesen %ROM%</command>

## Playing

Holding **+** and pressing **−** on a controller quits the emulator in
front, the same in every one, as ⌘Q would. Saves are carried to Supabase when
the emulator quits; the Saves page lists every save by its game.

A save on the share that the Saves page says matches no game sits in a
folder not named for a system. Move it into `<share>/saves/<system>/`, the
folder of its emulator's first system, and Update.

## Removing an emulator from a Mac

On the Emulators page, open the emulator and press **Remove from this
Mac**. It says first what goes and how much of it Supabase keeps no copy
of, such as caches. Remove keeps its saves and this Mac's settings in
Supabase, checks they are there, then moves the app and every folder it
keeps to the Trash. Installing it again and playing brings this Mac's
settings, its BIOS and its saves back as they were.

## Checking a Mac

With the helper running, Status shows this Mac live: what is installed,
where each emulator saves, and each retired app still there or still holding
files. Update saves it for every other Mac to see. Where an emulator's
folder is not found, correct its `macSaves` entry in `emu/emulators.json`,
then build the helper onto the share and install it:

    node emu/tools/build-helper.mjs <share>
