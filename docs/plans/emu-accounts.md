---
type: plan
---

# Plan: Emu for each of rux's accounts

## Goal

rux logs in to Rux Emu with any of his own accounts, on a Mac at work or at
family's, and finds the same collection, set up and downloaded the same way,
with that account's own saves and settings, as a second profile on a game
console has. The saves this builds on are
`docs/plans/emu-emulator-profiles.md`, and the downloads
`docs/plans/emu-server.md`.

## Decisions

- **Every account is rux's own.** The list of accounts is the owner's to
  edit and holds only his, since the games, BIOS and keys are his copies for
  his own use and are handed to nobody else.
- **An account on the list is a member, and `emu_is_member()` asks it,** as
  `coins_is_member()` does for Coins; the owner is always one.
- **The collection is shared and only the owner changes it:** the game
  list, the drive's report, the BIOS, keys, firmware and installers, and the
  settings Emu manages for each emulator. A member reads them; Update, the
  scan and the organize tool stay the owner's.
- **Saves and settings are each account's own:** saves, save states and
  memory cards, each Mac's settings and their backups, and the Macs
  themselves. A member reads and writes only its own, and the owner's are
  closed to it as its are to the owner's pages.
- **A new account starts with no saves,** as a new console profile does.
- **The owner copies a save to another account,** with Copy to on the Saves
  page, so a game started at home goes on elsewhere; no account but the
  owner copies one.
- **Notes on a game are shared and the owner's to write,** since they are
  about the collection.
- **`emu_saves`, `emu_macs` and `emu_files` carry the account a row belongs
  to,** and their rule is that account's alone; a row of a shared file, a
  BIOS or an installer, carries none and any member reads it.
- **The bytes stay held once, under their SHA-1,** so the same save in two
  accounts is two rows and one file; a member is sent a file only through a
  row it may read.
- **Settings are kept per account and per Mac,** in
  `settings/<account>/<mac>/<emulator>/`, since one Mac may be played on by
  two accounts.
- **The helper keeps no log-in, as now,** and carries for whichever account
  the page is signed in as; it remembers each save's last carry per account,
  so two accounts on one Mac do not take each other's saves.
- **Two accounts on one Mac share that Mac's emulator folders,** so Play
  first puts away the saves of the account that played last and lays down
  the signed-in account's.
- **A download comes from the home server to a Mac on rux's Tailscale,**
  whichever account is signed in.
- **`docs/database-access.md` says the new rule** in the commit that
  applies it.

## Questions

None open.

## Tasks

After the saves are carried for the owner, in this order:

- [ ] Add the list of accounts and `emu_is_member()`, and a place on the
  page where the owner adds and removes one.
- [ ] Label `emu_saves`, `emu_macs` and `emu_files` with their account, the
  rows there now the owner's, and set each table's and bucket's rule.
- [ ] Open the collection's tables and shared files to a member to read.
- [ ] Have the page read and carry as the signed-in account, and hide what
  is the owner's alone from a member.
- [ ] Add Copy to on the Saves page, for the owner.
- [ ] Have the helper keep each account's carries apart, and swap the saves
  on a Mac when the account playing changes.
- [ ] Prove it with a second account on the MacBook Pro: its own saves, the
  owner's untouched, and a member refused the owner's rows.
