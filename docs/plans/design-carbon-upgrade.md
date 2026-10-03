---
type: plan
---

# Plan: Bring Design up to Carbon's current styles

## Goal

Design compiles Carbon's styles at 1.114.0 while Carbon's newest release is
1.116.0, and Carbon's live examples, which Design is compared against, already
run it. Design moves to the newest release, its references are taken again
from the newest examples, and every app looks as it should afterwards.

## Decisions

- **The target is Carbon's newest release at the time of building:**
  `@carbon/styles` 1.116.0, with `@carbon/elements`, `@carbon/colors`,
  `@carbon/icons` and `sass` moved to their newest too, and the references
  harvested from the live examples at `@carbon/react` 1.117.0.
- **Carbon's new look is taken as it comes.** Where the newest Carbon draws a
  component differently, Design follows it. A trial build measured the size of
  that: about 1,000 changed lines in 33,000, six classes added, three removed,
  no token added or removed. The components it touches most are text input,
  AI label, number input, radio button, tile, card, link, fluid forms, the
  overflow menu's list, the table's sort and search, and list box.
- **Design's own choices stay.** The rules in `design/css/rux-overrides.css`
  and each app's `overrides.css` that answer a Carbon rule are kept where the
  reason still holds, corrected where Carbon's rule moved, and deleted where
  Carbon now does the same thing itself.
- **Four source folders are renamed, not four components changed.** Carbon
  1.116 calls `EditInPlace`, `FullPageError`, `InterstitialScreen` and
  `OptionsTile` `edit-in-place`, `full-page-error`, `interstitial-screen` and
  `options-tile`; `design/src/app.scss` names them the new way.
- **The build's two changes to Carbon's output stay:** the grid token rename
  and `:focus` to `:focus-visible`, in `design/tools/lib/transform.mjs`.
- **Three classes leave Carbon:** `text-input--password__visibility`,
  `tooltip--visible` and `tooltip--hidden`. Any page using one is corrected to
  what the newest Carbon renders.
- **The result is proved, not assumed.** Before the change, the computed
  sizes, spacing and colours of the scheduler's main surfaces and the results
  of Design's in-page checks are recorded; after it, they are read again and
  every difference is either Carbon's new look or a fault that is fixed.

## Questions

- **Carbon 1.116 adds four components Design has never had:** Tag overflow,
  Tearsheet, Guide banner and Notifications panel. Design's inventory has to
  say yes or no to each. Leave all four out for now, or take any of them in?
- **Some of Design's components come from IBM's second example site,** IBM
  Products, whose references are older still. Refresh those in this same piece
  of work, or leave them for a plan of their own?

## Tasks

- [ ] Record the before state: the scheduler's board, trip editor, Contact
  list and Updates window measured in Chrome, and the kitchen sink's in-page
  check results, saved outside the repository.
- [ ] Move the five packages in `design/package.json` to their newest, rename
  the four folders in `design/src/app.scss`, and build until the build's own
  verification passes.
- [ ] Take the token snapshot again and read `check-token-values`' report of
  every value that moved.
- [ ] Harvest `carbon-react-dom.json` and `carbon-react-states.json` again
  from the live examples, then correct each kitchen-sink fragment the tag,
  ancestry, slot and co-class checks report as no longer Carbon's markup.
- [ ] Rebuild the icon sprite and its glyph snapshot from the newest
  `@carbon/icons`.
- [ ] Record each new component's decision in Design's inventory.
- [ ] Go through `design/css/rux-overrides.css` and every app's
  `overrides.css` against the rules that changed, keeping, correcting or
  deleting each.
- [ ] Walk the whole kitchen sink in Chrome in a dark and a light theme, run
  the in-page checks again, measure the scheduler's surfaces again, and fix
  what is a fault.
- [ ] Run the spacing check and read what remains; the card header's two rows
  should be gone.
- [ ] Run `npm run check -- --full`, and correct every version Design's
  documents state.
