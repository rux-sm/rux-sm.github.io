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

- **A game has no header.** One bar holds its places: along the bottom on a
  phone and along the top on a wide screen. A guest has only that today, so
  the owner and a player see one game.
- **Play shows no bar,** only its own keys and a way back, as Pixels' puzzle
  and Pixelator do now.
- **What the header held moves to the Player page,** as a list under the
  player: How to play, Add to home screen, Theme, the way to Rux Home, and
  for the owner alone Manage and Players.
- **A guest has Theme too.** It is kept in the browser, so it asks nothing
  of an account, and a guest has no Rux Home to go to.
- **That list is Carbon's contained list,** which Design ships, so it needs
  no part of its own.
- **The switcher on Home still lists every game.** `switcher.json` and the
  log-in are as they are.

The order:

- **Pixels first, in place, under its own prefix,** so the shapes are
  proven on a real game before Design holds them.
- **Design second:** three templates, `game-hub.html`, `game-play.html` and
  `game-player.html`, of an invented game, each verified as
  `design/docs/verifying-templates.md` asks, with their rows in
  `design/docs/composing-pages.md`, `design/docs/choices.md` and the
  `design-page` skill.
- **Sevens third:** its list of tables onto Hub and its table onto Play.
  Whether it has a Player page is decided when its turn comes.

The parts Carbon lacks:

- **Five parts are a game's and not Carbon's:** the bar of places, the game
  key, which is an icon over a word, the picture tile with its progress,
  the start cover and the finish panel.
- **They live in one sheet that Design serves, `design/css/rux-game.css`,
  under the prefix `game-`.** No `rux--` class can be added for them, since
  every one of those is compiled from Carbon, and a copy in each game would
  drift. The check and `AGENTS.md`'s Names learn the prefix.
- **Every colour in that sheet is a `--rux-*` token,** as an app's own parts
  are held to.

## Questions

None open.

## Tasks

- [ ] Move the five parts out of `pixels/app.css` into
      `design/css/rux-game.css` under `game-`, teach the check the prefix,
      and add it to `AGENTS.md`'s Names and its rule on what must not be
      invented.
- [ ] Write the three templates in Design with an invented game, verify
      them, and add their rows to `design/docs/composing-pages.md`,
      `design/docs/choices.md` and the `design-page` skill. Run the full
      check.
- [ ] Move Sevens: its list of tables onto Hub and its table onto Play.
- [ ] Say each game's pages by the three shapes in its `README.md`.
