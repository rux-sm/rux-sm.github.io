---
type: plan
---

# Plan: a second icon family in Design

## Goal

Design draws from Google's Material Symbols as well as Carbon, so a page can
use an icon Carbon has no drawing for and, where the glyphs are small, a solid
one. Carbon stays the house family and everything it draws today it keeps.

The first caller is the whole scheduler, which moves to the Material solid
set: its trip bar draws marks at 12px where outlines do not survive, Carbon has
almost no solid variants, and the requirements the office adds have no Carbon
drawing at all. An app is the unit rather than a surface, because a bar drawn
in one family and a toolbar above it in another is the inconsistency this is
meant to end. What the scheduler gains is one family throughout, legible at the
size it needs, and every requirement wearing the icon the office picked.

## Decisions

### Why a second family at all

- **The office already names its icons, in Material's vocabulary.** rux-ui's
  Settings keeps the requirements list, and each entry carries an icon name
  from a Material picker: `airline_seat_flat`, `groups`, `accessible`,
  `apartment`, `credit_card`, `wifi`, `bolt`. The scheduler discards that name
  and falls back to the requirement's initial, so a need rux adds is a letter
  on the bar until someone asks for a Carbon glyph. Reading the name the office
  already chose ends that.
- **Carbon has no answer for most of them.** Design's sprite carries 78 of
  Carbon's symbols and Carbon ships no Wi-Fi, no outlet and no credit card that
  survives 12px; `purchase` was taken for the fuel card because it is the only
  card-shaped drawing in the set.
- **And it is not a solid-icon fix.** Carbon ships about 149 filled variants
  across its whole set, and of the eleven symbols a trip bar uses only `phone`
  and `user` have one. Material has a filled twin for every icon, so a solid
  set is available there in a way it is not from Carbon.

### The source

- **`@material-symbols/svg-400`, quarried and not depended on,** exactly as
  `@carbon/icons` is: installed for the build, the symbols taken, the package
  removed, the sprite committed. It is 13 MB unpacked, which is the same reason
  Carbon's 123 MB is not a dependency.
- **Apache 2.0, the same licence as Carbon,** so `NOTICE` gains a second entry
  beside IBM's rather than a new kind of obligation.
- **Weight 400 and the `sharp` style.** Drawn at 12px beside Carbon's, weight
  300 is visibly finer than anything Carbon draws and 400 is the closer match;
  of the three styles, `sharp` has the flat terminals Carbon's geometry uses,
  and at 12px the three are otherwise hard to tell apart.
- **The solid variants, on a trip bar.** Rasterised at the 12px a mark draws
  at and magnified, an outline glyph loses its strokes to antialiasing: the
  handset, the bus, the group of people and the bed all come out as grey mush,
  while the solid twin of each keeps a readable silhouette. Material has a
  filled version of every icon, which is the whole reason this is available.

### How they live together

- **One sprite, two prefixes.** A page inlines one block, so a second sprite
  would mean a second block on every page and a second thing to keep current.
  Carbon keeps `i-`, Material takes `m-`: `#i-phone` is Carbon's handset and
  `#m-wifi` is Material's. A name says its family, which is what makes a mixed
  strip reviewable.
- **An app takes one family.** Not a surface: a bar drawn in one family under
  a toolbar drawn in another is the inconsistency this is meant to end. The
  scheduler goes Material solid throughout -- its bar marks, its toolbar, its
  menus, its side nav, its crew roles. Home, Notes and the log-in stay Carbon,
  and Design itself is compiled from Carbon and always will be.
- **Which means 43 Carbon references in the scheduler are replaced.** The
  scheduler names 43 distinct symbols today. It is the only caller of 15 of
  them, so those leave the sprite; the other 28 are shared with Design's own
  pages or with Home and Notes and stay for them.
- **No glyph is refitted.** Carbon's wide glyphs fill 81 to 89% of their box
  and its dollar 46%; Material's solid set runs 58 to 100% with its money at
  37%. Both families draw a narrow glyph narrow, which is the drawing being
  honest rather than the family being sloppy. The spread only mattered while
  the two were to share a strip, and with an app on one family they never do.
  So Material's own boxes stand, and a build dependency and a hand-kept table
  of sizes are both avoided. If a strip reads unevenly once it is real, that is
  evidence to act on rather than a cost to pay up front.
