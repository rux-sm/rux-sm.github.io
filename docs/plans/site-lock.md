---
type: plan
---

# Plan: lock the site behind a login

## Goal

Every page of rux-sm.github.io opens only for a logged-in account, and the
apps ticked for the account decide which pages it can open and where everything
else sends it. The scheduler's public link pages, for drivers, maintenance, documents and
customer requests, are rebuilt with Design here and open without a login.

## Decisions

- **Each account has an owner switch and a list of apps.** The owner opens
  every page and manages access. Any other account opens Home and the apps
  ticked for it, and a page of an app it lacks sends it Home, or to its one app
  when it has only one.
- **Every account has the app switcher.** It lists Home and the apps the account
  can open, and Home's tiles show the same apps, so a Scheduler-only account
  sees Home and Scheduler in the switcher and one tile on Home.
  An account with no owner switch and no apps is not let in.
- **Access sits in the account's `app_metadata`** as `owner` and `apps`,
  Supabase's standard place for it, which the account's own login cannot
  change. The database reads it from the account record, so a change applies
  at once; the pages read its copy in the login token.
- **Access replaces `sees_all_apps` and the `rux.team-account` record.** Staff
  in the database is a linked profile whose account is the owner or has
  Scheduler ticked, so a Notes reader never sees trip data.
- **An Access page for the owner**, on the Account page: a row per account and
  a checkbox per app in `switcher.json` other than Home, so a new app gets its
  checkbox with no code. Ticks wait for Save, and a save that takes access away
  first lists every change for confirmation. It saves through a database
  function that first checks the caller is the owner. The owner switch changes only by migration,
  so the owner cannot untick themself out. Creating accounts and resetting
  passwords stay in the Supabase dashboard, because they need the secret key.
- **One login page for the whole site, at `/login/`, built from Design.** An
  address opened without a login goes there and remembers the address. After
  logging in, the account lands on that address if its access allows it, and
  on Home if not, or on its one app when it has only one. It replaces the scheduler's own login form, and Log out
  everywhere returns to it.
- **`funnel.js` is the gate**, the first script on every page. It reads the
  stored login and redirects before the page draws, with no network. It lets
  through `/login/` and the link pages. The check keeps requiring it first on
  every full page, with no exceptions.
- **Every page starts hidden** by a style in its head, and `funnel.js` shows it
  only once the login passes, so a browser with scripts off draws nothing.
- **Search engines are asked not to crawl the site**, in `robots.txt`.
- **`account.js` loads on every page** and confirms the login with Supabase
  after the page opens, so a login that ended elsewhere, like a changed
  password or a deleted account, goes to the login page.
- **A curtain for files, a lock for data.** GitHub Pages sends a file to anyone
  who has its address, and this repository is public, so the login stops
  browsing while the database rules protect the data. Truly private pages would
  need a login service in front of the host on rux's own domain, which is a
  separate decision.
- **A local preview has no lock** unless `?cloud` is on the address, as
  `account.js` behaves today.
- **The link pages live in `/scheduler/share/`** as driver, maintenance,
  document and request pages. They use Design and the `scheduler-` prefix, are
  not apps and are not in the switcher. They read only the token-checked
  functions, so they keep working after the database closes.
- **Old links keep working.** rux-ui's driver, maintenance, document and
  request pages become forwarders to the new pages, keeping the token, and
  rux-ui's link-making code switches to the new addresses.
- **rux-ui keeps making driver and maintenance links**, pointing at the new
  pages. The scheduler making links is a plan of its own.
- **rux-ui keeps its own login and session.** It is a separate site that this
  lock does not reach.
- **The access migration and the login page come before the database close**
  in the staff sign-in plan, so the close checks access from the start. The
  link pages can come before or after it.
- **rux creates accounts in the dashboard and ticks their apps on the Access
  page.** A change reaches the pages of someone already logged in within an
  hour, or at their next login.

## Questions

None open.

## Tasks

- [ ] Build `/login/` from Design, with Turnstile and the remembered address.
- [ ] `funnel.js` reads the access from the stored login, sends no login to
      `/login/` and a page of an app not ticked to Home, and lets through `/login/`
      and `/scheduler/share/`. Every page, generators included, starts hidden
      until it passes, and the check requires both.
- [ ] `robots.txt` at the root disallows every crawler.
- [ ] Load `account.js` on every page, including the Design and Notes
      generators, confirming the login after the page opens.
- [ ] Remove the scheduler's own login form, `sees_all_apps` and the
      `rux.team-account` record from the site.
- [ ] Replace `sees_all_apps` with the owner switch and ticked apps in the
      staff sign-in and Notes online plans.
- [ ] Build the driver, maintenance, document and request pages in
      `/scheduler/share/`, each tested against a real link without saving.
- [ ] Turn rux-ui's four link pages into forwarders and switch its link-making
      code to the new addresses.
- [ ] Migration `profiles_sees_all_apps_drop`, once nothing reads the column.
