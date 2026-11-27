---
type: reference
---

# Controller settings, emulator by emulator

Where each emulator keeps player 1's buttons, how it numbers them and how it
names the controller they are for. `emu/pads.js` reads these through Rux Emu
Helper's `/mac/setting` to draw the controller map.

## How the numbers are counted

Every emulator here reads controllers through SDL or Apple's GameController,
and they count buttons in two ways:

- **By position:** SDL 3, Apple's GameController, and SDL's names (`FaceSouth`,
  `A`, `Button S`). Button 0 is the bottom face button, which a Nintendo pad
  prints as B.
- **By label on a Nintendo pad:** SDL 2. Button 0 is the button printed A, on
  the right. On an Xbox or PlayStation pad SDL 2 also counts by position.

After the four face buttons, SDL counts: 4 −/Back/View, 5 Home, 6 +/Start/Menu,
7 and 8 the stick presses, 9 and 10 L and R, 11 to 14 up, down, left, right. Its
axes are 0 and 1 the left stick, 2 and 3 the right stick, 4 and 5 ZL and ZR.

An SDL GUID holds the controller's maker at bytes 4–5 and its product at bytes
8–9, little-endian. Byte 0 is 03 over USB under SDL 2 and 05 over Bluetooth
under SDL 3, so the same controller has two GUIDs. The 8BitDo Ultimate in Switch
mode is maker `057e` and product `2009`, Nintendo's own Pro Controller.

## Each emulator

| Emulator | File in its folder | Player 1 | Counted |
| :--- | :--- | :--- | :--- |
| Mesen 2 | `settings.json`, `Nes.Port1` and `Snes.Port1`, `Mapping1`–`4` | the first controller: codes from `0x1000` | Apple, by position; 16–23 are the sticks' directions |
| mGBA | `config.ini`, `[gba.input.SDLB]` | `device0`, an SDL 2 GUID | SDL 2 buttons |
| melonDS | `melonDS.toml`, `[Instance0.Joystick]` | `JoystickID`, an index | SDL 2 buttons; a hat has `0x100` set, an axis `0x10000` |
| Azahar | `config/qt-config.ini`, `[Controls]` profile `profile`+1 | `guid:` in each value | SDL 2; `api:controller` names the controller's button |
| Gopher64 | config.json, `input` | the profile in `input_profile_binding[0]` | SDL 3 when `dinput`; its slots as its `input_profile.rs` orders them |
| DuckStation | `settings.ini`, `[Pad1]` | `SDL-<SDL 3 GUID>-<serial>`, else `SDL-0` | SDL names, `SDL-0/A` |
| PCSX2 | `inis/PCSX2.ini`, `[Pad1]` | `SDL-0` | SDL names, `SDL-0/FaceSouth` |
| Dolphin | `Config/GCPadNew.ini` `[GCPad1]`, `Config/WiimoteNew.ini` `[Wiimote1]` | `Device = SDL/0/<name>` | SDL names in backticks; GameCube port 1 needs `SIDevice0 = 6` in `Config/Dolphin.ini` |
| Cemu | `controllerProfiles/controller0.xml` | `uuid`, `<index>_<SDL 3 GUID>` | SDL 3; 38–49 are axes, 42 and 43 ZL and ZR |
| Ryujinx | Config.json, `input_config` for `Player1` | `id`, the GUID as a .NET Guid with its first four characters zeroed | SDL 2 controller names; − and + are `Back` and `Start` in older versions, `Minus` and `Plus` in newer |
| xemu | `xemu.toml`, `[input.bindings] port1` | an SDL 3 GUID | its own layout, by position: White on LB, Black on RB |

## Players 2 to 4

Each emulator keeps the next players beside player 1: Mesen 2 in `Port2`
with codes from `0x1100`, PCSX2 and DuckStation in `[Pad2]` on `SDL-1`,
or in DuckStation on that controller's own name,
Gopher64 at the next place of each list in `input`, its profile named
`Emu <maker>:<product>` where Emu wrote it, Dolphin in `[GCPad2]`
with `SIDevice1 = 6` and in `[Wiimote2]` with `Source = 1`, since its
Wii Remotes 2 to 4 are off unless set, Cemu in `controller1.xml` as a
`Wii U Pro Controller`, Ryujinx in `Player2` and xemu in `port2`. Gopher64
binds each player to the controller's SDL path, which changes whenever the
controller connects again, so Emu points it at the path again before an N64
game starts. Before a game starts, Emu sets each player
up again in the emulators that name the controller, so each controller plays
as the player it keeps with the account. DuckStation names a controller
by its SDL 3 GUID and the serial Rux Emu Helper reads, where the serial is
plain letters, digits and hyphens, and accepts that name whatever its
`SDLUsePersistentDeviceIdentifiers` says. Mesen 2, PCSX2, and DuckStation
for a controller with no such serial, number controllers in an order of
their own, Apple's or SDL's, which SDL
does not keep from one start to the next with the same controllers
connected. A controller that connects while they run comes after the ones
they found at start, so Play has every controller after player 1's turned
off before the game opens and on again once it has. macOS can take most of
a minute to drop a controller that was turned off.
A GameCube or Wii game played with another of its console's controllers
says so in Dolphin's file for that game, `GameSettings/<disc ID>.ini`,
which Dolphin reads over its own files, for each player in play, and has
none of these lines on its console's own controller. Game Boy Advances are
`[Core] SIDevice0 = 13`, GBA (Integrated), and so on, their buttons in
`Config/GBA.ini`, `[GBA1]` to `[GBA4]`, as `GCPadNew.ini` names them, with
`Buttons/SELECT` and `Buttons/START`. The Wii Remote held sideways and the
Classic Controller are a profile for each player,
`Config/Profiles/Wiimote/emu-remote-1.ini` or `emu-classic-1.ini` and so
on, one `[Profile]` section with the player's device, `Extension = None`
and `Options/Sideways Wiimote = True`, or `Extension = Classic` and its
`Classic/Buttons/A`, `Classic/Triggers/L` and `Classic/Left Stick/Up` lines,
which the game's file names by `[Controls] WiimoteProfile1 =` with
`WiimoteSource0 = 1`. The GameCube controller in a Wii game turns every
Remote off, `WiimoteSource0 = 0` to `3`, and sets each player's
`SIDevice` to 6. A profile with no Nunchuk and the Remotes turned off were
each proven by launching Super Mario Galaxy.
Cemu and Ryujinx have motion on only for a Nintendo or PlayStation
controller, since an Xbox controller has no gyro.
mGBA, melonDS and Azahar play one player.

Set up changes only the lines that bind the controller: Cemu's profile
name, Ryujinx's light and Azahar's own button names stay, and Ryujinx's
− and + keep the names its file already uses, `Minus` and `Plus` or `Back`
and `Start`.

Ryujinx rewrites its Config.json when it quits, and Cemu rewrites
`controller0.xml` when its input settings close, so either file is changed
only with its app closed.
