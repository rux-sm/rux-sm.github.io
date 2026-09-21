---
type: plan
---

# Plan: a second icon family in Design

## Goal

Design draws from Google's Material Symbols as well as Carbon, so a page can
use an icon Carbon has no drawing for and, where the glyphs are small, a solid
one. Carbon stays the house family and everything it draws today it keeps.

The first caller is the scheduler's trip bar, which draws its marks at 12px.
That surface takes the solid set whole: outlines do not survive at that size,
Carbon has almost no solid variants, and the requirements the office adds have
no Carbon drawing at all. What the bar gains is one family, legible, and every
requirement wearing the icon the office picked.

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
- **A surface takes one family, not one decision.** The line is not which app
  owns a choice; it is how small the glyphs are. A trip bar draws its marks at
  12px, where only a solid glyph survives, so the whole bar goes Material
  solid -- the paperclip, the phone, the dollar, the bus and every
  requirement. Everything else in the app draws icons at 16 to 20px in
  toolbars, menus and the side nav, where Carbon's outlines read properly, and
  none of that changes. A strip that mixed the two would show it.
- **Which means the bar's five Carbon marks are replaced, not kept.** Carbon
  has a filled variant for `phone` and `user` and for none of the other nine
  the bar uses, so a solid bar cannot be a Carbon bar. This is the cost of the
  decision above and is worth saying plainly.
- **Material's live area is looser than Carbon's, and both are normalised.**
  Measured across the bar's set, Carbon's wide glyphs fill 81 to 89% of their
  box and its dollar 46%, which is a narrow glyph being honestly narrow.
  Material's solid set runs 58 to 100%, with its money at 37%. So Material is
  the looser family even on its own, and a strip of it would step in size from
  mark to mark. The build fits each glyph to a common live area, which is now
  a question of Material agreeing with itself rather than with Carbon.
- **The grid itself needs nothing.** Material's `0 -960 960 960` and Carbon's
  `0 0 32 32` both normalise through the `<symbol>` viewBox the sprite already
  writes per icon.

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

## Questions

- **How is a glyph fitted to a common live area?** Node has no native way to
  measure an arbitrary path, so it is a small build dependency, or a per-icon
  viewBox recorded by hand and checked by the gate, or the crop is skipped and
  Material's own boxes stand. Skipping is the cheapest and would leave the bar
  stepping in size from mark to mark.
- **Does the crew row go with the bar?** It sits on the same bar at the same
  size, and its role glyphs would be the only Carbon left there. Moving them
  makes the bar one family throughout; leaving them keeps a change that is
  already large from growing. Either way its colours are a separate problem.
- **Which other pages want this first?** The plan is written for the trip bar
  because that is where the gap bites, but the reason to build it is that other
  apps get a second drawer. Knowing the next caller would say how much more
  than the bar's set goes in.

## Tasks

- [ ] rux answers the questions above and says go.
- [ ] Teach `build-icons.mjs` a second source: a Material list beside the
      Carbon one, each entry with its reason, quarried from
      `@material-symbols/svg-400/sharp` and written as `m-<name>`.
- [ ] Fit each Material glyph to a common live area, by whichever answer the
      first question takes.
- [ ] Split the glyph snapshot in two and teach `check-glyphs` to pick by
      prefix; regenerate both.
- [ ] Add Google's entry to `NOTICE`, beside IBM's.
- [ ] Say in `design/README.md` that the sprite holds two families and what
      each is for.
- [ ] Move the trip bar's marks to the Material solid set, and point each
      requirement at the icon name the office's list already stores, so the
      letter fallback is left only for a name Material does not have.
- [ ] rux looks at a real week and says whether the two families sit together.
