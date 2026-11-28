---
type: plan
---

# Plan: Emulator settings set in Emu

## Goal

The settings that change how a game looks and plays, such as Gopher64's
resolution, smoothing and overclock, are shown on each emulator's profile on
the Emulators page, changed there, and written on every Mac before Play, so
a game is the same wherever Emu plays it. Today Emu shows none of them: each
Mac keeps its own, and they reach another Mac only as the preferred set,
which `docs/plans/emu-emulator-profiles.md` describes. Gopher64 comes
first, then the others one at a time.

## Decisions

- **A short list per emulator, called its choices:** only settings that
  change the picture, the speed or the feel. Gopher64's are resolution
  (native, 2×, 4×, 8×), smoothing (SSAA), integer scaling, widescreen, the
  CRT filter, overclock and rewind.
- **Full screen keeps its own switch,** as `docs/plans/emu-full-screen.md`
  has it, and the buttons and stick deadzone stay in the controller map.
- **Each choice is named in `emu/emulators.json` under `choices`:** its
  words on the page, its file, format and key, and each value with its
  words, as `fullScreen` is named. It holds nothing private.
- **One set of choices for the account, the same on every Mac,** kept in
  `emu_prefs` under `choices_<emulator>`, as the full screen choice is
  kept, so no database change is needed. Until the account keeps a set,
  each Mac keeps its own; the first change keeps every choice as this Mac
  shows it.
- **Rux Emu Helper writes the choices before Play,** beside full screen and
  the settings Emu manages, never while a game runs.
- **An emulator window open with no game is quit first,** since Gopher64
  writes its window's own values back when it starts a game or quits; full
  screen is written there the same way. An emulator that names no game
  process cannot be told idle, so a running one is left alone.
- **Emu wins:** a choice changed in the emulator's own window is put back
  to Emu's value at the next Play, so Emu is the one place to set it.
- **Every setting Emu does not choose stays the Mac's own,** and a new Mac
  still starts from the preferred set, with the choices written over it.
- **The profile's Settings part shows each choice** as a Carbon dropdown or
  toggle in plain words, with this Mac's value beside it when it differs,
  read through the helper.
- **Gopher64 first, because its source shows how it behaves:** it reads
  `config.json` when its window opens, and writes the window's values when a
  game starts and when it quits (`src/ui/gui.rs`, version 1.2.2).
- **Dolphin second, then the rest in the order they are played,** each
  emulator's list shown to rux before it is built.
- **Smoothing waits for Gopher64 1.2.2,** because 1.2.1 draws SSAA with
  integer scaling too small.
- **Per-game settings and cheats, such as a game's 60 fps cheat, are left
  out:** they belong to the game's panel and need their own plan.

## Questions

None.

## Tasks

- [ ] Put Gopher64 1.2.2 in the games share's `emulators` folder, from its
  releases page, for Supabase and both Macs; this needs the home network.
- [ ] Put Rux Emu Helper 44 on the games share, for Supabase and the other
  Mac; this Mac runs it.
- [ ] Prove it on the other Mac at its first Play.
- [ ] Name Dolphin's choices, shown to rux first, then each other
  emulator's, one at a time.
