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
  email on a staff domain. Claude never types or handles a password.
- **Seven accounts**, one for each current rux-ui profile, the wall display
  included, each linked to its `public.profiles` row so names, colours and
  photos stay. rux's own account is a username and password like the rest.
- **The same login works in both apps and shows the same data.** A team
  account is for the scheduler and rux-ui only: the site header hides the app
  switcher for it, which leaves its profile icon farthest right. rux's account
  keeps the switcher, still the rightmost icon as Carbon's header orders it.
  Hiding it only tidies the menu; Notes and Design stay public pages.
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
  rollback written beside it.
- **The grants and function definitions a rollback needs are read immediately
  before each change**, because a snapshot taken days earlier goes stale, and
  they are kept out of this public repository.
- **Captcha protection is on and covers sign-in**, so both sign-in forms send
  a Turnstile token with the site key `account.js` already uses. The email
  provider is enabled.
- **Sign-ups stay on.** A self-made account gets nothing, because staff needs a
  profile rux links, and the home page's anonymous sessions go through the
  same sign-up endpoint.
- **Later plans:** per-person chat rules, trip history naming the actor from
  the session, private storage, private realtime channels.

## Questions

None open.

## Tasks

- [ ] Migration `staff_identity_add`: `profiles.user_id` (unique, references
      `auth.users`, on delete set null) and `profiles.sees_all_apps` (not null,
      default false); security-definer `staff_profile_id()`,
      `is_staff()`, `assert_staff()` and `my_staff_profile()`, revoked from
      `public` and `anon` and granted to `authenticated`;
      `get_driver_share_trips(p_token)` returning the trips, stops,
      assignments, drivers, documents and requirements a driver link shows,
      and `get_trip_document(p_id)`, both granted to `anon`; a statement
      trigger on `trips`, `trip_assignments`, `trip_stops` and `buses` that
      sends `maintenance-schedule-signal` through `realtime.send` and can never
      fail a save.
- [ ] rux creates the seven accounts, the display's first to prove the staff
      domain; migration `staff_identity_link` sets each `profiles.user_id` and
      `sees_all_apps` on rux's profile only, and a query shows seven linked,
      none anonymous.
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
- [ ] rux-ui sign-in: `js/core/staff-username.js` with a test,
      `js/data/auth-db.js` and `js/components/staff-sign-in.js` with a
      Turnstile token;
      `index.html` signs in before the first load, drops the profile picker,
      and turns "Switch profile" into "Sign out"; a lost session reopens the
      sign-in over the app; `js/core/profile.js` keeps its three exports;
      `js/pages/trip-intake.js` signs in first; forced refresh after the
      deploy.
- [ ] Scheduler sign-in: `account.js` skips the anonymous session on a page
      marked `data-auth="staff"` and adds `signInStaff` with a Turnstile token,
      `staffProfile` and
      `onAuthChange`, and on every page it loads it hides the app switcher
      button and panel for a staff session whose profile lacks
      `sees_all_apps`; `scheduler/data.js` shows the form for no session, an
      anonymous one or a non-staff account, reads an empty fleet as a lost
      sign-in, and reports a write that returns no row as not saved.
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
