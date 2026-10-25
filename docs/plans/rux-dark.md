---
type: plan
---

# Plan: Rux Dark, the look of every Rux app

## Goal

Rux Dark is the one look every Rux app wears unless someone picks another.
It is black and white like the logo, square like the logo, and built on
Carbon, so a page reads as Rux at a glance and not as Geist or IBM. Colour
means a status and nothing else. Each part of the look has one rule, written
once in Design, so a page never looks half finished.

## Decisions

What stands now:

- **One ink on black.** Words, icons, the main button and links are the
  logo's `#f4f4f4` on a `#000000` page, with neutral greys between.
- **Colour is a status.** The palette is vivid, and it marks success,
  warning, error, info and a tag's kind. Links, the on toggle and focus are
  the ink; a link is underlined, except in a heading. Strong colour is for
  small marks; a big surface takes a soft tint, as an alert does, or a deep
  fill, as a trip not yet confirmed does, and a normal trip is grey. The
  placeholder's gold is the one bright bar, because amber held deep turns
  brown.
- **Every corner is square.** Buttons, fields, tags, menus, alerts, cards,
  panels, tables and the scheduler's trip bars all have square corners. Only
  things round by shape stay round: profile pictures, radio buttons, toggles,
  a slider's thumb, and status dots and counts. A side menu's chosen row is a
  square block of the ink with black words.
- **Figures are Plex Mono, words are Plex Sans.** A number, a code and text
  LN or an app prints on screen are shown exactly, in mono; a field's label
  and a tag's word are in the sans, in sentence case.

What it is made of:

- **Tokens and rules in Design only.** Colours live in
  `design/css/rux-theme.css`, shapes in `design/css/rux-overrides.css`, and
  `design/docs/rux-dark-token-map.md` lists every token. An app adds nothing
  of its own to change the look.

## Questions

- **Who gets it by default?** Today a page with no saved theme opens in
  Carbon White. Rux Dark for everyone, including the scheduler's office and
  LN Guide's readers, or only for you?
- **Does Rux Dark stand on its own, or keep borrowing from Geist Dark?**
  About two thirds of its component rules are shared with Geist Dark, so a
  change made for Geist also changes Rux Dark. Standing alone means copying
  those rules once and owning them.
- **Is there a light Rux?** Printed forms stay light paper. Does anything
  else need a light version, or is Rux Dark the only Rux look?
- **How do we know it is done?** A page in Design that shows the whole look
  on one screen, checked in both a desktop and a phone picture, or something
  else?

## Tasks

- [ ] Settle the questions above, one at a time, each with a picture to choose
  from.
- [ ] Write the look down in one place in Design, so every later change is
  checked against it.
- [ ] Decide the two small ideas: the logo's square as a list marker, and
  semibold titles.
- [ ] Make Rux Dark the default, if the first question says so.
