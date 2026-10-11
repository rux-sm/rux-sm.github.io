---
type: plan
---

# Plan: Pixels, a standard set of puzzles in a course

## Goal

Pixels comes with a standard set: a course of rifts the owner draws and every
player is sent, with the footprint of Picross DS's Easy and Normal courses.
It starts with a lesson on small boards and climbs in size and in how hard it
is, so a new player always has a next puzzle and a player who has found
everything has played a whole game.

## Decisions

- **The base game is the owner's rifts that everyone is sent,** in one order,
  small boards first. It is the same for every player, and all of it is
  still to draw. A rift keeps its theme.
- **The footprint is Picross DS's: twelve rifts of fifteen, 180 puzzles.**
  Rift 1 is its Easy level, rifts 2 to 11 its Normal levels 1 to 10, and
  rift 12 its Extra level.
- **A rift holds fifteen puzzles,** lettered A to O as Picross DS letters a
  level's.
- **Rift 1 holds two sizes, five 5×5 and then ten 10×10,** as the Easy level
  does. Every other rift of the course is one size, though any rift can
  hold more.
- **Boards stop at 15×15 for now.** 5×5, 10×10 and 15×15 hold 5, 25 and 120
  of the 180, so rifts 8 to 10 are 15×15 where Picross DS's levels 7 to 9
  are 20×20.
- **Rifts 11 and 12 are 20×20, the finale,** where Picross DS ends on 25×20.
  The 20×20 board is built last, before rift 11 is drawn, and the database
  already takes 20 a side.
- **A big board is played zoomed in on a phone,** as Picross DS zooms its
  large puzzles. The squares share 270px on a phone 390px wide, which is
  18px each on a 15×15 and about 13px on a 20×20.
- **A custom rift is outside the base game.** It is one of the owner's kept
  for the players ticked in Manage, or a player's own, sent to their
  friends, and the owner has their own as any player does. It has no number
  and no lock, and stands after the course on the front page. Fruit and the
  live 15×15 rift are the owner's own.
- **A player's own rift holds up to fifteen,** and is published with three or
  more as now. It stays 5, 10 or 15 a side, and a new player's nine mana
  stays.
- **Rifts are drawn in order.** Rifts 1 to 5 are the ones open from the
  start.
- **rux draws every picture.** The course takes Picross's shape and feel and
  none of its pictures: one thing to a board, named in one or two plain
  words. `pixels/docs/making-puzzles.md` is the guide to a picture.
- **A rift's puzzles are its enemies, and its boss the strongest.** They are
  creatures a player knows on sight, because the guess is half the fun, and
  the weakest come first: bugs, then forest, swamp, cave, haunted house,
  sea, desert, ice, robots, castle and legends.
- **How much the first look gives is what a rift is drawn to.** It is the
  share of the board known after one look at every row and column. On the ten
  live puzzles it follows the players' times and the count of rounds does
  not: Strawberry gives 66% and takes 37 seconds, Apple gives 22% and takes
  three minutes. The Pixelator shows it beside the grade.
- **The Pixelator guides a picture to its rift's goal.** With a rift of the
  course picked, it shows that rift's numbers beside the picture's own and
  says which the picture misses. Save warns and still saves.
- **A rift's number says how hard it is.** A player reads Rift 5, and the
  Easy, Normal and Hard tag leaves the front page and a rift's page, because
  it calls a 24-second puzzle normal. The grade stays in the Pixelator and
  Manage.
- **A rift's tile is its portal, drawn in pixels in the game's own inks,**
  one rift to a row on a phone, because the rift's own page already shows
  its fifteen pictures. A rift has a rank by its number, two rifts to a
  rank from E to S, and each rank a colour: green, blue, purple, orange,
  red and gold. A cleared rift's portal is shut, in greys, and a custom
  rift has no rank and is teal.
