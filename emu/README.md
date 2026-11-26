# Emu

The game collection on rux's home server: every game, which version it
is, and what needs fixing — one app on [design](../design/), served at
**rux-sm.github.io/emu/**.

The repository root's `AGENTS.md` is the policy, and
`docs/plans/emu-app.md` is what is still to build.

## What it is

`index.html` is the Library, drawn by `library.js`: every console down the side, the chosen one's
games as a wall of covers beside them, the ones the server keeps in Supabase, and over the wall
the chosen game: libretro's screenshot of it, its facts and description, its save, and Play; beside it, four players, each the controller playing it on that console or No controller, opening where its buttons are set: a photo of the console's own controller, whose buttons light as the controller's are pressed, over the controller's own buttons and what each does. Each of the four is its own tile. A right-click on a cover opens the game's menu: Favourite, Finished, About this copy and Remove from this Mac. What this Mac lacks is faded, and
the chosen game's button downloads it. The wall's title row holds Installed or All games, Sound and the strip, which says how this Mac
stands and what a move did. Without Rux Emu Helper, as on the phone, it is the consoles and the games alone, a game
opening in its panel. `collection.html` is the
same games as a table, with a filter per system and per status; on a Mac it marks
each game this Mac holds, and On this Mac lists only those, each with Remove, over
how much room is free. A game's status is its worst problem, as Problems lists them,
or Good. A game opens in a side panel, `game-panel.js`: what this Mac can do with
it, `this-mac.js`, which is Play, Download to this Mac with its progress and Remove
from this Mac; then its saves, rux's notes, and in a fold its region, version and format, each file's header and
fingerprints and a Switch game's add-ons. Search, `search.js`,
finds any game by title and chooses it on the Library, ⌘K too; it sits in each page's
header with the pages' menu.

`problems.html` lists every game that needs a look, under one heading per
kind, worst first: a missing disc or track, a copy not on the list, a bad
header, an encrypted 3DS copy, a game to convert or rename, the newest
revision or update when the server holds an older one, a converted game's
original still in the server's to-delete folder, a BIOS file an emulator
needs, and a save whose game is not on the server. It says when that folder is
safe to empty: when every game converted from what is in it is marked as playing.

`saves.html` shows where the copies stand, the server's last scan and the
backup zips Supabase keeps to download; then every save by system, on the
server, on a Mac or carried through Supabase, each with its kind, dates and
how to restore it, and rux's note on a server's or a Mac's.

`status.html` says what is done and what is left, and saves this Mac each time it
opens: its report and any save it keeps itself. For the collection: each BIOS a
system with games needs and each emulator's installer, which Supabase holds,
whether its project has a newer one out, and saves on the server still in a
folder from before each emulator had its own. For this Mac live from the
helper, and each other as it was last saved, folded shut below it until
opened: ES-DE reading this Mac's library, each emulator saving into its own
folder, and each retired app in `emulators.json` still there or still holding
files. Installing an app is what says a Mac plays with it, so one not
installed is grey, and red only when its old folder still holds saves. An
emulator whose systems have no games is not needed yet.

`emulators.html` shows one profile per emulator from `emulators.json`, each a fold Status links
to: the version Supabase holds and each Mac's, with Install where this Mac lacks it; each file
it needs; every kind of file it writes with the setting that moves it; the settings to have,
with backups to put back and a preferred set; and what is worth knowing. `docs/emulator-setup.md`
is how each is set up on a Mac, `docs/home-server.md` how the home server sends a game, and
`docs/drawing-consoles.md` how a console is drawn in pixels for the Library. `docs/controller-settings.md` is where each emulator keeps its controller's buttons, which the controller map reads. `brand/logos/`
and `brand/controllers/` hold each system's logo and controller, named as its console is; no
page shows them. Sprites writes all three folders from the drawings in `sprites/art/`. `brand/originals/` holds a photo of each console's own controller from Wikimedia Commons, which `pads.js` credits and marks each button on.
`brand/marks.svg` holds each console's wordmark in one colour, which the Library shows over its games.

## The scan

    CACHE=/cache SUPABASE_KEY=<secret key> node emu/tools/scan-roms.mjs /games --save

`tools/scan-roms.mjs` is the home server's nightly scan, as `docs/home-server.md`
runs it. It runs `scan.js`, which reads every game in the server's roms folder
and the BIOS in its bios folder, and saves the scan to Supabase: every game and
save, leaving rux's notes, moving the notes of a game the organize tool renamed,
removing what is no longer there, and each BIOS, key, firmware and installer
Supabase lacks. It keeps each game's cover, rux's own picture from the games
folder's `art` folder or libretro's fetched once, and puts it in Supabase. Each game `emu_info` lacks it looks up in libretro's database for its year, genre, developer, publisher, players and, for the PlayStation and PS2, its description. It
keeps its fingerprints, the scan and the fetched covers in its cache folder and
never writes beside the games. Each save is matched to its game the way its
emulator names it, by file name, title ID, disc ID or serial, as
`emulators.json` says for each system. The first scan fingerprints every file;
the next reads only files that are new or changed. Key files among the BIOS are
listed by name and never read.

When the games folder holds a lists folder, every game is matched against the
No-Intro and Redump lists as libretro publishes them, and every Switch game
against titledb's versions list; `scan.js` says how. A CHD is matched by the
tracks inside it, which the organize tool keeps when it makes the CHD, or
chdman extracts once.

    CACHE=<the scan's cache> node emu/tools/organize-roms.mjs <games folder>          what it would do
    CACHE=<the scan's cache> node emu/tools/organize-roms.mjs <games folder> --yes    do it

`tools/organize-roms.mjs`, run on the server, turns PlayStation BIN and CUE games
and PlayStation 2 ISOs into CHDs, adds a playlist beside a game on more than one
disc, and renames every other file and its saves to its list name, keeping each
rename in the scan's cache for the next scan. It touches only games whose every
file is on the list, checks each CHD before its original moves, and moves
originals to the to-delete folder instead of deleting them. chdman comes from
`rom-tools`.

    node emu/tools/build-helper.mjs <the server's games folder, over its share>

`tools/build-helper.mjs` builds Rux Emu Helper from `helper/main.swift` and zips it into
the server's emulators folder, where the nightly scan puts it in Supabase for Status to
offer. The menu bar helper answers only the Rux Emu site, on `127.0.0.1:47647`, with the
calls `helper/main.swift` lists: Play, from this Mac's library only; this Mac as it stands
with the saves it keeps itself; an emulator installed from Supabase with a receipt of its
version, and its settings read and written; and the library, `~/Emulation/roms/`, a game
downloaded into it from the home server or removed. The app carries its own
`emulators.json`, so build it again after a change.

## How it works

`emu_games`, `emu_saves` and `emu_scan` hold the last scan saved, `emu_macs` how each Mac
stood, `emu_notes` rux's marks and notes, `emu_cards` each save's name as a card, `emu_controllers` the names rux gives controllers, `emu_info` each game's facts and description as the scan looked them up, and the `emu-backups` bucket the old backup zips.
`emu_files` lists each copy of each file the `emu-collection` bucket holds, its bytes there
under its SHA-1 and its newest copy in the view `emu_files_now`: the BIOS, keys, firmware
and installers every Mac is given, each game's cover, and the last five copies of each Mac's settings for an
emulator and of its preferred set. Only the owner reads them, and `docs/database-access.md`
is the rule. Nothing from the collection is ever written here, because this repository is
public.

| | |
| :--- | :--- |
| `data.js` | the reads and writes |
| `emulators.json` | each system's emulator, why, how it names a save, what it needs and how it opens a game; and each emulator's profile: where it keeps saves on a Mac, every other file it writes by class, the settings to have and its notes; the scan and the helper read it too |
| `helper/main.swift` | Rux Emu Helper, the menu bar app the site asks to play a game, read this Mac, install an emulator, read and write its settings, and download a game to this Mac or remove it |
| `scan.js` | the scan, for the server's nightly run |
| `saves-rules.js` | which game a save belongs to, for the scan and the Saves page alike |
| `app.js` | the systems, each one's preferred format, what each emulator needs, a game's problems and status, sizes and dates |
| `game-panel.js`, `this-mac.js`, `carry.js`, `helper.js`, `gamepad.js` | one game in the side panel; its Play, Download and Remove on this Mac; its emulator's saves carried between this Mac and Supabase around Play; asking Rux Emu Helper to play, download and read this Mac; a controller as moves |
| `library.js`, `collection.js`, `problems.js`, `saves.js`, `status.js`, `emulators.js` | each page's own behaviour |
| `search.js` | Search, in every page's header |
| `app.css` | the filters, rows, the side panel's facts and its part for this Mac, under `emu-` |
| `overrides.css` | the side panel hidden when closed and full width on a phone; a search result as a row, not a link |

The local preview on :8640 has no log-in and reads nothing; use the cloud
preview on :8641 or the published site.

## Check

    npm run check        from the repository root
