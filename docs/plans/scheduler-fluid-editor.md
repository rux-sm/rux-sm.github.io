---
type: plan
---

# Plan: the trip editor, fluid throughout

## Goal

Every tab of the trip editor is fluid, so the panel has one content surface and
Carbon's tab rule works as written. Details is fluid already; Billing, Fleet,
Route and Files are not, and a tab strip cannot be right for both at once.

## Decisions

- **The seam is what forces this.** A selected contained tab is painted with
  the surface of the content it opens, an unselected one with `layer-accent`.
  In the dark themes `layer-accent` and `field-02` are the same value, so the
  fluid block landed on the colour the unselected tabs already wear, and the
  selected tab kept the darker `layer`. One tab strip cannot serve four regular
  tabs and one fluid one.
- **The fields stay light.** A field sits one step above its surface, which in
  a side panel is `field-02` over `layer`. Darkening the fields to match the
  panel collapses that step and the form loses its edge.
- **The surface carries across a whole tab,** edge to edge, and the tab's own
  16px padding puts headings back under the field labels. Every label on a tab
  lines up at 16px.
- **A control with no fluid form sits on the fluid surface** rather than
  outside it, under a group label, 16px below the rule above it and 24px above
  what follows, as IBM's fluid form spaces a group. Checkbox, radio and toggle
  are the three with no fluid form; the Needs checkboxes already work this way.
- **A list-box takes fluid on its wrapper,** `rux--list-box__wrapper--fluid`,
  not on itself. Dropdown, combo box and multi-select all do.
- **Fluid is one height, 64px.** A tab that goes fluid loses the `size-sm`
  field heights, and gets taller per field and shorter overall.
- **`fluidTab` sweeps a built tab** and marks the stacks holding fluid fields;
  each further tab is one call plus whatever its own shapes need.
- **A fluid control paints its surface on its own root,** which Carbon's
  side-panel rule does not reach, so each new fluid root joins the rule in
  `overrides.css` that lifts them to `field-02`.

## Questions

- **What colour is the selected tab once every tab is fluid?** Taking
  `field-02` matches its content and satisfies the rule, but that is the colour
  the unselected tabs wear, so selection would rest on the blue bar and the
  bolder text alone. Moving the unselected tabs darker instead inverts Carbon's
  own light-to-dark order. Which?
- **Billing's three contained lists and its status tile** — do they sit on the
  fluid surface as they are, or keep their own surfaces inside it? They are not
  form controls and have no fluid form, and the lists already run full bleed.
- **Does the surface run down to the action bar,** as IBM's spec draws it, or
  stop at the last field as Details does today?
- **Fleet drew nothing under invented data,** so its controls are unsurveyed.
  What is on it?

## Tasks

- [ ] Answer the four questions above.
- [ ] Decide and apply the tab strip's colours, the reason this work exists.
- [ ] Make Route fluid: four text fields, no sections, the smallest tab.
- [ ] Make Files fluid: one contained list and the Itinerary not needed switch.
- [ ] Make Billing fluid: two text fields, three switches, three contained
      lists, one status tile, four sections.
- [ ] Survey Fleet against a real trip, then make it fluid.
- [ ] Fix the Billing tab's 16px sideways scroll, which predates this work and
      shows at every panel width.
- [ ] rux reads every tab on real trips, in Chrome, Safari and on the phone.
