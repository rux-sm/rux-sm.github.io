---
type: plan
---

# Plan: Pixels, a world map for the front page

## Goal

The course is a journey a player can see. The front page is a map of one
fantasy land with a path through it, and a rift opens on the path where a
rift of the course is. The map is drawn a part at a time and the rest lies
under fog, so it is as big as the course is and never looks empty. The
player's character walks to a rift and goes in, and a rift ends on its boss.
The character is one rux draws, and a player makes it their own by drawing
on the armour they unlock. Each picture is built on a placeholder first, so
the game works before it is drawn.

## Decisions

`docs/plans/pixels-standard-set.md` is the course: its twelve rifts, their
names, worlds, ranks, enemies and locks. This plan is how they are shown.

The world map:

- **The front page shows the course as a map, in place of its tiles.** The
  tabs over it and the bar of places are as they are.
- **The map is tall, and its path climbs.** Rift 1 is at the foot and rift 12
  at the top, because a phone is tall and a thumb scrolls up.
- **It is drawn in six parts, one to a rank, each 120 squares wide and 80
  tall with two rifts on it.** rux draws a part as its rifts are drawn, so
  the map never waits on a picture of the whole land.
- **A part shows once one of its rifts is published,** on its placeholder if
  its picture is not drawn yet. Over the highest part shown lies one band of
  fog, and the map ends there, so with one rank published it is one screen.
- **Each square is a whole number of screen pixels.** Three to a square is
  360px, which a phone 360px wide or more shows whole, and a wide screen
  takes four; a whole number keeps the squares sharp.
- **A part's two rifts stand at two spots its template fixes,** so the
  picture is drawn round them. A spot moves by changing its two numbers.
- **A rift on the map is its portal, as `app.js` draws it now:** in its
  rank's colour while open, shut in grey once cleared, and dim while locked.
  It needs no drawing.
- **Beside each portal are its words:** its rank and name and how many
  sprites are found, or for a locked one how many sprites open it. The
  portal and its words are one link, so a screen reader reads the map as a
  list of its rifts.
- **A rift not yet published, on a part that shows, is a still place on the
  path,** with no portal and no words, so a rift opens on the map on the day
  it is published.
- **A rift newly open pulses until it is entered,** since movement is for a
  reward.
- **The page opens with the player's own rift in view:** the one they last
  went into, kept in this browser, or the first with a sprite left to find.
- **Continue is one primary button that opens the next puzzle to play:** the
  first not found in the player's rift, or in the first open rift with one
  left. It stands over the bar of places on a phone, by the thumb, and is
  not there once everything is found.
- **A custom rift is not on the path.** It has no number, so it keeps its
  tile, as Design's picture tile.
- **The game says its story in one line, at the door and in How to play:**
  Rifts are opening. Close them. A cleared rift's portal is already shut, so
  the map tells it too.

Inside a rift:

- **A rift's page keeps its grid of fifteen, lettered A to O,** in any order
  but for the boss, so one hard puzzle never stops a player.
- **The boss comes out when the other fourteen are found.** Until then its
  tile is dim and no link and says how many are left. Finding it clears the
  rift, which pays the fairies as clearing does now.
- **A boss already found stays found.** The rule is only on playing a boss
  that is not out, and the page holds it, as it holds a rift's lock.
- **A custom rift has no boss rule,** since it holds from three puzzles to
  fifteen.
- **A rift's world is one picture at the head of its page, 120 squares wide
  and 40 tall, with the grid under it.** Behind the grid it would not show,
  because a tile is not seen through. It has no spots to place, so it needs
  no template, and a rift without one has none.

The character:

- **Every player starts as one base character, which rux draws.** It is 15
  squares a side, as a player's picture and a portal are, so the Pixelator's
  board draws it and it stands on the map at a rift's size.
- **It has three pieces of armour: a helmet, body armour and a shield.** At
  15 squares a side those are the pieces with room to draw on.
- **Armour is unlocked a piece at a time, and a piece unlocked is the
  player's to draw on.** It starts as rux's drawing of it, the player paints
  over its squares in the game's inks, and it can be set back to rux's.
- **The helmet is unlocked at five sprites found,** which is rift 1's
  lesson, so a new player's first sitting ends on a reward.
- **A piece is a set of the character's squares,** so a drawing of it lies
  over the base and nothing else moves. A piece not yet unlocked is not
  worn.
