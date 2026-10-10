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
- **A gate holds fifteen puzzles,** lettered A to O in Picross DS. It holds
  nine now, in the pages and in the database.
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
  none of its pictures: everyday things, one to a board, named in one or two
  plain words. `pixels/docs/making-puzzles.md` is the guide to a picture.
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
| 1 | Easy | 5×5, then 10×10 | Letters | what a number is, a line that fills itself, two numbers and their gap; then a number over half the line gives its middle squares |
| 2 | Level 1 | 10×10 | Signs | two and three numbers in a line, and X where no run can reach |
| 3 | Level 2 | 15×15 | Outside | long runs on a big board, the zoom, counting by the fifth lines |
| 4 | Level 3 | 15×15 | Toys | round shapes worked in from the edges, and a first hole |
| 5 | Level 4 | 15×15 | At home | handles and legs: thin parts, so lines of 1s and 2s |
| 6 | Level 5 | 15×15 | Animals | eyes and feet: holes in a shape, a picture that comes slowly |
| 7 | Level 6 | 15×15 | Things that go | wheels and windows: many numbers in a line, little to start from |
| 8 | Level 7 | 15×15 | The sea | wavy edges and short runs everywhere |
| 9 | Level 8 | 15×15 | Food | layers and toppings: short runs inside a big shape |
| 10 | Level 9 | 15×15 | Machines | detail inside a solid outline: dials, buttons, keys; the hardest 15×15 |
| 11 | Level 10 | 20×20 | Buildings | the first 20×20; rows of windows, the same small number many times |
| 12 | Extra | 20×20 | Creatures | faces and limbs, everything at once; the last boss |

What each gate's pictures are drawn to. These start from the ten live
puzzles and two players' times, and are corrected as gates are played. Gates
11 and 12 have none, because no 20×20 has been drawn or timed.

| Gate | First look gives | Most numbers in a line | Filled | Pixelator says | A good time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1, its 5×5 | 35% or more | 3 | 35 to 65% | easy | 10 seconds |
| 1, its 10×10 | 55% or more | 2 | 50 to 70% | normal or easier | under a minute |
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

Fifteen things to draw in each, as a start:

1. **Letters:** L, T, H, U and E at 5×5, then F, N, P, R, I, B, G, M, W and
   Z at 10×10. Drawn plainly those five have one answer at 5×5, grade easy
   and have two lines that fill themselves; A, C, K, O, S, V, X and Y have
   more than one answer there.
2. **Signs:** heart, star, arrow, diamond, spade, club, note, question mark,
   lightning, plus, tick, cross, exclamation mark, crown, speech bubble.
3. **Outside:** moon, sun, cloud, tree, cactus, mountain, leaf, flower,
   mushroom, raindrop, snowflake, rainbow, volcano, acorn, campfire.
4. **Toys:** ball, balloon, kite, teddy bear, yo-yo, spinning top, drum,
   rubber duck, building block, dice, doll, toy boat, puzzle piece,
   skateboard, rocking horse.
5. **At home:** cup, key, lamp, chair, umbrella, bell, candle, pencil, boot,
   table, bed, door, spoon, book, scissors.
6. **Animals:** cat, dog, rabbit, duck, snail, turtle, bird, pig, panda,
   mouse, frog, horse, cow, sheep, fox.
7. **Things that go:** car, bus, truck, bicycle, sailboat, train, plane,
   rocket, helicopter, tractor, scooter, hot-air balloon, submarine, tram,
   canoe.
8. **The sea:** fish, crab, octopus, whale, shark, seahorse, shell, anchor,
   lighthouse, jellyfish, starfish, dolphin, lobster, ship's wheel,
   treasure chest.
9. **Food:** burger, pizza slice, cupcake, ice cream, hot dog, fries,
   doughnut, taco, cake, sandwich, egg, cheese, pretzel, cookie, lollipop.
10. **Machines:** camera, clock, radio, telephone, television, fan, robot,
    sewing machine, typewriter, toaster, washing machine, computer, kettle,
    vacuum cleaner, calculator.
11. **Buildings:** house, barn, castle, tower, church, windmill, skyscraper,
    tent, bridge, igloo, pyramid, shop, school, garage, treehouse.
12. **Creatures:** owl, dragon, ghost, alien, wizard, knight, mermaid,
    dinosaur, monster, unicorn, witch, pirate, fairy, yeti, vampire.

## Questions

1. **How does a tile show fifteen pictures?** It shows nine, three by three,
   two tiles across on a phone. Three are drawn at 390px to pick from: three
   across and taller, one gate a row with five across, and four across with
   the gate's number in the first square.

## Tasks

- [ ] Say in the Pixelator's corner how much the first look gives, beside
      the grade and the share filled.
- [ ] Guide a picture to its gate's goal in the Pixelator: the gate's
      numbers beside the picture's, which it misses, and a warning on Save.
- [ ] Write the course into `pixels/docs/making-puzzles.md`: the twelve
      gates, what each teaches and the numbers each is drawn to.
- [ ] Hold a gate to fifteen: `PER_LEVEL` in `pixels/make.js`,
      `pixels/manage.js` and `pixels/puzzles.js`, the count on Me and
      Players, the full gate in `pixels_keep_puzzle`, and the three
      documents that say nine; the SQL is shown to rux first.
- [ ] Lay fifteen out on a gate's tile and on its page, on a phone and a
      wide screen.
- [ ] Let gate 1 hold its two sizes on one tile and one page, the five 5×5
      first.
- [ ] Send each gate's audience with its puzzles, so a page tells the
      course from a gate kept for picked players; the SQL is shown to rux
      first.
- [ ] Number each gate of the course on the front page and its own page,
      take the grade tag off both, and stand the custom gates after it.
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
