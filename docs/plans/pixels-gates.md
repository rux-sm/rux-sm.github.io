---
type: plan
---

# Plan: Pixels gates, sprites and the Pixelator

## Goal

Pixels reads as one small world: you make sprites in the Pixelator, a set of
them is a gate, and a gate says how big and how hard it is before you enter.
Only words and tiles change. No puzzle, time or player is touched.

## Decisions

**The words**

- **The app stays Pixels,** and is described as Nonogram puzzles, the free
  name for this kind of puzzle.
- **No file says Picross,** because that name is Nintendo's.
- **A category is a gate,** wherever a player or the owner reads the word.
  Every category is one, the owner's too, because nobody else makes them yet.
- **A solved picture is a sprite.** A gate counts them, as in "3 of 9
  sprites". What is solved is still a puzzle, and an unsolved one is still
  "Puzzle 3".
- **Make is the Pixelator,** in the menu and the page's title. Manage and
  Players keep their plain names.
- **Only words a person reads change.** File names, class names, function
  names and the database keep `category` and `level`, so no link, saved game
  or saved setting breaks.

**How hard a gate is**

- **A grade is easy, normal or hard.** Normal replaces medium everywhere a
  grade shows, so it never sits beside a size called medium.
- **A gate's grade is the average of its puzzles',** by the measure `grade`
  in `app.js` already takes of each puzzle, over the puzzles a player is sent.
- **Easy is green, normal is blue and hard is purple,** from the tag colours
  Design already has, which every theme carries.
- **The word is always there with the colour,** for anyone who cannot tell
  the colours apart.

**Clearing a gate**

- **The last puzzle of a gate is its boss,** and its tile says so. A gate
  already lists its puzzles easy to hard, so the last is the hardest.
- **A gate with every puzzle solved says Gate cleared,** on its tile and its
  page, and stays where it is with its sprites showing.

**Not in this plan**

- **Friends making gates.** Today only the owner saves a puzzle, so letting
  others publish is a plan of its own.
- **Gold and the puzzle of the day.** The day's puzzle is switched off and
  Design has no gold.
- **The icon.** It stays the star. A mage head is drawn by
  `docs/app-icons.md` and swapped in by itself.

## Questions

1. **How is a gate's size written?** As the number, "10×10 · Normal", which
   is my pick, because Small, Medium and Large sound like difficulty beside
   Easy, Normal and Hard. Or as those three words.
2. **Where does the colour go?** On a small tag that holds the word, which is
   my pick, because Design has it and one thing carries both. Or as a frame
   round the whole tile, with the word in the line under the name. I can draw
   both on one page to pick from.

## Tasks

- [ ] `switcher.json`, `pixels/manifest.json` and `pixels/README.md` say
      Nonogram puzzles, and the README, `app.css` and `app.js` lose the four
      mentions of Picross.
- [ ] `pixels/app.js`: `grade` says normal, a gate has a grade of its own,
      and `heading` writes the size as question 1 is answered.
- [ ] The front page: a gate's tile shows its size, its grade in its colour
      as question 2 is answered, and "3 of 9 sprites" or Gate cleared.
- [ ] A gate's page: the same in its heading, and Boss on its last puzzle.
- [ ] The maker and Manage say gate in every label and message, and the menu
      on the six pages and the maker's title say Pixelator.
- [ ] `pixels/README.md` and `pixels/docs/making-puzzles.md` use the words.
- [ ] In Chrome on :8641, at phone width and wide, in each of the nine
      themes: the three colours measured for contrast against their tile,
      and a gate cleared end to end as a player.
