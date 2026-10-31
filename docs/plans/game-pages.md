---
type: plan
---

# Plan: Game pages, a template for games in Design

## Goal

A game has page shapes of its own, as an office app has its table and its
form: a hub of tiles, a play screen and a player's page, with one bar of
places and no header. Pixels is built to them first, Design gains them as
templates, and Sevens follows, so the next game starts from a template made
for games and not from a table page.

## Decisions

The shapes:

- **Three page shapes: Hub, Play and Player.** A Hub is tiles to pick from,
  as Pixels' rifts and Sevens' tables are. Play is the board alone, as a
  puzzle, the Pixelator and a card table are. Player is who is playing and
  what they can set.
- **Carbon's look stays and its shape changes.** The tokens, the themes, the
  type, the grid, and its tiles, tags, buttons, progress bars and modals are
  used as they are, so a game reads as one of the family.
- **Tiles, not tables.** A tile is a picture, a name and how far along it
  is.
- **One job to a screen,** where an office page holds many.
- **A phone's controls are at the bottom,** by the thumb, and 48px or more
  to press.
- **Colour belongs to the art.** The page stays in Carbon's neutrals, so a
  picture or a portal is what is looked at.
- **Movement is for a reward:** something found, opened or earned.

One bar:

- **A game is one column a phone wide on every screen.** One bar along its
  foot holds its places. On a wide screen it also takes the shell's header,
  with no links, for the account menu.
- **Play shows no bar,** only its own keys and a way back, as Pixels' puzzle
  and Pixelator do now.
- **On a phone what a header would hold is on the Player page,** as a list
  under the player: How to play, Add to home screen and the way to Rux
  Home. A game that locks its theme, as Pixels does, has no Theme there.
- **That list is Carbon's contained list,** which Design ships, so it needs
  no part of its own.
- **The switcher on Home still lists every game.** `switcher.json` and the
  log-in are as they are.

The order:

- **Pixels first,** so the shapes are proven on a real game before Design
  holds their templates.
- **Design second:** three templates, `game-hub.html`, `game-play.html` and
  `game-player.html`, of an invented game, each verified as
  `design/docs/verifying-templates.md` asks, with their rows in
  `design/docs/composing-pages.md`, `design/docs/choices.md` and the
  `design-page` skill.
- **Sevens third:** its list of tables onto Hub and its table onto Play.
  Whether it has a Player page is decided when its turn comes.

The parts Carbon lacks:

- **Six parts are a game's and not Carbon's:** the page, which is its
  bottom room and its width on a phone, the bar of places, the game key,
  which is an icon over a word, the picture tile with its progress, the
  start cover and the finish panel.
- **They live in one sheet that Design serves, `design/css/rux-game.css`,
  under the prefix `game-`.** No `rux--` class can be added for them, since
  every one of those is compiled from Carbon, and a copy in each game would
  drift. The shared check fails an app on a `game-` class the sheet lacks,
  and Design's class gate fails a template on one.
- **Every colour in that sheet is a `--rux-*` token,** as an app's own parts
  are held to.

## Questions

None open.

## Tasks

- [ ] Move Sevens: its list of tables onto Hub and its table onto Play.
- [ ] Say each game's pages by the three shapes in its `README.md`.
