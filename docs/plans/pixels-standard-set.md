---
type: plan
---

# Plan: Pixels, a standard set of puzzles in a course

## Goal

Pixels comes with a standard set: a course of gates the owner draws and every
player is sent, shaped like the courses in Nintendo's Picross games. It
starts with a lesson on small boards and climbs in size and in how hard it
is, so a new player always has a next puzzle and a player who has found
everything has played a whole game.

## Decisions

- **The base game is the owner's gates that everyone is sent,** in one order,
  small boards first. It is the same for every player, and all of it is
  still to draw. A gate keeps its nine puzzles and its theme.
- **A custom gate is outside the base game.** It is one of the owner's kept
  for the players ticked in Manage, or a player's own, sent to their
  friends, and the owner has their own as any player does. It has no number
  and no lock, and stands after the course on the front page. Fruit and the
  live 15×15 gate are the owner's own.
- **Twelve gates, 108 puzzles: one of 5×5, seven of 10×10, four of 15×15.**
  The easy course of Mario's Picross is 8, 40 and 16 puzzles of those sizes
  in levels of eight, and Picross DS opens the same way.
- **Gates 1 to 6, 9 and 10 are drawn first.** They are one, five and two, the
  shape of Nintendo's easy course. Gates 7, 8, 11 and 12 are the hard end.
- **rux draws every picture.** The course takes Picross's shape and feel and
  none of its pictures: everyday things, one to a board, named in one or two
  plain words. `pixels/docs/making-puzzles.md` is the guide to a picture.
- **Three sizes stay.** Picross DS goes on to 25×20 with a stylus; a phone's
  squares are 18px on a 15×15, so nothing larger is drawn.
- **How much the first look gives is what a gate is drawn to.** It is the
  share of the board known after one look at every row and column. On the ten
  live puzzles it follows the players' times and the count of rounds does
  not: Strawberry gives 66% and takes 37 seconds, Apple gives 22% and takes
  three minutes. The Pixelator shows it beside the grade.
- **A gate's number says how hard it is.** A player reads Gate 5, and the
  Easy, Normal and Hard tag leaves the front page and a gate's page, because
  it calls a 24-second puzzle normal. The grade stays in the Pixelator and
  Manage.
- **Gates open as the player goes.** The first gate of each size is open from
  the start, and each later one of that size opens when five of the nine in
  the gate before it are found. The page holds the lock and the database
  sends the puzzles as now, since a time is already the browser's word. A
  custom gate is never locked.
- **The rules of play stay.** A mistake is shown and costs time, and a hint
  costs time. Nintendo's free hint at the start, one row and one column
  filled in, is left out of the first course.
- **A gate is published when its nine are drawn,** hidden until then as a new
  gate is now, so the course grows a gate at a time and no player meets half
  of one.
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

What each gate is for. Nintendo's column is the level of the easy course of
Mario's Picross it stands for.

| Gate | Size | Theme | Nintendo's | What it teaches |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 5×5 | Letters | level 1, eight letters | what a number is, a line that fills itself, two numbers and their gap |
| 2 | 10×10 | Signs | level 2, card suits and marks | a number over half the line gives its middle squares |
| 3 | 10×10 | Outside | level 3, moon, star, cactus | two and three numbers in a line, and X where no run can reach |
| 4 | 10×10 | Toys | levels 4 and 6, balloon, ball | round shapes worked in from the edges, and a first hole |
| 5 | 10×10 | At home | levels 4 and 5, cup, bell, boot | handles and legs: thin parts, so lines of 1s and 2s |
| 6 | 10×10 | Animals | level 6, panda, duck, snail | eyes and feet: holes in a shape, a picture that comes slowly |
| 7 | 10×10 | Things that go | car, sailboat, locomotive | wheels and windows: four numbers in a line, little to start from |
| 8 | 10×10 | The sea | whale, anchor | wavy edges and short runs everywhere; the hardest 10×10 |
| 9 | 15×15 | Food | level 7, the first big boards | long runs on a big board, the zoom, counting by the fifth lines |
| 10 | 15×15 | Machines | level 8, camera, coffee maker | detail inside a solid outline: dials, buttons, keys |
| 11 | 15×15 | Buildings | wood stove, mail box | rows of windows: the same small number many times |
| 12 | 15×15 | Creatures | the picture course after it | faces and limbs, everything at once; the last boss |

