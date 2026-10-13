---
type: plan
---

# Plan: One account menu in the shell

## Goal

Every app's header has one button at its far end, the person's picture, and
it opens one menu: who is signed in, Profile, Theme, Log out, and at the
very bottom the other apps that account can open. The app switcher's own
button and panel go. An account with one app is shown no list of apps, so
nobody carries a button for something they do not have. A game has the
same button, and a player with no account sees their own picture on it and
the game's rows alone.

## Decisions

- **One action and one panel in the header, in place of two.** The Account
  action stays, drawn as the person's picture as it is now, and the App
  switcher action and its panel go.
- **The panel is Carbon's header panel, as the account panel is,** and what
  is in it is the product's own, its rows written as Carbon's switcher list.
- **Its rows are in one order for every account:** who is signed in; the
  app's own rows, where it has any; Profile, which opens the Account page;
  Theme; Log out; then Apps.
- **Theme is one row that says the theme in use and opens the list in
  place,** because ten themes listed are longer than the rest of the menu.
- **The display name is set on the Account page,** which Profile opens, so
  the menu is rows alone.
- **An app in the list is its icon and its name,** the icon Home's grid
  draws.
- **Apps are at the very bottom,** so the rows every account has keep one
  place and only the end of the menu changes length.
- **Apps lists what the account can open, Home first,** as `/switcher.js`
  works it out from `/funnel.js` now, and marks the app the page is. Where
  that leaves only the app the page is, the list and its rule are left out.
- **With no login, as in a local preview or a Design template, the menu is
  Theme and every app,** with no person, no Profile and no Log out.
- **The block is written into every page by a tool, between markers, as the
  sprite is,** so no page's copy can differ from another's.
  `design/tools/lib/shell.mjs` is where it is written and
  `design/tools/inline-account.mjs` splices it, into Design's templates
  by Design's generate and into every app's pages by the root build, and
  the root check fails a page whose panel is not that one. LN Guide's
  generator takes it from the same file.
- **Home's grid of apps is as it is.**

In a game:

- **A game takes this header on a wide screen,** from 66rem, where Carbon
  shows a header's links, holding the game's places and the menu, so an
  account can leave for another app from any game as it can from any app. On a phone a game keeps its bar of places and no
  header, and shows no picture button: Me is one tap away in the bar and
  holds the menu's rows.
- **On a wide screen Me is not a place:** it is the first of the game's own
  rows in the menu, as the picture button is the player.
- **A game adds its own rows to the menu** through `Rux.profile.rows`: Me,
  How to play, and for Pixels' owner Manage and Players. Add to home screen
  stays on Me, where a phone finds it.
- **A player with no account has the same button, with the picture they
  drew,** and their menu is who is playing, the game's rows and Theme. They
  have no Profile, no Log out and no apps, since they have no account to
  open another app with.
- **An account's button is its own picture in a game too,** so the button
  is the same in every app.
- **A puzzle being played or drawn has no header,** as it has no bar.

## Questions

None open.

## Tasks

- [ ] Take the older panel's code out, now that no page carries it: the
      radios in `design/js/profile.js`, the name field and the button in
      `/account.js`, and the switcher half of the account case in
      `design/tools/check-behaviour.js`. `/account.js` then writes who is
      logged in through `Rux.profile.who`, as a game does for a guest.
