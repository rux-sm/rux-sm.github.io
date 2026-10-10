---
type: plan
---

# Plan: Pixels, a standard set of puzzles in a course

## Goal

Pixels comes with a standard set: a course of gates the owner draws and every
player is sent, with the footprint of Picross DS's Easy and Normal courses.
It starts with a lesson on small boards and climbs in size and in how hard it
is, so a new player always has a next puzzle and a player who has found
everything has played a whole game.

## Decisions

- **The base game is the owner's gates that everyone is sent,** in one order,
  small boards first. It is the same for every player, and all of it is
  still to draw. A gate keeps its theme.
- **The footprint is Picross DS's: twelve gates of fifteen, 180 puzzles.**
  Gate 1 is its Easy level, gates 2 to 11 its Normal levels 1 to 10, and
  gate 12 its Extra level.
- **A gate holds fifteen puzzles,** lettered A to O as Picross DS letters a
  level's.
- **Gate 1 holds two sizes, five 5×5 and then ten 10×10,** as the Easy level
  does. Every other gate is one size, and a gate is one size in the database
  and in a page's address now.
- **Boards stop at 15×15 for now.** 5×5, 10×10 and 15×15 hold 5, 25 and 120
  of the 180, so gates 8 to 10 are 15×15 where Picross DS's levels 7 to 9
  are 20×20.
- **Gates 11 and 12 are 20×20, the finale,** where Picross DS ends on 25×20.
  The 20×20 board is built last, before gate 11 is drawn, and the database
  already takes 20 a side.
- **A big board is played zoomed in on a phone,** as Picross DS zooms its
  large puzzles. The squares share 270px on a phone 390px wide, which is
  18px each on a 15×15 and about 13px on a 20×20.
- **A custom gate is outside the base game.** It is one of the owner's kept
  for the players ticked in Manage, or a player's own, sent to their
  friends, and the owner has their own as any player does. It has no number
  and no lock, and stands after the course on the front page. Fruit and the
  live 15×15 gate are the owner's own.
- **A player's own gate holds up to fifteen,** and is published with three or
  more as now. It stays 5, 10 or 15 a side, and a new player's nine mana
  stays.
- **Gates are drawn in order.** Gates 1 to 5 are the ones open from the
  start.
- **rux draws every picture.** The course takes Picross's shape and feel and
  none of its pictures: one thing to a board, named in one or two plain
  words. `pixels/docs/making-puzzles.md` is the guide to a picture.
- **A gate's puzzles are its enemies, and its boss the strongest.** They are
  creatures a player knows on sight, because the guess is half the fun, and
  the weakest come first: bugs, then forest, swamp, cave, haunted house,
  sea, desert, ice, robots, castle and legends.
- **How much the first look gives is what a gate is drawn to.** It is the
  share of the board known after one look at every row and column. On the ten
  live puzzles it follows the players' times and the count of rounds does
  not: Strawberry gives 66% and takes 37 seconds, Apple gives 22% and takes
  three minutes. The Pixelator shows it beside the grade.
- **The Pixelator guides a picture to its gate's goal.** With a gate of the
  course picked, it shows that gate's numbers beside the picture's own and
  says which the picture misses. Save warns and still saves.
- **A gate's number says how hard it is.** A player reads Gate 5, and the
  Easy, Normal and Hard tag leaves the front page and a gate's page, because
  it calls a 24-second puzzle normal. The grade stays in the Pixelator and
  Manage.
- **A gate's tile is a square of sixteen: its number, then its fifteen
  pictures, four across.** It stays two tiles across on a phone. A custom
  gate has no number, so its first square is its maker's picture.
- **A gate's page letters its puzzles A to O,** as Picross DS does, in place
  of Puzzle 7, and O is the boss. They stand three across on a phone, with
  the name and best time under each, and five across in three rows on a
  wide screen, which is Picross DS's grid.
- **Gates open as Picross DS's levels do.** Gates 1 to 5 are open from the
  start. Gates 6 to 11 open at 40, 50, 60, 70, 80 and 90 sprites found in
  gates 2 to 11, and gate 12 when all 150 of those are found. Picross DS
  also asks for each under an hour, and Pixels has no time limit. The page
  holds the lock and the database sends the puzzles as now, since a time is
  already the browser's word. A custom gate is never locked.
