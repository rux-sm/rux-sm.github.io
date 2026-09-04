# Rux Apps

The front door to every app built on [rux-ds](https://github.com/rux-sm/rux-ds),
published at the root of the account: https://rux-sm.github.io/. Also the
design system shown working, since the page is rux-ds's app-shell template
with real content — and without its side nav, since 2026-09-03: the switcher
is this site's navigation, and a landing page with two cards on one screen
has nothing else to navigate to (rux-ds roadmap §4.13 step 6).

## How it is built

Started with one command from a rux-ds checkout at a tag:

```sh
sh rux-ds/tools/new-project.sh ~/Developer/rux-sm.github.io --name Apps --title "Rux Apps"
```

That wrote `vendor/rux-ds/` with a `PIN`, the two customization files, and
`index.html` from the template. Everything else here is this repository's own:

| File | What |
|---|---|
| `switcher.json` | **The one list of apps.** Name, path, description. Adding a module is one entry |
| `switcher.js` | Fetches that list and fills the switcher panel and the landing grid; a module served alone keeps the entries it shipped |
| `account.js` | The cloud half of the profile (rux-ds roadmap §4.13 step 5): anonymous sign-in gated on Turnstile, syncs `platform.profiles`, wires GitHub linking. Adds the "Account settings" link into the panel and exposes `window.Rux.account` for `/account/`'s own script |
| `account/` | The full profile page — avatar, display name, theme, GitHub connection status — not a switcher app, reached only via the panel's link or its own URL |
| `tools/check.mjs` | The check: every class resolves in the vendored stylesheet, the list parses, the pin names a tag |
| `tools/serve.mjs` | `node tools/serve.mjs`, port 8643 |
| `.github/workflows/pages.yml` | Check, then deploy. A failing push is never served |

## Apps

| App | Path | Repository |
|---|---|---|
| Home | `/` | this one |
| Notes | `/rux-ln-notes/` | rux-ln-notes |

Each module renders its own shell from the same template and links
`/switcher.js`, so the header and the switcher match everywhere while the
side nav and the page are the app's own. Older projects join when they are
rebuilt on rux-ds.

## Moving the design-system pin

The recipe is rux-ds's — `docs/starting-a-project.md`, "Moving the pin" —
kept in one place so this copy cannot drift from it. The one fact that is this
repository's own: `tools/check.mjs` refuses a `PIN` that names no tag, so a pin
taken between tags never deploys.
