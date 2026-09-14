---
type: plan
---

# Plan: lock the site behind a login

## Goal

Every page of rux-sm.github.io opens only for a logged-in account, and the
account's role decides which pages it can open and where everything else sends
it. The scheduler's public link pages, for drivers, maintenance, documents and
customer requests, are rebuilt with Design here and open without a login.

## Decisions

- **Each account has one role, and the role decides everything.** `owner`
  opens every page, with the switcher. `scheduler` opens only the scheduler.
  Later roles follow the same rule, such as `notes` for a friend who reads
  Notes and nothing else. A role is named for its home app, and every page
  outside it sends the account there. An account with no role is not let in.
- **The role sits in the account's `app_metadata`**, Supabase's standard place
  for roles. Only a migration or the dashboard can set it, it travels inside
  the login token, and the database rules check the same value the pages read.
- **The role replaces `sees_all_apps` and the `rux.team-account` record.**
  Staff in the database becomes a linked profile with the role `owner` or
  `scheduler`, so a Notes reader never sees trip data or appears among staff.
- **One login page for the whole site, at `/login/`, built from Design.** An
  address opened without a login goes there and remembers the address. After
  logging in, the account lands on that address if its role allows it, and on
  its home app if not. It replaces the scheduler's own login form, and Log out
  everywhere returns to it.
- **`funnel.js` is the gate**, the first script on every page. It reads the
  stored login and redirects before the page draws, with no network. It lets
  through `/login/` and the link pages. The check keeps requiring it first on
  every full page, with no exceptions.
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
- **rux-ui keeps its own login and session.** It is a separate site that this
  lock does not reach.
- **rux creates accounts in the dashboard, and a migration sets the role**, on
  rux's yes. A role change reaches someone already logged in within an hour, or
  at their next login.

## Questions

- Should the scheduler also make driver and maintenance links, or does rux-ui
  keep making them, pointing at the new pages? Recommended: rux-ui keeps making
  them, and the scheduler gets it in a plan of its own.
- Does this come before the database close in the staff sign-in plan?
  Recommended: the role migration and the login page first, so the close
  checks roles from the start; the link pages can follow in either order.

## Tasks

- [ ] Migration `site_roles_add`: role `owner` on rux's account and
      `scheduler` on the six others; `is_staff()` checks the role;
      `my_staff_profile()` returns the role.
- [ ] Build `/login/` from Design, with Turnstile and the remembered address.
- [ ] `funnel.js` reads the role from the stored login, sends no login to
      `/login/` and a wrong page to the role's home, and lets through `/login/`
      and `/scheduler/share/`.
- [ ] Load `account.js` on every page, including the Design and Notes
      generators, confirming the login after the page opens.
- [ ] Remove the scheduler's own login form, `sees_all_apps` and the
      `rux.team-account` record from the site.
- [ ] Replace `sees_all_apps` with the `owner` role in the staff sign-in and
      Notes online plans.
- [ ] Build the driver, maintenance, document and request pages in
      `/scheduler/share/`, each tested against a real link without saving.
- [ ] Turn rux-ui's four link pages into forwarders and switch its link-making
      code to the new addresses.
- [ ] Migration `profiles_sees_all_apps_drop`, once nothing reads the column.
