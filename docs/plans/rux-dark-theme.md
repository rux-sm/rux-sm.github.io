---
type: plan
---

# Plan: Rux dark, a theme of rux's own

## Goal

Design gains a tenth theme, `rux-dark`: rux's own dark theme, modelled on
Geist and on GitHub's design system, Primer. It works in every app on the
site, and Design's contrast measurement reads no text in it under 4.5 to 1.

## Decisions

- **It starts as geist-dark.** Its block in `design/css/rux-theme.css` holds
  geist-dark's values where it has none of its own, and every rule that names
  geist-dark in `design/css/rux-overrides.css`, `scheduler/theme.css` and
  `scheduler/app.css` names it too, so the two draw the same shapes.
- **The raised greys are Geist's, one step up.** Every surface, field and
  secondary button holds the next grey on Geist's ladder, so a panel is
  `#111111`, the lightness of Primer's `bgColor-default`, `#0d1117`. The page
  stays black.
- **The borders are Primer's, without the blue.** A box, a button and a
  field are outlined in `#434343`, the lightness of Primer's
  `borderColor-default`, `#3d444d`, and a rule between rows is `#343434`,
  its `borderColor-muted` over a panel.
- **A button is ringed where it stands clear.** The header's buttons, the
  buttons in a scheduler panel's head and a modal's X take the button's
  border; the modal's X stands 12px clear of its corner to take it. Primer
  leaves a close button bare; rux-dark does not follow it there. The account
  button is a face and takes none.
- **A colour is changed in its own block; a shape is split off when it
  changes.** A rule rux-dark stops sharing loses its name from the shared
  selector and is written for rux-dark alone, so geist-dark never moves.
- **It is named `rux-dark`,** as every theme here is a name and a `-light`
  or `-dark`.
- **It is in the account panel while it is built,** as "Rux dark" after the
  other nine, so rux picks it on any page to see where it stands.
- **Every number comes from its source, none from memory.** Geist's values
  are in `design/docs/geist-token-map.md`; Primer's are read from Primer's
  own published colours and components.

## Questions

- **Which system decides each part?** The accent and the main button, the
  status colours, the corners and control heights, and the header each take
  Geist's answer or Primer's.
- **Which face?** Geist Sans, which the theme wears now, or the device's own
  system face, which downloads nothing.
- **Is there a light companion?** `rux-light` would be its own plan.

## Tasks

- [ ] Read Primer's dark colours and control shapes into
  `design/docs/rux-dark-token-map.md`, each token beside the Geist value it
  holds now and the Primer value it could take.
- [ ] Write the chosen colours into the `rux-dark` block, and replace the
  block's opening comment with what each group is taken from.
- [ ] Split off and rewrite the shape rules that change.
- [ ] Give the scheduler's trip bars, marks and panels their own pass. The
  No bus row is `#242424`, as light as a bar's fill, so only the bar's hue
  parts them.
- [ ] Ring the close buttons still bare. Design's side panel and
  notifications fill a corner and have to stand clear of it first; its
  dialog, guide banner and coachmark already do.
- [ ] Set the grey tags against a selected table row, which is now lighter
  than the tag on it.
- [ ] Measure contrast on the kitchen sink and on each app's front page with
  `design/tools/measure-contrast.js`.
