---
type: reference
---

# Pixels on the home screen

Pixels is added to a phone's home screen and opens from there as an app: its
own icon and name, its own window with no browser bars, the same pages and the
same database. It needs a connection, as the browser does.

## Adding it

The front page has Add to home screen: beside How to play under a guest's
tiles, and under How to play in an account's menu. It shows where the browser
can add Pixels and the page was not opened from the icon.

- **Android and desktop Chrome** open the browser's own install window, once
  the browser says it may.
- **An iPhone** is shown the steps in a modal: in Safari, tap Share, then Add
  to Home Screen, then Add. Share may be in the menu beside the address, and
  Add to Home Screen under View More.

## What each phone is told

- **`manifest.json` is for every browser but an iPhone's.** `app.js` adds its
  link. It names `/pixels/` as the page the icon opens, and its scope is the
  whole site, so the log-in page opens inside the app's window.
- **An iPhone is given no manifest,** because with one its icon opens the
  manifest's start page and drops the address it was added from. It takes
  the icon and the name from tags in each page's head.
- **`Pixels.installed` says the page was opened from the icon.** An iPhone
  tells by `navigator.standalone`, because with no manifest its
  `display-mode` query stays false; the others tell by that query.
- **The bar over the page is the header's colour.** An iPhone takes it from
  the page by itself. Android takes it from `theme-color`, which `app.js`
  keeps as the header's colour, or the page's for a guest, through every
  change of theme.
- **The last row of a page keeps clear of an iPhone's home bar,** by the
  bottom padding of `.pixels-main` in `app.css`.

## Staying the same player

- **An iPhone keeps an installed app's storage apart from Safari's,** so a
  guest's key does not follow them into the app by itself. Android shares the
  storage.
- **A guest's icon carries their key.** While the steps are open the address
  ends in `#me=` and the key, and the icon keeps that address; with the steps
  closed the address is as it was.
- **A browser with no player of its own takes the key from the address,** if
  the database knows it, and the address loses it either way. A key the
  database does not know says so and asks for a new invite link.
- **Whoever opens that address first with no player is that player.** The
  owner can rename or remove a player.
- **An account logs in once more inside the app,** from the Log in link under
  the invite message, and its icon carries nothing. The log-in page has a way
  back to Pixels.

## With no browser around it

The front page and a category's load again when they come back to the front
after a minute or more away, because the app's window has no reload. A puzzle
being played is left alone.