- **The rules of play stay.** A mistake is shown and costs time, and a hint
  costs time.
- **A puzzle offers Picross DS's free hint as it starts:** one row and one
  column, picked at random, filled in at no cost.
- **A gate is published when its fifteen are drawn,** hidden until then as a
  new gate is now, so the course grows a gate at a time and no player meets
  half of one.
- **Each new gate holds a placeholder until it has a puzzle,** because a gate
  lasts only while it holds one. It is a plain frame named Placeholder,
  switched off, so no player is sent it even from a published gate. It is
  redrawn as the gate's first puzzle or deleted.
- **The puzzles stay in the database,** made in the Pixelator and ordered in
  Manage. No file of them is committed and no tool loads them.
- **The front page counts the whole course,** and says so when every sprite
  is found, in place of the empty page a finished player has now.
- **A 10×10 has 30px squares on a phone 390px wide,** from a narrower corner
  and gutters. They are 27px now, and 30px is the most that width gives
  beside the numbers.
- **The puzzle of the day and the leaderboard stay off.** This plan does not
  touch them.

### The course

What each gate is for, and the level of Picross DS it stands for.

| Gate | Picross DS's | Size | Theme | What it teaches |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Easy | 5×5, then 10×10 | Crawling bugs | what a number is, a line that fills itself, two numbers and their gap; then a number over half the line gives its middle squares |
| 2 | Level 1 | 10×10 | Flying bugs | wings: two and three numbers in a line, and X where no run can reach |
| 3 | Level 2 | 15×15 | Forest | long runs on a big board, the zoom, counting by the fifth lines |
| 4 | Level 3 | 15×15 | Swamp | round shapes worked in from the edges, and a first hole |
| 5 | Level 4 | 15×15 | Cave | wings, tails and legs: thin parts, so lines of 1s and 2s |
| 6 | Level 5 | 15×15 | Haunted house | eyes and mouths: holes in a shape, a picture that comes slowly |
| 7 | Level 6 | 15×15 | Sea | tentacles and fins: many numbers in a line, little to start from |
| 8 | Level 7 | 15×15 | Desert | coils and stripes: short runs everywhere |
| 9 | Level 8 | 15×15 | Ice | fur and tusks: short runs inside a big shape |
| 10 | Level 9 | 15×15 | Robots | detail inside a solid outline: dials, bolts, eyes; the hardest 15×15 |
| 11 | Level 10 | 20×20 | Castle | the first 20×20; armour and bricks, the same small number many times |
| 12 | Extra | 20×20 | Legends | wings, heads and tails, everything at once; the last boss |

What each gate's pictures are drawn to. These start from the ten live
puzzles and two players' times, and are corrected as gates are played. Gates
11 and 12 have none, because no 20×20 has been drawn or timed.

| Gate | First look gives | Most numbers in a line | Filled | Pixelator says | A good time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1, its 5×5 | 35% or more | 3 | 35 to 65% | easy | 10 seconds |
| 1, its 10×10 | 55% or more | 3 | 50 to 70% | normal or easier | under a minute |
| 2 | 45% or more | 3 | 45 to 65% | normal or easier | a minute |
| 3 | 40% or more | 4 | 50 to 65% | normal or easier | 2 to 3 minutes |
| 4 | 35 to 45% | 4 | 50 to 60% | normal or easier | 3 to 4 minutes |
| 5 | 35 to 45% | 5 | 45 to 60% | normal | 3 to 5 minutes |
| 6 | 30 to 40% | 5 | 45 to 60% | normal | 4 to 6 minutes |
| 7 | 30 to 40% | 6 | 40 to 55% | normal | 5 to 7 minutes |
| 8 | 25 to 35% | 6 | 40 to 55% | normal or hard | 6 to 8 minutes |
| 9 | 20 to 30% | 7 | 35 to 50% | hard | 7 to 10 minutes |
| 10 | under 25% | 7 | 35 to 50% | hard | 8 to 12 minutes |

- **Inside a gate the fifteen climb too:** five at the easy end of its
  numbers, nine in the middle, and a boss one gate harder. Gate 1's five
  5×5 come first.
