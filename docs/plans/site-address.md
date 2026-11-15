---
type: plan
---

# Plan: the site at ruxui.app

## Goal

Every app in this repository opens at https://ruxui.app/, at the path it has
today: `/scheduler/`, `/pixels/`, `/design/` and the rest. An address under
rux-sm.github.io, saved, texted or printed, lands on the same page at the new
one. Log-in, the map, the driver and customer links, quote requests, Pixels
and Emu all work there, and nothing but old chat links still names the old
address.

ruxui.app is registered at Cloudflare, with Cloudflare's name servers, and
points nowhere yet. GitHub Pages serves this repository with no custom
domain.

## Decisions

- **The bare name is the address, and `www.ruxui.app` forwards to it,**
  because the name is short enough to type whole.
- **The repository keeps its name, `rux-sm.github.io`,** because GitHub
  serves an account's own site only from the repository of that name. A
  document that names the repository stays as it is; one that names the
  address changes.
- **Cloudflare answers for the name and passes nothing through itself,**
  records set to DNS only, because GitHub can issue the certificate only
  when a visitor reaches it directly.
- **GitHub is told the name is rux-sm's before any site uses it,** by a TXT
  record, so no other account can claim it if the site is ever taken down.
- **Everything outside the site is taught the new address first, beside the
  old one,** so the switch itself breaks nothing: the functions' lists of
  pages they answer, the log-in captcha, the map key and the database's
  list of addresses a log-in may return to. The old address comes off each
  only after the switch is checked.
- **The switch is made in a quiet hour.** `.app` opens only over HTTPS, so
  from the moment GitHub is given the name until its certificate arrives,
  usually under an hour, the old address forwards to a page that does not
  open.
- **The site's own code changes after the switch, not before,** because a
  driver's link texted with the new address must find a site already there.
  In the gap the old links are sent, and they forward.
- **Each function keeps its own list of addresses.** Seven functions and
  two files beside them each write the list out; this move changes every
  one and does not merge them, because each is deployed on its own from its
  own folder.
- **Team chat goes on reading links to rux-sm.github.io,** beside ruxui.app,
  because messages already sent carry them.
- **Nothing kept in a browser moves.** A browser's storage belongs to the
  address, and GitHub forwards before any page can run to carry it. So
  everyone logs in once more; the theme comes back with the account; the
  board's view settings, a notes page's place and a half-made Pixels
  puzzle start fresh. A Pixels guest gets back in with their name and PIN.
  A home screen icon is added again from the new address.
- **The company website's preview moves with it,** to
  ruxui.app/escamillatourbuses/, because a project site with no domain of
  its own follows the account's. Its share pictures name the address, so
  its pages change in the same sitting. Its own domain is still
  [company-website.md](company-website.md)'s to switch.

## Questions

- Which day and hour is quiet for the office and the drivers? The switch
  needs about an hour when nobody is on the Scheduler.
- The changes at Cloudflare, GitHub, Supabase and Google are made in
  dashboards. Does rux make them from a list, or does the session make them
  in rux's Chrome, showing each before it is saved?

## Tasks

- [ ] Verify ruxui.app for the rux-sm account in GitHub's Pages settings,
      adding the TXT record it gives at Cloudflare.
- [ ] Add the records at Cloudflare, all DNS only: four `A` and four `AAAA`
      for the bare name to GitHub Pages' addresses, and a `CNAME` for `www`
      to `rux-sm.github.io`. Check with `dig` that they answer.
- [ ] Add ruxui.app, keeping the old address, to the log-in's Turnstile
      widget, to the website's quote widget if it exists, to the Google Maps
      key's allowed pages, and to the database's list of addresses a log-in
      may return to.
- [ ] Add `https://ruxui.app` to every function's list and to the address
      each answers a stranger with: `driver-form`, `maintenance-status` and
      its `samsara.ts`, `quote-request`, `samsara-miles`, `samsara-now`,
      `samsara-share` and its `miles.ts`, and `trip-document-link`. Move
      their checks to the new address and deploy each.
- [ ] Add the address to Emu's `tools/serve-games.mjs` and the helper's
      `main.swift`, restart the home server and rebuild the helper.
- [ ] In the quiet hour, give GitHub Pages the name for this repository,
      wait for the certificate, and turn on Enforce HTTPS. Then check that
      http and https, with and without `www`, land on https://ruxui.app/,
      and that a driver's page, a document, a tracking page and a
      maintenance page under the old address each open at the new one with
      the same link.
- [ ] Set the database's site address to https://ruxui.app, which the
      consent page and any log-in email are built from, and the connector's
      `SCHEDULER_URL` if it is set as a secret.
- [ ] Change the site's code and push: the published address in
      `scheduler/driver-text.js` and `pixels/friends.js`, the connector's
      default, the second host `scheduler/team-chat.js` reads, the helper's
      site in `emu/helper/main.swift`, the account page's helper line, and
      every comment and document that names the address, `AGENTS.md` and
      the READMEs among them.
- [ ] In the `escamillatourbuses` repository, move each page's share
      picture to the new address, and its `README.md`, `AGENTS.md` and
      [company-website.md](company-website.md) with it.
- [ ] Check on the new address, in Chrome: log-in passes the captcha; the
      board draws and the map shows a route; a driver text carries a
      ruxui.app link that opens; the consent page opens and the Scheduler
      connector still answers; a Pixels guest gets in by name and PIN, and a
      browser that already ran Pixels' offline worker is forwarded and not
      held on its old copy; Emu's helper connects. On rux's yes, send one
      quote request from the website's preview and close it.
- [ ] Take `https://rux-sm.github.io` off every function's list, the
      Turnstile widgets, the map key and the database's return list, and
      deploy the functions again.