- **A rift's page letters its puzzles A to O,** as Picross DS does, in place
  of Puzzle 7, and O is the boss. They stand three across on a phone, with
  the name and best time under each, and five across in three rows on a
  wide screen, which is Picross DS's grid.
- **Rifts open as Picross DS's levels do.** Rifts 1 to 5 are open from the
  start. Rifts 6 to 11 open at 40, 50, 60, 70, 80 and 90 sprites found in
  rifts 2 to 11, and rift 12 when all 150 of those are found. Picross DS
  also asks for each under an hour, and Pixels has no time limit. The page
  holds the lock and the database sends the puzzles as now, since a time is
  already the browser's word. A custom rift is never locked.
- **The rules of play stay.** A mistake is shown and costs time, and a hint
  costs time.
- **A puzzle offers Picross DS's free hint as it starts:** one row and one
  column, picked at random, filled in at no cost.
- **A rift is published when its fifteen are drawn,** hidden until then as a
  new rift is now, so the course grows a rift at a time and no player meets
  half of one.
- **Each new rift holds a placeholder until it has a puzzle,** because a rift
  lasts only while it holds one. It is a plain frame named Placeholder,
  switched off, so no player is sent it even from a published rift. It is
  redrawn as the rift's first puzzle or deleted.
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

What each rift is for, and the level of Picross DS it stands for.

| Rift | Picross DS's | Size | Theme | What it teaches |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Easy | 5×5, then 10×10 | Bugs | what a number is, a line that fills itself, two numbers and their gap; then a number over half the line gives its middle squares |
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

What each rift's pictures are drawn to. These start from the ten live
puzzles and two players' times, and are corrected as rifts are played. Rifts
11 and 12 have none, because no 20×20 has been drawn or timed.

| Rift | First look gives | Most numbers in a line | Filled | Pixelator says | A good time |
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

- **Inside a rift the fifteen climb too:** five at the easy end of its
  numbers, nine in the middle, and a boss one rift harder. Rift 1's five
  5×5 come first.
- **Every lesson puzzle has two lines that fill themselves,** a 5 or numbers
  that add up to the line, such as 3 1.

Fifteen enemies to draw in each, as a start, the boss last:

1. **Bugs:** snail, worm, bee, beetle and dragonfly at 5×5, which are drawn,
   then ant, tick, ladybird, slug, caterpillar, spider, centipede,
   cockroach, woodlouse and scorpion at 10×10.
2. **Flying bugs:** fly, gnat, mosquito, butterfly, moth, wasp, firefly,
   mayfly, horsefly, grasshopper, cricket, cicada, locust, praying mantis,
   hornet.
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

- [ ] Guide a picture to its rift's goal in the Pixelator: the rift's
      numbers beside the picture's, which it misses, and a warning on Save.
- [ ] Write the course into `pixels/docs/making-puzzles.md`: the twelve
      rifts, what each teaches and the numbers each is drawn to.
- [ ] Send each rift's audience with its puzzles, so a rift the owner keeps
      for picked players has no number and stands after the course; the SQL
      is shown to rux first.
- [ ] Lock rifts 6 to 12 until their count of sprites is found: a rift's
      tile, its page and a solved puzzle's Next.
- [ ] Offer the free hint as a puzzle starts: one row and one column filled
      in, with nothing added to the clock.
- [ ] Count the course on the front page, and say when all of it is found.
- [ ] Give a 10×10 its 30px squares at 390px, with every line's numbers
      still in their room, and look at each size in Chrome at that width.
- [ ] Publish rifts 1 to 10 in order, each as its fifteenth puzzle is drawn.
- [ ] Add the 20×20 board to the Pixelator, play and Manage: a square of
      whole pixels, every line's numbers in their room, and the zoom on a
      phone.
- [ ] Set the numbers rifts 11 and 12 are drawn to, from the first 20×20
      drawn and timed.
- [ ] Publish rifts 11 and 12 the same way.
