---
type: plan
---

# Plan: a second icon family in Design

## Goal

Design draws from Google's Material Symbols as well as Carbon, so an app can
use an icon Carbon has no drawing for. Carbon stays the house family and keeps
everything it already draws; Material fills the gaps and is available to other
apps and pages. The first gap it closes is the scheduler's requirement marks,
where the office picks the icon and the app currently cannot honour that
choice.

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

### How they live together

- **One sprite, two prefixes.** A page inlines one block, so a second sprite
  would mean a second block on every page and a second thing to keep current.
  Carbon keeps `i-`, Material takes `m-`: `#i-phone` is Carbon's handset and
  `#m-wifi` is Material's. A name says its family, which is what makes a mixed
  strip reviewable.
- **Carbon draws what the app decides; Material draws what the office decides
  or Carbon cannot.** The trip bar's paperclip, phone, dollar, bus and crew
  marks are the app's own vocabulary and stay Carbon. A requirement's icon is
  the office's choice and becomes Material. This is a line, not a preference:
  it says which family owns a decision.
- **A Material glyph is normalised to Carbon's live area.** Carbon draws every
  icon on 28 of its 32 units -- 87.5%, measured the same on `building`,
  `user--multiple` and `purchase`. Material does not: `apartment` fills 75% of
  its box, `credit_card` 83% by 67%, `groups` 100% by 50%. Dropped in as they
  come, Material's marks sit smaller than Carbon's beside them and unevenly
  among themselves. The build computes each glyph's bounds and rewrites its
  viewBox to Carbon's 87.5%, so the two families draw at one optical size.
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

- **Is the normalisation worth its cost, or should the families stay apart?**
  Fitting each Material glyph to Carbon's 87.5% needs path bounds at build
  time, which Node has no native answer for: either a small dependency or a
  per-icon viewBox recorded by hand. The alternative is a rule that the two
  families never share a strip -- which the trip bar's marks would break, since
  its pending marks are Carbon and its requirement marks would be Material.
- **Does the scheduler's requirements list move wholesale?** Sleeper, 56
  passengers and the wheelchair lift have Carbon drawings today and read well
  at 12px. Moving them to Material for consistency means replacing three icons
  that work; leaving them means one strip holding both families for the same
  kind of thing.
- **Which other pages want this first?** The plan is written for the trip bar
  because that is where the gap bites, but the reason to build it is that other
  apps get a second drawer. Knowing the next caller would say whether the first
  Material entries should be more than the office's list.

## Tasks

- [ ] rux answers the questions above and says go.
- [ ] Teach `build-icons.mjs` a second source: a Material list beside the
      Carbon one, each entry with its reason, quarried from
      `@material-symbols/svg-400/sharp` and written as `m-<name>`.
- [ ] Normalise each Material glyph's live area to 87.5%, by whichever answer
      the first question takes.
- [ ] Split the glyph snapshot in two and teach `check-glyphs` to pick by
      prefix; regenerate both.
- [ ] Add Google's entry to `NOTICE`, beside IBM's.
- [ ] Say in `design/README.md` that the sprite holds two families and what
      each is for.
- [ ] Point the scheduler's requirement marks at the icon name the office's
      list already stores, and drop the letter fallback for names Material has.
- [ ] rux looks at a real week and says whether the two families sit together.