- **The grid itself needs nothing.** Material's `0 -960 960 960` and Carbon's
  `0 0 32 32` both normalise through the `<symbol>` viewBox the sprite already
  writes per icon.
- **A page carries only the symbols it names.** The build inlines the whole
  sprite into all 45 pages today, so a Notes page references four icons and
  carries 78 -- 23 KB, 11% of the page. A second family would double that bill
  for pages that use none of it. `build-icons.mjs` already rewrites each page's
  block and already knows which symbols exist, so it can write the ones that
  page references instead of all of them. This is worth doing whether or not
  Material lands, and it is what makes a second family cost only its callers.

### The gates

- **`check-glyphs` learns a second snapshot.** It reads
  `data/carbon-glyphs.json` and treats a symbol with no entry as a finding,
  because a name Carbon has no file for is a name we invented. A
  `data/material-glyphs.json` joins it and the gate picks the snapshot by the
  symbol's prefix, so each family is still compared against its own publisher's
  drawing. Without this, the first Material symbol fails CI.
- **The snapshot records what normalisation produced,** not Material's raw
  file, since the sprite no longer carries Material's own viewBox. The gate's
  question stays the same: is this the drawing its publisher ships, at the
  size we claim.
- **`check-icons` needs nothing.** It counts `<use>` against symbols and does
  not care which family a name belongs to.

### What this is not

- **Not a replacement.** Carbon remains the family Design is compiled from and
  the one a page reaches for first. Material is the second drawer.
- **Not a free-for-all.** A Material symbol enters the sprite the way a Carbon
  one does: named in the build's list, with a line saying who asked and why.
- **Not the crew row.** A driver's disc carries four states in red, amber and
  green, and red measures 2.29 to 2.33 against all nine bar hues -- under the
  3 to 1 a 12px glyph needs. That is a colour problem, not an icon problem, and
  no change of family touches it.

### What the office can pick is a closed list

- **Thirty names, and no more.** rux-ui's requirements editor offers a fixed
  `ICON_OPTIONS` of 30 Material names and nothing else writes that field, so
  the set a requirement's icon can hold is known at build time. Design ships
  those 30 alongside the scheduler's own, and the letter fallback is left for
  a row saved before the list existed.
- **This is what makes subsetting safe.** A page's symbols are found by
  reading the literal `#i-` and `#m-` names out of its HTML and the scripts it
  loads -- every one of the 90 in this repo is a literal, none is composed --
  but a requirement's icon comes from the database and would be composed.
  Naming the 30 in the scheduler's own source keeps every symbol a page needs
  findable, and `check-icons` fails a page that references one its block does
  not carry.
- **The scheduler's own Settings page, when it is built, offers the same 30.**
  A new icon joins that list by name, with a line saying who asked and why,
  so the list stays one Design ships and subsetting stays safe.

## Questions

None open.

## Tasks

- [ ] Subset each page's sprite block to the symbols it names, as its own
      change and first, so the second family never costs a page that has no
      use for it.
- [ ] Teach `build-icons.mjs` a second source: a Material list beside the
      Carbon one, each entry with its reason, quarried from
      `@material-symbols/svg-400/sharp` and written as `m-<name>`.
- [ ] Fail a page whose block is missing a symbol it references, so a subset
      can never quietly drop one.
- [ ] Split the glyph snapshot in two and teach `check-glyphs` to pick by
      prefix; regenerate both.
- [ ] Add Google's entry to `NOTICE`, beside IBM's.
- [ ] Say in `design/README.md` that the sprite holds two families and what
      each is for.
- [ ] Move all 43 of the scheduler's icon references to the Material solid
      set, and point each requirement at the icon name the office's list
      already stores, so the letter fallback is left only for a name Material
      does not have.
- [ ] Drop the Carbon symbols the scheduler was the only caller of.
- [ ] rux looks at a real week, a toolbar and a menu, and says whether the
      scheduler reads as one thing.
