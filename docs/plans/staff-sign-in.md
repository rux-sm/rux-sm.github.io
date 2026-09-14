---
type: plan
---

# Plan: close the database with staff sign-in

## Goal

Only signed-in staff can read or write staff data in the shared database,
while the scheduler and rux-ui stay in daily use at every step, and driver,
maintenance, customer request and document links keep working. Today the
publishable key alone can read and change trip data, most tables allow every
action to everyone, four have row level security off, and anon can run every
function, including the ones that create share links.

## Decisions

- **Each person signs in with their own username and password.** rux creates
  the accounts in the Supabase dashboard, confirmed at creation and sending no
  email, and resets passwords there. The app turns a username into a stand-in
  email on a staff domain, and a full email address is accepted as typed.
  Claude never types or handles a password.
- **Seven accounts**, one for each current rux-ui profile, the wall display
  included, each linked to its `public.profiles` row so names, colours and
  photos stay. rux's app login moves to rux's real email. The Supabase
  dashboard login is already an email account, and it gets two-factor
  sign-in.
- **Each scheduling app has its own full login screen.** Staff receive a link
  to each app separately and sign in to each one with the same username and
  password; signing in to one does not sign in to the other.
- **A team account stays inside the app it signed in to:** no app switcher,
  no link to Home, to another app, or between the scheduler and rux-ui. Home
  sends a signed-in team account to the scheduler. rux's account keeps the
  switcher, the rightmost header icon as Carbon orders it, and opens every
  app. Notes and Design stay public pages anyone can open by address.
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
  session that is not anonymous**, so anonymous site visitors and self-made
  accounts are never staff.
- **Every step adds beside what exists, and the open rules come down last**,
  after a watch of at least seven days shows nothing still uses the key alone.
  Each database step is a named migration, applied on rux's yes, with its
  rollback written beside it. `staff_identity_add` is applied: the profile
  columns `user_id` and `sees_all_apps`, closed to the publishable key; the
  staff check functions; `get_driver_share_trips` and `get_trip_document`,
  open to the key; and the maintenance signal triggers. `staff_identity_link`
  is applied: the seven accounts exist on the `staff.invalid` domain, a
  reserved name nobody can own, and each is linked to its profile, with
  `sees_all_apps` on rux's.
- **The grants and function definitions a rollback needs are read immediately
  before each change**, because a snapshot taken days earlier goes stale, and
  they are kept out of this public repository.
- **Captcha protection is on and covers sign-in**, so both login screens send
  a Turnstile token with the site key `account.js` already uses. The email
  provider is enabled.
- **Anonymous sign-in ends everywhere.** Home, Notes and Design open with no
  session at all, and a visitor's theme stays in their browser as it already
  does. The only accounts are the seven staff ones, and with anonymous
  sign-in gone rux turns off sign-ups, GitHub and Google too, since staff
  accounts are created in the dashboard.
- **rux chooses the passwords, and one shared password is acceptable:** the
  aim is a wall between the public and staff, not between staff. It must meet
  the project's minimum password length.
- **Later plans:** per-person chat rules, trip history naming the actor from
  the session, private storage, private realtime channels.

## Questions

None open.

## Tasks

- [ ] rux-ui link pages: `js/pages/driver-share.js` reads
      `get_driver_share_trips` instead of `trips`, `trip_documents` and
      `settings`; `doc.html` reads `get_trip_document`;
      `js/pages/maintenance-share.js` listens for the signal instead of
      `postgres_changes`; a test feeds the new shape to `normalizeAssignment`;
      cache busters bumped.
- [ ] Migration `staff_policies_add`: a `staff_all` policy for staff on every
      trip, reference, settings, chat, notification and dev-note table; staff
      read on `profiles` with update of the own row only; staff versions of
      the game policies; the four tables with row level security off get it
      on, with `staff_all` and a temporary `transition_open` policy.
- [ ] rux changes the `sergio` app login to rux's real email and turns on
      two-factor sign-in for the dashboard login.
- [ ] rux-ui login screen: `js/core/staff-username.js` with a test,
      `js/data/auth-db.js`, and a full login screen with a Turnstile token
      shown before the app loads when there is no staff session;
      `index.html` drops the profile picker and turns "Switch profile" into
      "Sign out", which returns to the login screen; a lost session returns to
      it without discarding unsaved work; `js/core/profile.js` keeps its three
      exports; `js/pages/trip-intake.js` requires the same sign-in; forced
      refresh after the deploy.
- [ ] Scheduler login screen: `account.js` never signs in anonymously, drops
      the GitHub and Google buttons, syncs a theme only for a staff session,
      and adds `signInStaff` with a Turnstile token, `staffProfile` and
      `onAuthChange`; on every site page it loads, a staff session whose
      profile lacks `sees_all_apps` hides the app switcher, and Home sends it
      to `/scheduler/`; `scheduler/data.js` shows a full login screen for no
      session, an anonymous one or a non-staff account, reads an empty fleet
      as a lost sign-in, and reports a write that returns no row as not saved.
- [ ] rux turns off anonymous sign-ins, sign-ups, GitHub and Google in the
      dashboard once both login screens are live; a migration deletes the
      anonymous users, whose theme rows go with them.
- [ ] Watch for at least seven days, until three business days in a row show
      every account signed in, no `anon` realtime subscription, and no anon or
      non-staff table request in the edge logs; a dry run inside a rolled-back
      transaction shows staff see rows and the key alone does not.
- [ ] Migration `staff_cutover_tables`: drop the open and `transition_open`
      policies, revoke table and sequence grants from `anon`, and limit
      profile updates to the display name, photo, colour and settings.
- [ ] Migration `staff_cutover_rpcs`: keep the driver link, maintenance
      schedule, trip request submission and the two new link functions open to
      `anon`; revoke the rest from `anon` and start each with `assert_staff()`;
      then issue a new maintenance link.
- [ ] Migration `staff_default_privileges`: new tables and functions no longer
      grant `anon` by default.
