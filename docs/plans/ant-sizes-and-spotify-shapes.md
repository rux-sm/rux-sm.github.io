---
type: plan
---

# Plan: Ant's sizes in ant-dark, and whether spotify-dark takes Spotify's shapes

## Goal

The ant-dark theme sizes its controls and lays out a footer the way Ant Design
does, in every app. The spotify-dark theme either stays a palette over Carbon's
shapes or takes Spotify's own, as rux decides.

## Decisions

- **Ant's control is 32px,** with 40px large and 24px small, measured on Ant's
  Button, Input and DatePicker pages. ant-dark's are Carbon's 40px. The theme
  sets Carbon's md size to 32px, the way geist-dark sets it to 36px in
  `design/css/rux-overrides.css`, so every button, field and dropdown sized md
  follows.
- **A phone keeps finger-sized controls.** The scheduler raises its bars to
  the 48px token below 42rem, and that stays in every theme.
- **A footer holds ordinary buttons at its end,** as Ant's Drawer does and as
  geist-dark's footers already do, in place of Carbon's edge-to-edge band.
- **Ant's tab is 46px,** 12px above and below its label. It moves with the
  control height, because the trip editor's sticky tab strip is sized from
  the same token.
- **Every number is read from the system's own live page** and named in the
  rule's comment, as the geist-dark rules are.

## Questions

- In ant-dark, do the board's toolbar buttons become 32px buttons standing
  apart, as geist-dark's 36px ones do, or stay flush cells with dividing rules?
- Does spotify-dark stay colours only? Spotify's web player draws its buttons
  and search field as full pills, its panels with 8px corners and its button
  labels bold; spotify-dark draws all of them square and regular.
- If spotify-dark takes Spotify's shapes, does its warning box stop being
  Carbon's white slab? Carbon's own dark themes draw the same slab.

## Tasks

- [ ] Set the md size for ant-dark and check every control that reads it, in
      each app, against Ant's measured height.
- [ ] Resize the scheduler's toolbar, heads and editor tab strip for ant-dark
      once the toolbar question is answered.
- [ ] Lay out ant-dark's side-panel and modal footers as ordinary buttons.
- [ ] Measure Ant's Dropdown and Menu pages and compare ant-dark's menu.
- [ ] If spotify-dark takes shapes: measure open.spotify.com's button, field,
      card, menu and dialog, and write its block in `rux-overrides.css`.
- [ ] Snapshot the computed size of one control of each kind in all seven
      themes before and after, and show that only the named theme moved.
- [ ] Check every app in the changed theme in Chrome on :8641, at desktop and
      phone width.
