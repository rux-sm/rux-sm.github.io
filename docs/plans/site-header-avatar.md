---
type: plan
---

# Plan: show each person's avatar in the header

## Goal

The header's Account button shows the logged-in person on every page: their
profile photo when they have one, otherwise Carbon's user avatar with their
initials on a colour. A logged-out page keeps today's glyph. The site shows no
profile photo anywhere today, although two staff profiles have one.

## Decisions

- **Carbon's `user-avatar` is the one avatar,** at `--sm` (24px) in the header
  action and `--lg` on `/account/`, with `__photo` for a photo. A photo that
  fails to load falls back to the initials.
- **The header avatar goes into Design first:** the header action carrying a
  `user-avatar`, and a `__photo` example with an invented image, in
  `design/sink/`, and in `design/templates/app-shell.html` if the action needs
  its own rule. No app adds a local rule on a `rux--*` class.
- **`account.js` draws it,** on every page that loads it, because it already
  knows the session and the profile. It exposes the same helper to
  `/account/`, whose own initials and hash code it replaces.
- **Where the person comes from:** a staff account's `my_staff_profile()`
  gives the name, `photo_path` and `avatar_color`; any other account uses its
  platform profile name. The initials are the first letters of the first two
  words, as both apps draw them now.
- **The photo is the `profile-photos` bucket's public URL for `photo_path`,**
  the one rux-ui builds. The bucket stays public, as the status list says.
- **A person without a photo gets their `avatar_color` as the nearest Carbon
  order:** teal, green and purple as named, cyan as teal as rux-ui paints
  it, pink as magenta. Amber, orange, yellow and no colour take an order
  hashed from the profile id, because Carbon has no amber.
- **`/account/` lets a staff member upload and remove their own photo,**
  writing the bucket and `photo_path` as rux-ui does, because nobody can set
  one outside rux-ui today.
- **No database change.**

## Questions

None open.

## Tasks

- [ ] rux checks the header on Home, Design, Notes and the scheduler, logged in
      with and without a photo, and uploads and removes a photo on
      `/account/`.
