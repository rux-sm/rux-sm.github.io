---
type: plan
---

# Plan: Pixels on the home screen

## Goal

A player adds Pixels to their phone's home screen and from then on opens it
like an app: its own icon and name, its own window with no browser bars, and
themselves still the same player. It stays the one site at the one address,
with nothing in a store.

## Decisions

**What it is**

- **One app with two ways in.** The icon opens the pages a browser opens,
  from the same files and the same database, so a push to `main` updates
  both and a player's times are the same in each.
- **It needs a connection, as the browser does.** There is no service
  worker, no offline play and no notification, because a phone installs
  Pixels without them and each is a plan of its own.
- **Pixels alone is installed.** No other app gets a manifest or these tags.

**What the phone is told**

- **`pixels/manifest.json` is for Android and a desktop browser.** It gives
  the name Pixels, a window of its own, `/pixels/` as the page the icon
  opens, the icons, and the default theme's background.
- **Its scope is the whole site,** so the log-in page opens inside the app's
  window instead of under a browser bar.
- **An iPhone is given no manifest.** It takes the name and the icon from
  tags in each page's head, and its icon opens the address it was added
  from, which a guest's key travels in.
- **The icons are the star, written by a tool.** `tools/build-app-icons.mjs`
  reads the squares and the two colours of `pixels/brand/favicon.svg` and
  writes the PNGs into `pixels/brand/`: 180px for an iPhone, 192px and 512px
  for Android, and a 512px with a wider margin that Android may crop to a
  circle. `npm run build` runs it and `npm run check` fails a stale one.
- **The page starts under the phone's status bar, never behind it,** and the
  bar takes the header's colour and follows a change of theme.
- **Nothing sits under an iPhone's home indicator.** The keys under the
  board and the last row of every page keep clear of it.

**Adding it**

- **Home has an Add to home screen button:** beside How to play under a
  guest's tiles, and under How to play in an account's menu. A page opened
  from the icon does not show it, and neither does a browser that cannot
  install.
- **On Android and in desktop Chrome it opens the browser's own install
  window,** and shows only once the browser says it may.
- **On an iPhone it opens three steps in a modal,** as How to play does: in
  Safari, tap Share, then Add to Home Screen, then Add.

**Staying the same player**

- **An iPhone keeps an installed app's storage apart from Safari's,** so a
  guest's key does not follow them into the app by itself. Android shares
  the storage and needs nothing.
- **A guest's icon carries their key.** While the three steps are open the
  page's address ends in `#me=` and the key, and the icon made then opens
  that address; with the steps closed the address is as it was.
- **That address is the player to whoever opens it first with none of their
  own,** which is accepted, because an icon that holds the key lets a guest
  back in after an iPhone empties the app's storage, and the owner can
  rename or remove a player.
- **A browser with no player takes the key from the address.** It asks
  `pixels_me` with it, keeps it if the database knows it, and takes it out
  of the address either way. A browser that already has a player keeps its
  own.
- **A key the database does not know says so,** and asks for a new invite
  link.
- **An account logs in once more inside the app,** and its icon carries
  nothing.
- **No database change.**

**With no browser around it**

- **Every page has its own way back,** because an iPhone's app window has no
  Back button: the six Pixels pages, and the log-in page reached from them.
- **Home and a category's page ask again when the app comes back to the
  front** after a minute or more away, because the window has no reload and
  an iPhone keeps it open for days. A puzzle being played is left alone.

**Testing**

- **The iPhone's side is tested in the iPhone simulator on rux's other
  Mac,** against the cloud preview run there, because this Mac has no Xcode
  and a guest exists only with the database. Android's side is tested in
  Chrome on :8641 here.
- **What the iPhone decisions rest on is tried first,** before any page
  changes: an icon added from a page with no manifest opens the address it
  was added from, and the app it opens starts with empty storage.

## Questions

## Tasks

- [ ] In the simulator, with a throwaway page kept outside the repository
      that shows its own address and what its storage holds: store a value
      in Safari, then add the page to the home screen from an address ending
      in `#me=` and a made-up value, once with no manifest and once with one
      that names a start page. Which address each icon opens, and whether
      the app sees what Safari stored. A decision that proves wrong is
      corrected here before the next task.
- [ ] In the head of the six pages, the iPhone's tags and a link to
      `pixels/manifest.json` that an iPhone is not given.
- [ ] `pixels/data.js`: the key from the address, for a browser with no
      player, and the message for a key the database does not know.
- [ ] The Add to home screen button on home, the browser's install window
      behind it, and the three steps with the key in the address while they
      are open.
- [ ] The status bar's colour following the theme, and the room kept above
      the home indicator, in `pixels/app.css` or, for a `rux--*` element, in
      Design.
- [ ] A way back on every page, and home and a category asking again when
      the app comes back to the front.
- [ ] `pixels/README.md`, kept under its 150 lines, says how Pixels is added
      and how a guest stays the same player.
- [ ] Install it in Chrome on :8641 and in the simulator, as an account and
      as a guest: the icon, the window, the same player after adding, and a
      log-in inside the app.
