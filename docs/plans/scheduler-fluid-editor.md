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
- **`field-N` and `layer-N` are the same value.** In g90 both level 01 are
  #393939 and both level 02 are #525252; a field is not inherently a step above
  its surface. The step inside the editor comes from Carbon's own side-panel
  rule, which lifts a field to `field-02` while the panel stays at level 01.
- **The tab strip goes to `rux--layer-two`.** Then the selected tab, which is
  painted `--rux-layer`, lands on #525252, the same as the fluid surface, and
  the unselected tabs, painted `--rux-layer-accent`, go to #6f6f6f and stay a
  step lighter. Carbon's light-to-dark order is kept, no colour is invented,
  and the whole answer is one of Carbon's own layer classes. Measured in the
  running editor.
- **Billing's contained lists and its status tile sit on the fluid surface,**
  like every other thing on a fluid tab.
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

- **Does the surface run down to the action bar,** as IBM's spec draws it, or
  stop at the last field as Details does today?
- **Fleet drew nothing under invented data,** so its controls are unsurveyed.
  What is on it?

## Tasks

- [ ] Raise the tab strip to `rux--layer-two`, the reason this work exists,
      and check it in all eight themes.
- [ ] Make Route fluid: four text fields, no sections, the smallest tab.
- [ ] Make Files fluid: one contained list and the Itinerary not needed switch.
- [ ] Make Billing fluid: two text fields, three switches, three contained
      lists, one status tile, four sections.
- [ ] Survey Fleet against a real trip, then make it fluid.
- [ ] Fix the Billing tab's 16px sideways scroll, which predates this work and
      shows at every panel width.
- [ ] rux reads every tab on real trips, in Chrome, Safari and on the phone.
