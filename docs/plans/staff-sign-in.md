---
type: plan
---

# Plan: close the database with staff sign-in

## Goal

Only signed-in staff can read or write staff data in the shared database,
while the scheduler and rux-ui stay in daily use at every step, and driver,
maintenance, customer request and document links keep working. Today the
publishable key alone still reads and changes trip data: row level security is
on everywhere and every staff table has its staff rule, but an everyone rule
sits beside it on the trip, reference, chat and notification tables, the key
holds every table grant, and it can run most functions, including the ones
that make share links.

## Decisions

- **Each person signs in with their own username and password.** rux creates
  the accounts in the Supabase dashboard, confirmed at creation and sending no
  email, and resets passwords there. The app turns a username into a stand-in
  email on a staff domain, and a full email address is accepted as typed.
  Claude never types or handles a password.
- **Seven accounts**, one for each current rux-ui profile, the wall display
  included, each linked to its `public.profiles` row so names, colours and
  photos stay. rux's app login is rux's real email. The Supabase dashboard
  login is already an email account, and it gets two-factor sign-in.
- **Each scheduling app has its own full login screen.** Staff receive a link
  to each app separately and sign in to each one with the same username and
  password; signing in to one does not sign in to the other.
- **Which pages and apps an account opens is the site lock plan's**
  (`docs/plans/site-lock.md`): the owner switch and ticked apps decide it, and
  there is no link between the scheduler and rux-ui.
- **Sign-in replaces "Who's this?".** Identity and the trip-history name come
  from the session; changing person is sign out, then sign in.
- **The display account has full staff access** and stays signed in, because
  the display moves buses today.
- **Each person edits only their own profile.**
- **Secret links stay open through token-checked functions**, never direct
  table reads. A driver link shows the fields it shows today, phones included,
  for the trips in that link only.
- **Storage files stay public.** Closing them is a later plan.
- **Staff means a `public.profiles` row whose `user_id` is `auth.uid()` in a
  session that is not anonymous, on an account that is the owner or has
  Scheduler ticked**, so anonymous site visitors, self-made accounts and
  accounts given only other apps are never staff.
- **Every step adds beside what exists, and the open rules come down last**,
  after a watch of at least seven days accounts for every request still made
  with the key alone. Accounted for is not the same as gone: a stale browser
  cannot update itself while it still works, so waiting for one to stop would
  hold the database open for as long as it runs.
  Each database step is a named migration, applied on rux's yes, with its
  rollback written beside it. `staff_identity_add` is applied: the profile
  columns `user_id` and `sees_all_apps`, closed to the publishable key; the
  staff check functions; `get_driver_share_trips` and `get_trip_document`,
  open to the key; and the maintenance signal triggers. `staff_identity_link`
  is applied: the seven accounts exist on the `staff.invalid` domain, a
  reserved name nobody can own, and each is linked to its profile. Which apps
  an account opens now sits in `app_metadata`, the site lock plan's decision,
  and rux's account carries the owner switch there. rux-ui's driver,
  maintenance and document link pages read those functions and the signal,
  not the tables.
  `staff_policies_add` is applied: a `staff_all` rule on every trip, reference,
  settings, chat, notification and dev-note table, staff read and own-row
  update on `profiles`, staff game rules, and row level security on
  `settings`, `trip_documents`, `trip_itineraries` and `trip_payments` with a
  temporary `transition_open` rule.
- **The grants and function definitions a rollback needs are read immediately
  before each change**, because a snapshot taken days earlier goes stale, and
  they are kept out of this public repository.
- **Captcha protection is on and covers sign-in**, so both login screens send
  a Turnstile token with the site key `account.js` already uses. The email
  provider is enabled.
- **Anonymous sign-in ends everywhere.** The only accounts are the ones rux
  creates in the dashboard, and with anonymous sign-in gone rux turns off
  sign-ups, GitHub and Google too.
- **rux chooses the passwords, and one shared password is acceptable:** the
  aim is a wall between the public and staff, not between staff. It must meet
  the project's minimum password length.
- **The site's log-in is live:** `/login/` logs in, `funnel.js` locks every
  page behind a log-in and the account's ticked apps, `account.js` sends a
  log-in that ends to the log-in page, and `switcher.js` lists only the apps
  the account can open. The scheduler reads an empty fleet as an ended log-in.
- **Later plans:** per-person chat rules, private storage, private realtime
  channels, and reporting a scheduler write the database refused as not
  saved, which only an ended log-in could cause once the page lock guards the
  board.

## Questions

- The Escamilla account has never signed in. Is it still someone's, or does it
  go with its profile?

## Tasks

- [ ] rux turns on two-factor sign-in for the Supabase dashboard login.
- [ ] Press "Force refresh all users" in rux-ui, in working hours while the
      stale tab is open. One Mac still runs rux-ui from before sign-in
      shipped: a Safari that never asks `/auth/v1` or `my_staff_profile` at
      all, so it has no sign-in screen to show. It reads trips, passengers,
      ticket options, documents, payments and drivers, writes notifications
      and holds a realtime channel with the key alone, right through a working
      day, and its cached `supabase-js` is 2.112.4 where every signed-in
      client is 2.116.0. The reload broadcast has shipped since July, so that
      build carries it, but it reaches only a tab that is open and anyone with
      unsaved work loses it. rux-ui's Worker hides the browser's address, so
      only the Worker's own logs could name the machine.
- [ ] Pin rux-ui's `supabase-js` to one version instead of the floating `@2`,
      so a cached copy cannot leave a browser on an old client for months.
- [ ] rux turns off anonymous sign-ins, sign-ups, GitHub and Google in the
      dashboard. No page calls `signInAnonymously` any more, and a migration
      then deletes the twelve anonymous users, whose theme rows go with them.
- [ ] Watch for at least seven days, until three business days in a row show
      every account signed in and every remaining key-only request in the edge
      logs named: the driver, maintenance, document and request links, and any
      stale browser already known and chased. Anything unnamed stops the close
      until it is identified. A dry run inside a rolled-back transaction shows
      staff see rows and the key alone does not.
- [ ] Migration `staff_cutover_tables`: drop the open and `transition_open`
      policies, revoke table and sequence grants from `anon`, and limit
      profile updates to the display name, photo, colour and settings.
- [ ] Migration `staff_cutover_rpcs`: keep the driver link, maintenance
      schedule, trip request submission and the two new link functions open to
      `anon`; revoke the rest from `anon` and start each with `assert_staff()`;
      then issue a new maintenance link.
- [ ] Migration `staff_default_privileges`: new tables and functions no longer
      grant `anon` by default.
