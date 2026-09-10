# Rux Apps

The front door to every app built on [rux-ds](https://github.com/rux-sm/rux-ds),
published at the root of the account: https://rux-sm.github.io/. Also the
design system shown working, since the page is rux-ds's app-shell template
with real content — and without its side nav, since 2026-09-03: the switcher
is this site's navigation, and a landing page whose cards fit on one screen
has nothing else to navigate to (rux-ds roadmap §4.13 step 6).

## How it is built

Started with one command from a rux-ds checkout:

```sh
sh rux-ds/tools/new-project.sh ~/Developer/rux-sm.github.io --name Apps --title "Rux Apps"
```

That wrote the two customization files and `index.html` from the template,
linking `/rux-ds/…` on the shared account-root origin — nothing of rux-ds is
copied here. Everything else here is this repository's own:

| File | What |
|---|---|
| `switcher.json` | **The one list of apps.** Name, path, description, and since 2026-09-07 an optional `icon` — either `#i-name`, a Carbon glyph from the sprite the page already inlines, or an absolute path to a MONOCHROME SVG that module serves, masked over the tile's text colour. Both take their colour from the theme; a sprite id the page does not carry falls back to the placeholder swatch (rux-ds `brand/README.md`, "App tile icons"). Adding a module is one entry |
| `switcher.js` | Fetches that list and fills the switcher panel and the landing grid; a module served alone keeps the entries it shipped. **The grid drops the app you are on** — since 2026-09-07, a tile pointing at the page under it is not a destination — while the panel keeps it, marked `aria-current`. A grid tile is an icon, the name and three or four words; with no `icon` key it draws a filled 32px swatch (`layer-accent-01`) so a real one costs no layout later |
| `account.js` | The cloud half of the profile (rux-ds roadmap §4.13 step 5): anonymous sign-in gated on Turnstile, syncs `platform.profiles`, wires GitHub linking. Adds the "Account settings" link into the panel and exposes `window.Rux.account` for `/account/`'s own script |
| `account/` | The full profile page — avatar, display name, theme, GitHub connection status — not a switcher app, reached only via the panel's link or its own URL |
| `tools/check.mjs` | The check: every class resolves against rux-ds (the sibling checkout, or `DS=<dir>`), the list parses |
| `tools/serve.mjs` | `node tools/serve.mjs` — rux-ds's workspace server on :8640, this hub at `/` |
| `.github/workflows/pages.yml` | Checks rux-ds out at its newest tag, checks, then deploys. A failing push is never served |

## Apps

`switcher.json` is the list, and the only one: a table here was a second
copy until 2026-09-05, and it is gone so it cannot disagree. Each module
renders its own shell from the same template and links `/switcher.js`, so
the header and the switcher match everywhere while the side nav and the
page are the app's own. Older projects join when they are rebuilt on
rux-ds.

## Which rux-ds this site is on

The one that is live. Since 2026-09-10 there is no pin to move: a rux-ds
release reaches this site on its next deploy, checked first against every
served app by rux-ds's own Pages workflow (rux-ds roadmap §8.4 diff B).
`rux-ds` cloned beside this repository is required to check or serve it
locally.
