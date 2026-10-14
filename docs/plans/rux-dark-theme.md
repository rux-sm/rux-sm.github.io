---
type: plan
---

# Plan: Rux dark, the official Rux look

## Goal

Design has one theme that looks like Rux and like no other system: `rux-dark`.
Carbon stays the structure under it, as under every theme here, but its colours,
corners and face are chosen for Rux, starting from the mark: a one-colour
dachshund drawn in whole squares on a 16 grid, in Carbon's gray 10 and gray 100.
It works in every app on the site, and Design's contrast measurement reads no
text in it under 4.5 to 1 and no control's resting shape under 3 to 1.

## Decisions

- **Geist and Primer are where it started, not where its values come from.**
  The block holds geist-dark's values where it has none of its own, with its
  raised greys one step up Geist's ladder and its borders at Primer's strength;
  each is kept only until a Rux value replaces it, and nothing new is taken from
  either system.
- **The page stays black, and the raised greys keep their order,** with
  `#111111` as the first surface, because the rings and spacing already built
  are measured against that ladder.
- **A button is ringed where it stands clear.** The header's buttons, the
  buttons in a scheduler panel's head and every close button Design has take
  the button's border; each X stands clear of its corner to take it, and on a
  coloured or inverse surface the ring is that surface's ink at 30%. On a phone
  the scheduler's panel heads keep Carbon's bare squares.
- **The account button is the face.** The picture is 32px in every theme, so it
  fills this theme's 32px header button and takes no ring.
- **A colour is changed in its own block; a shape is split off when it
  changes.** A rule rux-dark stops sharing loses its name from the shared
  selector and is written for rux-dark alone, so geist-dark never moves. Once
  the corners and the face are chosen, the shared selectors split in one pass
  rather than rule by rule.
- **It is named `rux-dark`, and it is in the account panel** as "Rux dark"
  while it is built, so rux picks it on any page to see where it stands.
- **Every number is measured, none remembered.** A Carbon colour is read from
  `@carbon/colors` in `design/node_modules`, and a value chosen for Rux is
  measured on every layer it sits on before it is written.

## Questions

- **Which accent hue?** Rux has none: every blue in the theme is Geist's
  (`#52a8ff`, `#0070f3`, `#47a8ff`) or Carbon's (`#4589ff`, `#0f62fe`). One hue
  would carry the links, info, the on toggle, the inverse focus, the highlight,
  the blue and cyan tags, the blue status, the notification actions and the AI
  tokens. The retired purple is out. Recommended: rux names a hue, and a session
  measures its steps on every layer before one is written.
- **Does the primary stay one colour, and in which ink?** The main button and
  the brand surface are light ink on black, which matches the mark. The words
  are Geist's `#ededed` and the mark is Carbon's `#f4f4f4`. Recommended: keep it
  one colour, in the mark's `#f4f4f4`, so the logo and the words are one ink.
- **Which greys?** Geist's neutral ladder, as now, or Carbon's cool gray or
  warm gray family, which keeps the theme on Carbon and sets it apart from both
  g100 and geist-dark at a glance. Recommended: a tinted Carbon family, written
  once as a named ramp that every layer, field, border and button state steps
  along.
- **Which corners?** Geist's 6, 8 and 12px with round tags, as now; Carbon's
  square; or a step of the mark's squares, 2px for a control and 4px for a
  surface and a tag. Recommended: the 2px and 4px step.
- **Which face?** Geist Sans, as now; IBM Plex Sans, which Design already
  serves and Carbon is drawn for; or the device's own face, which downloads
  nothing. Recommended: Plex Sans.
- **Which colours mean error, warning and success?** The `support-*` colours
  are Geist's and the `status-*` colours and tag borders are Carbon's, so
  success is three greens on one screen. Recommended: one palette for support,
  status, tags and avatars, drawn from the same family as the accent.
- **Does a field's outline reach 3 to 1?** Its `#434343` ring is 1.9 to 1 on
  the field and 2.1 against the page, as Primer draws it, where Carbon's
  underline meets the 3 to 1 a control's edge needs. Recommended: a field rings
  in `border-strong-01`, and a box keeps the quieter line.
- **Is there a light companion?** `rux-light`, read from the other end of the
  same ramp, would be its own plan.

## Tasks

- [ ] Write `design/docs/rux-dark-token-map.md`: the ramp, the accent's steps
  and the meaning palette, each token beside the value it holds now and the
  source of the one it takes.
- [ ] Write the chosen colours into the `rux-dark` block, and replace the
  block's opening comment with what each group is taken from.
- [ ] Route every accent token through the one hue, the `ai-*` tokens with
  them, so none falls through to white's values.
- [ ] Split rux-dark out of the selectors it shares with geist-dark in
  `design/css/rux-overrides.css`, `scheduler/theme.css` and `scheduler/app.css`,
  and out of `GEIST_FACED` and `FLAT` in `design/js/theme.js`, then write its
  corners and its face.
- [ ] Draw the words, the brand fill and the mark in the one chosen ink.
- [ ] Give the scheduler's trip bars, marks and panels their own pass. The No
  bus row is `#242424`, as light as a bar's fill, so only the bar's hue parts
  them.
- [ ] Set the grey tags against a selected table row, which is now lighter
  than the tag on it.
- [ ] Measure contrast on the kitchen sink and on each app's front page with
  `design/tools/measure-contrast.js`.
