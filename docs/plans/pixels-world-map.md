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
on the armour they unlock. A puzzle is played as a fight: the sword fills a
square, the shield crosses one out, a mistake costs the character a heart,
and the enemy's health falls as its picture is filled. Each picture is built on a placeholder first, so
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
  left. It stands over the bar of places on a phone, by the thumb, and over
  the puzzles on a wider screen, and is not there once everything is found.
- **A custom rift is not on the path.** It has no number, so it keeps its
  tile, under the map, and one side place on the map's first part, off the
  path, leads to those tiles. Every player has different friends, so spots
  picked freely would land on each other.
- **While its first part is a placeholder the map is the owner's alone,**
  and every other player is drawn the tiles, because a push publishes.
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

Playing:

- **Fill is the sword and X is the shield, and the two are one switch.**
  The sword is its left half and the shield its right, and the half in hand
  is filled. A tap on a half picks it and so does a slide toward it, so
  nobody has to find a gesture.
- **The switch shows the two pictures alone,** since the board shows the
  mark each leaves.
- **How to play says it as a fight:** strike the squares that are the
  monster, and guard the ones that are not.
- **The character has three hearts, and a mistake takes one.** The clock
  only counts up and is the score, so nobody loses by thinking slowly. A
  hint adds time as it does now.
- **At no hearts the puzzle is lost, gently.** The player picks: a fairy
  brings the character back with every heart, where they have one, or the
  puzzle starts again. Nothing else is lost.
- **The enemy has a health bar: the squares of its picture still to fill,**
  which needs no drawing and no new rule.
- **The hearts and the enemy's bar stand in one strip over the board,**
  where the character and the enemy join them.
- **There are no potions,** since a fairy does a potion's work and a second
  thing to count is one more for a new player to learn.

The character:

- **Every player starts as one base character, which rux draws.** It is 15
  squares a side, as a player's picture and a portal are, so the Pixelator's
  board draws it and it stands on the map at a rift's size.
- **It has three pieces of armour: a helmet, body armour and a shield.** At
  15 squares a side those are the pieces with room to draw on.
- **It is seven layers, one item to each:** skin and eyes are colours
  picked; the head, the body and the shield are drawn on; hands and feet
  follow the body; and the sword is fixed.
- **A piece of armour unlocked adds a heart,** so it is worth more than its
  look.
- **Armour is unlocked a piece at a time, and a piece unlocked is the
  player's to draw on.** It starts as rux's drawing of it, the player paints
  over its squares in the game's inks, and it can be set back to rux's.
- **The helmet is unlocked at five sprites found,** which is rift 1's
  lesson, so a new player's first sitting ends on a reward. The body armour
  comes at 15 sprites found in the course and drawing on the shield at 30,
  so neither waits on a rift still to draw.
- **A piece is a set of the character's squares,** so a drawing of it lies
  over the base and nothing else moves.
- **The base character carries a sword and a plain shield from the start,**
  since they are how it plays. The helmet and the body armour are worn once
  unlocked, and the shield is drawn on once unlocked.
- **Drawing on armour costs no mana,** since it makes no puzzle.
- **A player's armour is kept with the player in the database,** so it comes
  back on any phone with their name and PIN. The SQL is shown to rux first.
- **The player's picture stays what stands beside their name.** The
  character is who walks the map and stands on Me.
- **A tap on an open rift walks the character there along the path, in about
  half a second, and then the rift opens.** A second tap opens it at once.
  There is no steering, and with motion turned down in the phone's settings
  there is no walk.
- **The walk is a hop: one standing drawing moves along the path.** Walking
  frames would need the base and every piece of armour drawn again for each
  frame, and a player's own drawing fits only one.
- **A player's character is seen by that player alone, on the map and on
  Me,** since a store asks for a way to report what one player draws and
  another sees.
- **A tap on a locked rift says what opens it and goes nowhere.**
- **It stands on the puzzle's page too, in the strip over the board, facing
  the enemy,** which is a shadow there, since its picture is the answer.
- **Its moves are the player's:** a drag of fills is a slash, one fill a
  stab and an X a block; it shakes at a mistake and falls at no hearts.
- **It moves by its one drawing.** The sword's layer swings or jabs, the
  shield's lifts and the whole of it shakes or falls, so a player's own
  armour needs no second drawing.

The pictures:

- **rux draws the six parts of the map, the base character, its three pieces
  of armour, the sword and the shield of the switch, nine squares a side,
  and a world for a rift where one is wanted.** They are pixel
  art, drawn one pixel to a square and painted from the game's own
  fifty-five inks, so they sit with the sprites.
- **The map and the worlds are PNGs in `pixels/art/`:** `map-1.png` to
  `map-6.png` from the foot up, `fog.png`, and `rift-01.png` to
  `rift-12.png`.
- **The character, its armour and the switch's two pictures are kept as a
  sprite is,** a character a square in the game's inks, so a player's
  drawing and rux's are one kind of thing.
- **A picture keeps its own colours in every theme,** as a sprite does, and
  the page round it follows the theme.
- **A part of the map, the fog, the character and the switch's two pictures
  have a placeholder first, made by a script,** which is also rux's
  template: the canvas at its size with its spots marked.
  `pixels/docs/drawing-the-map.md` is how a part and the fog are drawn.
- **While its two pictures are placeholders the switch is the owner's
  alone,** as the map is, and every other player has the two keys.

The order:

- **Five steps, each whole by itself:** the map's first part under fog; the
  boss, Continue, the switch and the fight's hearts and bar; the character
  and its helmet; the rest of the armour; the worlds. What needs no drawing comes first, and the worlds, which are
  the most drawing for the least play, come last.

## Questions

None open.

## Tasks

- [ ] Say the story's line at the door, which `pixels/data.js` draws.
- [ ] Step 3, the character and its helmet: the base character in its
      seven layers, on a placeholder first, on the map at the player's rift
      and on the puzzle's page with its moves; its walk to a tapped rift;
      the helmet at five sprites, and a heart for a piece; a place on Me to
      draw on an unlocked piece with the Pixelator's board; and a player's
      armour kept in the database, the SQL shown to rux first.
- [ ] Step 4, the rest of the armour: the body armour, and drawing on the
      shield, each at what unlocks it.
- [ ] Step 5, the worlds: a rift's picture at the head of its page, where
      it has one.
- [ ] Put each of rux's pictures in place of its placeholder as it is drawn,
      and show the map to every player once its first part is rux's
      picture.
- [ ] Correct `docs/plans/pixels-standard-set.md` and `pixels/README.md`
      where they say a rift is a tile on the front page, in the commit that
      shows the map to every player.
