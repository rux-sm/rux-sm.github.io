---
type: plan
---

# Plan: Pixels in three places, Play, Create and Me

## Goal

Pixels has three places, in the bar on a phone and the header on a wide
screen: Play, Create and Me. Play is the puzzles. Create is everything a
player makes, and for the owner the base game too. Me is the player alone:
their picture, name, friends and settings, and for the owner a short Owner
section. The owner sees the same three places as everyone, with one switch
on Create and one section on Me more.

## Decisions

The places:

- **The bar and the header are Play, Create and Me,** with their words, on
  every page but a puzzle being played or drawn. Play is today's front page
  at `./`, renamed from Puzzles. Friends, Manage and Players leave the bar
  and the header.
- **No developer mode.** The owner's extra tools sit where a player's own
  tools sit, shown only to the owner.

Create, a new page, `create.html`:

- **For a player, Create is one list:** a heading with their mana beside
  it, a New puzzle button across the page, and a block for each of their
  rifts: its name, how many puzzles and the sizes, a Hidden tag until it is
  published, a menu of Rename, Publish or Hide and Delete, and a strip of
  its pictures ending in an add tile. A picture opens it in the Pixelator;
  the add tile opens the Pixelator for that rift.
- **Me's Your rifts moves here whole,** and mana is shown here alone, since
  making puzzles is the one thing it pays for.
- **For the owner, Create has a switch at its top, Game and Mine.** Mine is
  the owner's own rifts, as a player's are, drawn at `make.html?own`. Game is
  Manage: the base rifts, each with its Published switch and a menu, then
  Unsorted. Tapping a rift's block opens Manage's panel under it as today,
  with its order arrows, the key for picked players, each puzzle's switch
  and ticking to move.
- **`manage.html` and `manage.js` go,** their work moved into Create's Game
  view; New puzzle in Game opens the Pixelator for the base game.

Me:

- **The head is the picture, the name with a pencil, and sprites and
  fairies.** The pencil opens a modal to change the name, in place of the
  field and Save that stand open today. Draw your picture stays under it.
- **Friends is a list on Me:** each friend with a menu holding Remove, and
  Invite a friend, which opens the friend link in a modal with Share, Copy
  and New link. `friends.html` and `friends.js` go; a friend link stays
  `/pixels/?join=`, which every page already reads.
- **Then one list:** PIN, which opens a modal to set, change or remove it,
  How to play, Sound, Add to home screen and Rux Home. A guest's Delete my
  player stays at the page's foot.
- **The owner's section, Owner, comes last:** Players, which opens
  `players.html`, and New players can join, the switch that today sits on
  Players and moves here.

## Questions

None open.

## Tasks

- [ ] Create for a player: `create.html` and `create.js` with the mana
  heading, New puzzle, and the rift blocks with their menus, strips and add
  tiles, from the code in `pixels/me.js` that draws Your rifts.
- [ ] Create for the owner: the Game and Mine switch, Game drawn by
  Manage's code moved from `pixels/manage.js`, its rows as blocks with the
  Published switch and a menu; `manage.html` and `manage.js` deleted.
- [ ] Me: the head with the pencil and its rename modal, the friends list
  and invite modal from `pixels/friends.js`, the PIN modal, the list, and
  the Owner section; Your rifts and the open name field gone;
  `friends.html` and `friends.js` deleted.
- [ ] Players: the joining line gone, now on Me.
- [ ] The bar and header on every Pixels page: Play, Create and Me, and
  `app.js`'s icon map for them.
- [ ] `pixels/README.md` and `pixels/docs/profiles.md` say each change, in
  the commit that makes it.
- [ ] Check every place in Chrome on :8641, as a player and as the owner,
  with `npm run check -- --full` passing, and delete the mockups in
  `design/m/pixels-nav/`.