- **Drawing on armour costs no mana,** since it makes no puzzle.
- **A player's armour is kept with the player in the database,** so it comes
  back on any phone with their name and PIN. The SQL is shown to rux first.
- **The player's picture stays what stands beside their name.** The
  character is who walks the map and stands on Me.
- **A tap on an open rift walks the character there along the path, in about
  half a second, and then the rift opens.** A second tap opens it at once.
  There is no steering, and with motion turned down in the phone's settings
  there is no walk.
- **A tap on a locked rift says what opens it and goes nowhere.**

The pictures:

- **rux draws the six parts of the map, the base character, its three pieces
  of armour, and a world for a rift where one is wanted.** They are pixel
  art, drawn one pixel to a square and painted from the game's own
  fifty-five inks, so they sit with the sprites.
- **The map and the worlds are PNGs in `pixels/art/`:** `map-1.png` to
  `map-6.png` from the foot up, `fog.png`, and `rift-01.png` to
  `rift-12.png`.
- **The character and its armour are kept as a sprite is,** a character a
  square in the game's inks, so a player's drawing and rux's are one kind of
  thing.
- **A picture keeps its own colours in every theme,** as a sprite does, and
  the page round it follows the theme.
- **A part of the map, the fog and the character have a placeholder first,
  made by a script,** which is also rux's template: the canvas at its size
  with its spots marked.

The order:

- **Five steps, each whole by itself:** the map's first part under fog; the
  boss and Continue; the character and its helmet; the rest of the armour;
  the worlds. What needs no drawing comes first, and the worlds, which are
  the most drawing for the least play, come last.

## Questions

- **What unlocks the body armour and the shield?** Recommended 15 sprites
  found in the course and then 30, so each comes within the rifts that are
  published and none waits on a rift still to draw.
- **Does the character hop, or walk in frames?** A hop moves one standing
  drawing along the path. Walking frames need the base and every piece of
  armour drawn again for each frame, and a player's own drawing fits only
  one. Recommended the hop.
- **Who sees a player's character?** Only the player, on the map and on Me,
  or their friends too, on Friends. Recommended the player alone first,
  since a store asks for a way to report what one player draws and another
  sees.
- **While a part is a placeholder, who sees the map?** A push publishes, so
  every player would see grey blocks. Recommended that only the owner sees
  the map until the first part is rux's picture, and the other players keep
  the tiles.
- **Where do custom rifts stand?** A spot of their own on the map that the
  maker picks, with a branch to it; or one side place rux draws on the
  first part, off the path, that opens them as a list of tiles; or a list
  under the map. Recommended the one side place: every player has different
  friends, so spots picked freely would land on each other and crowd the
  map, and a branch to a rift nobody has made yet cannot be drawn into the
  picture.

## Tasks

- [ ] Make the placeholders by a script, each with its spots marked: the
      six parts of the map and the fog, as `pixels/art/map-1.png` to
      `map-6.png` and `fog.png`.
- [ ] Step 1, the map: draw the course on the front page over the parts
      that show, with fog above them, each rift's portal and words at its
      spot, the locked, cleared, new and unpublished looks, custom rifts
      kept as tiles, and the page opening on the player's rift. Measure it
      at 360, 402 and 1280 wide.
- [ ] Write `pixels/docs/drawing-the-map.md`, the how-to for a picture: each
      canvas and its size, the spots, the inks, and the file to save.
- [ ] Step 2, the boss and Continue: hold the boss until the fourteen are
      found, on the rift's page, on the puzzle's page and in Next puzzle;
      add Continue to the front page; and say the story's line at the door
      and in How to play.
- [ ] Step 3, the character and its helmet: the base character on the map
      at the player's rift, on a placeholder first; its walk to a tapped
      rift; the helmet at five sprites; a place on Me to draw on an unlocked
      piece with the Pixelator's board; and a player's armour kept in the
      database, the SQL shown to rux first.
- [ ] Step 4, the rest of the armour: the body armour and the shield, each
      at what unlocks it.
- [ ] Step 5, the worlds: a rift's picture at the head of its page, where
      it has one.
- [ ] Put each of rux's pictures in place of its placeholder as it is drawn,
      and show the map to every player once its first part is rux's
      picture.
- [ ] Correct `docs/plans/pixels-standard-set.md` and `pixels/README.md`
      where they say a rift is a tile on the front page and that no puzzle
      of a rift is locked, in the commit that changes each.
