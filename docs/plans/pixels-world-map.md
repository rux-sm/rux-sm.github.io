---
type: plan
---

# Plan: Pixels, a world map for the front page

## Goal

The course is a journey a player can see. The front page is a map of one
fantasy land with a path through it, and a rift opens on the path where a
rift of the course is. The player's character walks to a rift and goes in,
and inside is that rift's own world, with its fifteen enemies standing in it
and its boss last. The character is one rux draws, and a player makes it
their own by drawing on the armour they unlock. rux draws the map and the
worlds in pixels, and each is built on a placeholder first, so it works
before it is drawn.

## Decisions

`docs/plans/pixels-standard-set.md` is the course: its twelve rifts, their
names, worlds, ranks, enemies and locks. This plan is how they are shown.

The world map:

- **The front page shows the course as a map, in place of its tiles.** The
  tabs over it and the bar of places are as they are.
- **The map is tall, and its path climbs.** Rift 1 is at the foot and rift 12
  at the top, because a phone is tall and a thumb scrolls up.
- **It is one picture, 120 squares wide and 480 tall, each square a whole
  number of screen pixels.** Three to a square is 360px, which a phone 360px
  wide or more shows whole, and a wide screen takes four; a whole number
  keeps the squares sharp.
- **The twelve rifts stand at twelve spots the template fixes,** so the
  picture is drawn round them. A spot moves by changing its two numbers.
- **A rift on the map is its portal, as `app.js` draws it now:** in its
  rank's colour while open, shut in grey once cleared, and dim while locked.
  It needs no drawing.
- **Beside each portal are its words:** its rank and name and how many
  sprites are found, or for a locked one how many sprites open it. The
  portal and its words are one link, so a screen reader reads the map as a
  list of twelve.
- **A rift not yet published is a still place on the path,** with no portal
  and no words, so a rift opens on the map on the day it is published.
- **A rift newly open pulses until it is entered,** since movement is for a
  reward.
- **The page opens with the player's own rift in view:** the one they last
  went into, kept in this browser, or the first with a sprite left to find.
- **A custom rift is not on the path.** It has no number, so it keeps its
  tile, as Design's picture tile.

The character:

- **Every player starts as one base character, which rux draws.** It is 15
  squares a side, as a player's picture and a portal are, so the Pixelator's
  board draws it and it stands on the map at a rift's size.
- **Armour is unlocked a piece at a time, and a piece unlocked is the
  player's to draw on.** It starts as rux's drawing of it, the player paints
  over its squares in the game's inks, and it can be set back to rux's.
- **A piece is a set of the character's squares,** so a drawing of it lies
  over the base and nothing else moves. A piece not yet unlocked is not
  worn.
- **Drawing on armour costs no mana,** since it makes no puzzle.
- **A player's armour is kept with the player in the database,** so it comes
  back on any phone with their name and PIN. The SQL is shown to rux first.
- **The player's picture stays what stands beside their name.** The
  character is who walks the map and stands on Me.
- **A tap on an open rift walks the character there along the path, in about
  half a second, and then the rift opens.** There is no steering, and with
  motion turned down in the phone's settings there is no walk.
- **A tap on a locked rift says what opens it and goes nowhere.**

Inside a rift:

- **A rift of the course opens onto its own world,** one picture 120 squares
  wide and 160 tall, which is one screen of a phone with no scrolling.
- **Its fifteen enemies stand at the same fifteen spots in every rift,** the
  weakest at the foot and the boss at the top, larger, so one template
  serves twelve pictures. The letters A to O go.
- **An enemy found is its sprite, with its name and best time under it.**
  It stands about 40px across whatever its board's size, each square a
  whole number of pixels.
- **An enemy not found is a dark square with a question mark, never its
  shape,** because its shape is the puzzle's answer.
- **The fourteen are played in any order,** so one hard puzzle never stops a
  player, and the one to play next is marked as it is now.
- **The boss comes out when the other fourteen are found.** Until then its
  spot says how many are left. Finding it clears the rift, which pays the
  fairies as clearing does now.
- **A boss already found stays found.** The rule is only on playing a boss
  that is not out, and the page holds it, as it holds a rift's lock.
- **A custom rift keeps its page of tiles,** with no world and no boss rule,
  since it holds from three puzzles to fifteen.

The pictures:

- **rux draws the map, a world for each rift, the base character and each
  piece of its armour.** They are pixel art, drawn one pixel to a square and
  painted from the game's own fifty-five inks, so they sit with the sprites.
- **The map and the worlds are PNGs in `pixels/art/`:** `map.png`, and
  `rift-01.png` to `rift-12.png`.
- **The character and its armour are kept as a sprite is,** a character a
  square in the game's inks, so a player's drawing and rux's are one kind of
  thing.
- **A picture keeps its own colours in every theme,** as a sprite does, and
  the page round it follows the theme.
- **Every picture has a placeholder first, made by a script,** which is also
  rux's template: the canvas at its size with the spots marked.

The order:

- **Five steps, each whole by itself:** the map, the walk, the worlds, the
  boss, the armour. The walk is built with the base character alone.

## Questions

- **Which pieces of armour are there, and what unlocks each?** Recommended
  six, one to a rank: helmet, shield, body armour, boots, sword and cape,
  each unlocked by clearing the first rift of its rank, so the helmet comes
  with rift 1.
- **Does the character hop, or walk in frames?** A hop moves one standing
  drawing along the path. Walking frames need the base and every piece of
  armour drawn again for each frame, and a player's own drawing fits only
  one. Recommended the hop.
- **Who sees a player's character?** Only the player, on the map and on Me,
  or their friends too, on Friends. Recommended the player alone first.
- **While a picture is a placeholder, who sees the map?** A push publishes,
  so every player would see grey blocks. Recommended that only the owner
  sees the map and a rift's world until rux's picture is in, and the other
  players keep the tiles.
- **Where do custom rifts stand?** Under the map, a long scroll down on a
  phone, or on Friends beside who made them. Recommended under the map
  first, because it changes nothing else.

## Tasks

- [ ] Make the placeholder map and the placeholder world by a script, each
      with its spots marked, as `pixels/art/map.png` and
      `pixels/art/rift-01.png` to `rift-12.png`.
- [ ] Step 1, the map: draw the course on the front page over the map's
      picture, with each rift's portal and words at its spot, the locked,
      cleared, new and unpublished looks, custom rifts kept as tiles, and
      the page opening on the player's rift. Measure it at 360, 402 and
      1280 wide.
- [ ] Write `pixels/docs/drawing-the-map.md`, the how-to for a picture: the
      two canvas sizes, the spots, the inks, and the file to save.
- [ ] Step 2, the walk: the base character on the map, at the player's rift,
      and its walk to a tapped rift, on a placeholder character first.
- [ ] Step 3, the worlds: a course rift's page as its world, with the
      fifteen enemies at their spots.
- [ ] Step 4, the boss: hold the boss until the fourteen are found, on the
      rift's page, on the puzzle's page and in Next puzzle.
- [ ] Step 5, the armour: the pieces and what unlocks each, a place on Me to
      draw on an unlocked piece with the Pixelator's board, and a player's
      armour kept in the database, the SQL shown to rux first.
- [ ] Put each of rux's pictures in place of its placeholder as it is drawn,
      and show the map to every player once its own picture is in.
- [ ] Correct `docs/plans/pixels-standard-set.md` and `pixels/README.md`
      where they say a rift is a tile on the front page and a rift's page
      is lettered tiles, in the commit that changes each.
