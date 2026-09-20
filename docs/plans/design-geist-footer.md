---
type: plan
---

# Plan: Geist's footer is a row of buttons, not a band

## Goal

In `geist-dark`, the buttons that close a side panel or a modal sit inside the
surface as ordinary buttons — sized to their text, gathered at one end, with
the theme's own rounded corners — instead of filling the whole width edge to
edge at 64px tall. Every other theme keeps Carbon's band.

## Decisions

- **Both footers change together.** A side panel ends in
  `.rux--action-set` and a modal in `.rux--modal-footer`; they are separate
  classes drawing the same idea, and a theme with two footer shapes reads as a
  mistake.

- **The buttons need no new radius.** `.rux--btn` already takes 6px in this
  theme; the rules that square footer buttons and hand them the surface's
  corner are what hide it, and those go.

- **Those square-corner rules are correct for what they describe** — a button
  that fills a bar edge to edge *is* that edge — so they stay for every theme
  that still has a band, and only `geist-dark` leaves the set.

- **Carbon's asymmetric padding goes with the height.** A 64px footer button
  pushes its label to the top with `padding-block: 0.875rem 2rem`; at a normal
  height the label centres and that padding is wrong.

- **Geist's own numbers, measured on its Modal and Sheet pages:** a sheet's
  footer is 84px tall with 24px of padding and buttons 36px tall; a modal's is
  56px with 12px of padding and buttons 32px tall. Both right-align, both 6px
  corners, both transparent over the surface.

## Questions

- **How tall are the buttons?** Geist measures 36px in a sheet and 32px in a
  modal. Our own fields, toolbar buttons and menu rows are all 40px. Matching
  Geist is more faithful; matching 40px means one button height across the
  whole app. Which?

- **Where do three buttons go?** The trip editor has Cancel trip, Reset and
  Save. Geist only ever shows two, split apart: the safe one left, the
  committing one right. Either Cancel trip sits alone on the left with Reset
  and Save together on the right, or all three gather at the right end.

- **Does `ant-dark` follow?** Ant Design also right-aligns an inset pair in its
  modal footer, so the same rules would suit it, but it is not what this asks
  for. Leave it with the band, or change both?

- **Does the footer keep its own fill?** Ours paints `layer-01` across the
  band. Geist's is transparent, with the surface showing through and no line
  above it.

## Tasks

- [ ] Split the square-corner and surface-corner rules in Design's overrides so
      `geist-dark` no longer takes them, leaving `ant-dark` as it is.

- [ ] Write the footer for `geist-dark`: inset padding, a gap, buttons at their own
      width and the chosen height, ending Carbon's flex-basis widths for both the
      action set and the modal footer.

- [ ] Retire or re-scope the scheduler's own footer rule, which gives the action
      buttons symmetric padding so an even flex basis divides the bar; content-width
      buttons make the reason for it untrue.

- [ ] Check every footer the site has: one, two and three buttons in Design's
      action-set page, the side panel page, the trip editor's Cancel/Reset/Save,
      and each of the scheduler's modals.

- [ ] Check the danger ghost button still reads as the dangerous one once it is no
      longer a full-width block.

- [ ] Check a phone width, where the full-width band gave large touch targets that
      content-width buttons do not.

- [ ] Check the other six themes draw the band exactly as they do now, by measuring
      a footer in each before and after.
