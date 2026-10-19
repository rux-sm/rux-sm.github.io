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

Leaving a puzzle or a drawing:

- **Play keeps its way out:** Exit, first in the key row and on the Pause
  cover, goes back where the player came from, and the game in progress is
  kept in the browser, as it is today.
- **The Pixelator's Exit goes back to Create,** to the view it came from,
  Mine or Game, and to the rift it was opened for; it goes to Me today. A
  new picture and an edit stay kept as drafts, so leaving loses nothing and
  asks nothing.
- **The browser's Back does the same,** because each way out is a link to
  the page it came from.

Create, a new page:

- **`create.html` is Mine, `create.html?view=game` is Game,** the owner's
  base game. The Pixelator stays `make.html`: `?own` for the owner's own
  rifts, `?gate=` and `?size=` for a base rift, `?id=` for a saved puzzle.
- **For a player, Create is one list:** a heading with their mana beside
  it, a New puzzle button across the page, and a block for each of their
  rifts: its name, how many puzzles and the sizes, a Hidden tag until it is
  published, a menu of Rename, Publish or Hide and Delete, and a strip of
  its pictures ending in an add tile. A picture opens it in the Pixelator;
  the add tile opens the Pixelator for that rift.
- **New puzzle opens a blank Pixelator,** and Save asks for the rift as it
  does today, New rift among them, now chosen first as the last rift saved
  to. A new puzzle costs one mana, taken as it is saved; Create says so by
  the heading, and at no mana New puzzle and the add tiles are off, with
  the line saying how mana is earned.
- **Me's Your rifts moves here whole,** and mana is shown here alone, since
  making puzzles is the one thing it pays for.
- **For the owner, Create has a switch at its top, Mine and Game,** which
  the browser remembers, Mine on a first visit. Mine is the owner's own
  rifts, as a player's are. Game is today's Manage, its blocks laid out as
  Mine's.
- **In Game each part of a block does one thing:** a picture edits that
  puzzle, the add tile adds one, the switch publishes the rift, the menu
  renames, shares with picked players or deletes, and the rift's name opens
  the manage panel under it, which alone holds the order arrows, each
  puzzle's switch and ticking to move.
- **`manage.html` becomes a page that forwards to `create.html?view=game`,**
  keeping `?rift=`, and `manage.js` goes.

Me:

- **The head is the picture, the name with a pencil, and sprites and
  fairies.** The pencil opens a modal to change the name, in place of the
  field and Save that stand open today. Draw your picture stays under it.
- **Friends is one row with how many,** opening `friends.html`, which stays
  as it is but leaves the bar. Its New link says that the old link stops
  working.
- **Then one list:** PIN, which opens a modal to set, change or remove it,
  How to play, Sound, Add to home screen and Rux Home. A guest's Delete my
  player stays at the page's foot.
- **The owner's section, Owner, comes last:** Players, which opens
  `players.html`, and New players can join, the switch that today sits on
  Players and moves here.

Not in this plan: the look of the board, the play screen's spacing, the
mixed icons and the Pixelator's cut-off size field, which are a separate pass.

## Questions

1. A puzzle added to a rift already published goes to players as soon as it
   is saved today. Should it stay hidden until it is switched on, as one in
   a rift with fifteen on already does? Recommended: yes, for a player's own
   rifts and the base game alike, so a half-made rift is never shown.

## Tasks

- [ ] Create for a player: `create.html` and `create.js` with the mana
  heading, New puzzle, and the rift blocks with their menus, strips and add
  tiles, from the code in `pixels/me.js` that draws Your rifts; the no-mana
  state.
- [ ] Create for the owner: the Mine and Game switch, remembered; Game drawn
  by Manage's code moved from `pixels/manage.js`, each part of a block doing
  one thing; `manage.html` forwarding with `?rift=`.
- [ ] The Pixelator: Exit and Delete back to Create's view and rift, Save's
  rift field starting at the last rift saved to, and question 1's rule.
- [ ] Me: the head with the pencil and its rename modal, the Friends row,
  the PIN modal, the list and the Owner section; Your rifts and the open
  name field gone. Friends' New link says what it does.
- [ ] Players: the joining line gone, now on Me.
- [ ] The bar and header on every Pixels page: Play, Create and Me, and
  `app.js`'s icon map for them.
- [ ] `pixels/README.md` and `pixels/docs/profiles.md` say each change, in
  the commit that makes it.
- [ ] Check in Chrome on :8641, as a player and as the owner, with
  `npm run check -- --full` passing: each place's bar with its current
  place marked; Create empty, at no mana, with a long rift name and a full
  rift; a draft, a hidden and a published rift; Save, Exit, a reload and
  the browser's Back from the Pixelator and from a puzzle; a friend link
  opened; Game and Owner refused to a player; a modal with the keyboard up
  at 355px; the last row clear of the bar. Then delete the mockups in
  `design/m/pixels-nav/`.
