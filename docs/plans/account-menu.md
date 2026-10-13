---
type: plan
---

# Plan: One account menu in the shell

## Goal

Every app's header has one button at its far end, the person's picture, and
it opens one menu: who is signed in, Profile, Theme, Log out, and at the
very bottom the other apps that account can open. The app switcher's own
button and panel go. An account with one app is shown no list of apps, so
nobody carries a button for something they do not have.

## Decisions

- **One action and one panel in the header, in place of two.** The Account
  action stays, drawn as the person's picture as it is now, and the App
  switcher action and its panel go.
- **The panel is Carbon's header panel, as the account panel is,** and what
  is in it is the product's own, its rows written as Carbon's switcher list.
- **Its rows are in one order for every account:** who is signed in;
  Profile, which opens the Account page; Theme; Log out; then Apps.
- **Apps are at the very bottom,** so the rows every account has keep one
  place and only the end of the menu changes length.
- **Apps lists what the account can open, Home first,** as `/switcher.js`
  works it out from `/funnel.js` now, and marks the app the page is. Where
  that leaves only the app the page is, the list and its rule are left out.
- **With no login, as in a local preview or a Design template, the menu is
  Theme and every app,** with no person, no Profile and no Log out.
- **The block is written into every page by a tool, between markers, as the
  sprite is,** so no page's copy can differ from another's. The 46 pages
  that carry the two panels each hold a copy of their own today.
- **Home's grid of apps is as it is.**

## Questions

- **Is Theme a row that opens the list, or is every theme listed in the
  menu?** There are ten themes, and listed they make the menu longer than
  everything else in it. Recommended a row that says the theme in use and
  opens the list in place.
- **Where does the display name go?** The panel has a field for it today.
  Recommended the Account page, which Profile opens, so the menu is rows
  alone.
- **Is an app in the list its name, or its icon and its name?** Each app has
  a drawn icon, which Home's grid uses. Recommended the icon and the name.
- **Do the games take this header on a wide screen?**
  `docs/plans/game-pages.md` says a game has no header and one bar of
  places. Recommended yes on a wide screen, where the header holds the
  game's places and this menu, and no on a phone, where the bar of places
  stays and Me holds the menu's rows.

## Tasks

- [ ] Compose the menu in Design: one action and one panel in
      `design/sink/ui-shell.html` and the shell that
      `design/tools/lib/shell.mjs` writes, with `design/js/profile.js` and
      `design/js/ui-shell.js` to match, through Design's gates.
- [ ] Fill the one panel from `/switcher.js` and `/account.js`: the person,
      Profile, Log out and the apps.
- [ ] Write the tool that puts the block into every page carrying its
      markers, and mark Design's templates and root pages.
- [ ] Move each app onto it, a page looked at with a login at 402 and 1280
      wide: Home and Account, LN Guide through its generator, the Scheduler,
      Coins and Sevens.
- [ ] Correct `design/docs/composing-pages.md`, `design/docs/choices.md` and
      the `design-page` skill where they say the header has global actions
      and a switcher panel.