- **Every lesson puzzle has two lines that fill themselves,** a 5 or numbers
  that add up to the line, such as 3 1.

Fifteen enemies to draw in each, as a start, the boss last:

1. **Crawling bugs:** ant, tick, beetle, ladybird and slug at 5×5, then worm,
   snail, caterpillar, spider, centipede, cockroach, flea, woodlouse, earwig
   and scorpion at 10×10. Drawn plainly those five have one answer at 5×5,
   grade easy and have two lines that fill themselves.
2. **Flying bugs:** fly, gnat, mosquito, bee, butterfly, moth, wasp, firefly,
   dragonfly, grasshopper, cricket, cicada, locust, hornet, queen bee.
3. **Forest:** fox, crow, owl, snake, hedgehog, badger, hawk, boar, stag,
   wolf, bear, mushroom man, elf archer, werewolf, walking tree.
4. **Swamp:** frog, toad, newt, leech, eel, turtle, heron, water snake,
   piranha, slime, crocodile, lizard man, will-o'-wisp, bog monster, hydra.
5. **Cave:** bat, rat, mole, salamander, blind fish, giant spider, imp,
   goblin, gnome, cave bear, ogre, rock golem, lava blob, stone snake, troll.
6. **Haunted house:** black cat, ghost, skull, skeleton, zombie, witch,
   pumpkin head, scarecrow, haunted doll, haunted painting, chest with
   teeth, poltergeist, headless rider, grim reaper, vampire.
7. **Sea:** jellyfish, crab, pufferfish, lobster, stingray, swordfish,
   octopus, squid, anglerfish, shark, sea snake, siren, ghost pirate, sea
   serpent, kraken.
8. **Desert:** scarab, horned lizard, rattlesnake, vulture, jackal, hyena,
   cobra, cactus man, bandit, dust devil, tomb guard, mummy, genie, sand
   worm, sphinx.
9. **Ice:** penguin, seal, snow hare, arctic fox, snowy owl, walrus,
   reindeer, snowman, snow leopard, sabre-tooth cat, polar bear, mammoth,
   yeti, ice golem, frost giant.
10. **Robots:** wind-up bot, drone, robot dog, robot arm, roller bot, spider
    bot, saw bot, turret, tank, android, cyborg, flying saucer, mech, war
    machine, giant robot.
11. **Castle:** guard dog, spearman, archer, jester, knight, crossbowman, war
    horse, gargoyle, living armour, executioner, court wizard, black knight,
    sorcerer, royal champion, evil king.
12. **Legends:** pegasus, unicorn, centaur, griffin, harpy, phoenix, medusa,
    cyclops, minotaur, cerberus, chimera, basilisk, titan, demon, dragon.

A bug is drawn with a thick body, because thin legs leave squares the
numbers cannot decide.

## Questions

None open.

## Tasks

- [ ] Guide a picture to its gate's goal in the Pixelator: the gate's
      numbers beside the picture's, which it misses, and a warning on Save.
- [ ] Write the course into `pixels/docs/making-puzzles.md`: the twelve
      gates, what each teaches and the numbers each is drawn to.
- [ ] Let gate 1 hold its two sizes on one tile and one page, the five 5×5
      first.
- [ ] Send each gate's audience with its puzzles, so a gate the owner keeps
      for picked players has no number and stands after the course; the SQL
      is shown to rux first.
- [ ] Lock gates 6 to 12 until their count of sprites is found: a gate's
      tile, its page, the Continue card and a solved puzzle's Next.
- [ ] Offer the free hint as a puzzle starts: one row and one column filled
      in, with nothing added to the clock.
- [ ] Count the course on the front page, and say when all of it is found.
- [ ] Give a 10×10 its 30px squares at 390px, with every line's numbers
      still in their room, and look at each size in Chrome at that width.
- [ ] Publish gates 1 to 10 in order, each as its fifteenth puzzle is drawn.
- [ ] Add the 20×20 board to the Pixelator, play and Manage: a square of
      whole pixels, every line's numbers in their room, and the zoom on a
      phone.
- [ ] Set the numbers gates 11 and 12 are drawn to, from the first 20×20
      drawn and timed.
- [ ] Publish gates 11 and 12 the same way.