What each gate's pictures are drawn to. These start from the ten live
puzzles and two players' times, and are corrected as gates are played.

| Gate | First look gives | Most numbers in a line | Filled | Pixelator says | A good time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 35% or more | 3 | 35 to 65% | easy | 10 seconds |
| 2 | 55% or more | 2 | 50 to 70% | normal or easier | under a minute |
| 3 | 45% or more | 3 | 45 to 65% | normal or easier | a minute |
| 4 | 35 to 55% | 3 | 40 to 60% | normal | 1 to 2 minutes |
| 5 | 30 to 45% | 4 | 40 to 55% | normal | 2 minutes |
| 6 | 25 to 40% | 4 | 35 to 55% | normal or hard | 2 to 3 minutes |
| 7 | 20 to 30% | 5 | 35 to 50% | hard | 3 to 5 minutes |
| 8 | under 25% | 5 | 30 to 50% | hard | 4 to 7 minutes |
| 9 | 40% or more | 4 | 50 to 65% | normal or easier | 2 to 3 minutes |
| 10 | 30 to 40% | 5 | 45 to 60% | normal | 4 to 6 minutes |
| 11 | 25 to 35% | 6 | 40 to 55% | normal or hard | 6 to 8 minutes |
| 12 | under 25% | 7 | 35 to 50% | hard | 8 to 12 minutes |

- **Inside a gate the nine climb too:** three at the easy end of its numbers,
  five in the middle, and a boss one gate harder.
- **Every lesson puzzle has two lines that fill themselves,** a 5 or numbers
  that add up to the line, such as 3 1.

Nine things to draw in each, as a start:

1. **Letters:** L, T, H, U, F, E, N, P, R. Drawn plainly these have one
   answer at 5×5; A, K, O, S, V, X and Y do not.
2. **Signs:** heart, star, arrow, diamond, spade, club, note, question mark,
   lightning.
3. **Outside:** moon, sun, cloud, tree, cactus, mountain, leaf, flower,
   mushroom.
4. **Toys:** ball, balloon, kite, teddy bear, yo-yo, spinning top, drum,
   rubber duck, building block.
5. **At home:** cup, key, lamp, chair, umbrella, bell, candle, pencil, boot.
6. **Animals:** cat, dog, rabbit, duck, snail, turtle, bird, pig, panda.
7. **Things that go:** car, bus, truck, bicycle, sailboat, train, plane,
   rocket, helicopter.
8. **The sea:** fish, crab, octopus, whale, shark, seahorse, shell, anchor,
   lighthouse.
9. **Food:** burger, pizza slice, cupcake, ice cream, hot dog, fries,
   doughnut, taco, cake.
10. **Machines:** camera, clock, radio, telephone, television, fan, robot,
    sewing machine, typewriter.
11. **Buildings:** house, barn, castle, tower, church, windmill, skyscraper,
    tent, bridge.
12. **Creatures:** owl, dragon, ghost, alien, wizard, knight, mermaid,
    dinosaur, monster.

## Questions

1. **Are these the twelve?** Their order, themes, numbers and the nine in
   each are all there to be changed.
2. **Do gates open in order,** at five of nine, or stay all open as now?
3. **Does the grade tag leave the players' pages** for the gate's number?
4. **Is Nintendo's free hint at the start wanted,** now or after the first
   course has been played?

## Tasks

- [ ] Say in the Pixelator's corner how much the first look gives, beside
      the grade and the share filled.
- [ ] Write the course into `pixels/docs/making-puzzles.md`: the twelve
      gates, what each teaches and the numbers each is drawn to.
- [ ] Send each gate's audience with its puzzles, so a page tells the
      course from a gate kept for picked players; the SQL is shown to rux
      first.
- [ ] Number each gate of the course on the front page and its own page,
      take the grade tag off both, and stand the custom gates after it.
- [ ] Lock a gate until five of the one before it are found: its tile, its
      page, the Continue card and a solved puzzle's Next.
- [ ] Count the course on the front page, and say when all of it is found.
- [ ] Give a 10×10 its 30px squares at 390px, with every line's numbers
      still in their room, and look at each size in Chrome at that width.
- [ ] Publish gate 1, then gates 2 to 6, 9 and 10, each as its ninth
      puzzle is drawn.
- [ ] Publish gates 7, 8, 11 and 12 the same way.
