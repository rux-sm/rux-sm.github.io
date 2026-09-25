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
  on Home if not, or on its one app when it has only one. Log out
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
  password or a deleted account, goes to the login page, as does a login that
  ends while the page is open.
- **A curtain for files, a lock for data.** GitHub Pages sends a file to anyone
  who has its address, and this repository is public, so the login stops
  browsing while the database rules protect the data. Truly private pages would
  need a login service in front of the host on rux's own domain, which is a
  separate decision.
- **A local preview has no lock,** except the cloud preview on port 8641, as
  `account.js` behaves today.
- **The link pages live in `/scheduler/share/`** as driver, maintenance,
  document and request pages. They use Design and the `scheduler-` prefix, are
  not apps and are not in the switcher. They read only the token-checked
  functions, so they keep working after the database closes.
- **The scheduler carries the company's logo** in every page's header, the
  link pages' included, and its own bus mark as its favicon and its tile.
- **Each keeps its old page's address shape:** `driver.html?s=`,
  `maintenance.html?s=`, `document.html?id=` and `request.html?r=`, so a
  forwarder swaps only the start of the address.
- **The request page takes no file attachments.** rux-ui's form uploads to a
  `trip-request-uploads` bucket and records each file with
  `attach_trip_request_document`, and neither exists, so no attachment has
  ever arrived; the page says to send files when dispatch follows up.
- **Old and new pages work side by side until the forwarders.** Both read the
  same functions with the same link, so they show the same trips, and an
  accept or decline on either is one record.
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
  page.** A change reaches someone already logged in at the next page they
  open.

### The driver page, feature for feature from rux-ui's

`scheduler/share/driver.html` does what rux-ui's `driver.html` and
`js/pages/driver-share.js` do, drawn with Design, phone first, in sentence
case. Improvements wait until it is live and the old links forward to it.

- **What it reads.** `get_driver_schedule_share` for the driver and the link's
  dates, `get_driver_share_trips` for the trips with their stops, crew,
  documents and the requirement labels, and `get_driver_assignment_statuses`
  for each answer. All three are token-checked, so nothing else is read.
- **The top.** "Hello" and the driver's short name, "Here are your current
  assignments", the link's date range, and when dispatch last updated the
  link, as "Updated today at 3:40 PM".
- **Which trips.** One card per leg the link names, oldest first. A leg shows
  until the end of its last day. A cancelled trip is left out. A leg that is
  no longer the driver's says so on its own card, with Try again.
- **Each card's head.** The dates, the destination (the yard for a return
  leg), the customer, the bus number and the driver's role, such as Relief
  driver.
- **Answering.** A leg waiting for an answer has Accept and Decline. Decline
  first asks "Decline this assignment?", saying dispatch will be told. Once
  answered, the card shows Accepted or Declined in their place. An accepted
  leg that dispatch changed afterwards shows Changes requested, with no
  buttons. A failed answer says so on the card and keeps the buttons.
- **Where to be.** The pickup's name and address with a Navigate link to
  Maps, and the spot time, or the report time for a relief driver.
- **Who to call.** The trip's day-of contact, falling back to the second
  contact and then the booking contact, with Call and Text.
- **The role.** For a relief driver, who they take over from, the handoff
  time and place and dispatch's instructions, or a line saying dispatch will
  send them.
- **The crew.** Everyone else on the trip, grouped by bus with the driver's
  own bus first as "Your bus", each with Call and Text. Past two buses the
  rest fold under View all crew.
- **Notes.** The trip's notes, folded after 240 characters under View full
  notes.
- **Documents.** Each itinerary file, newest version, marked Updated when it
  replaced one, and the driver's envelope, drawn by `print.js`'s envelope
  form for this driver alone. An itinerary opens through
  `trip-document-link` once `site-paperwork-lock.md` is built, and by its
  public address until then.
- **Telling the boards.** An answer sends the `driver-status-changed` message
  on the `scheduler-trips` channel, which rux-ui's board listens for.
- **When there is nothing to show.** No token: "This link has no schedule in
  it", and ask dispatch. An inactive link: "This link is no longer active",
  with Try again. No current legs: "No current assignments", and that new
  ones appear here. A load that fails: say so, with Try again.
- **Times** read in Central time, as rux-ui's do.

## Questions

1. rux-ui works out each trip's requirements, such as a wheelchair lift or a
   hotel, but never shows them to the driver. Should the new page show them
   on each card?
2. When dispatch changes a trip the driver already accepted, rux-ui shows
   Changes requested but gives no button to accept it again. Should the new
   page offer Accept and Decline again?

## Tasks

- [ ] Build the request page, tested without sending a request.
- [ ] rux reads the driver page list above against rux-ui's page and
      answers the question.
- [ ] Build the driver page, tested against a real link without accepting or
      declining.
- [ ] Turn rux-ui's four link pages into forwarders and switch its link-making
      code to the new addresses.
- [ ] Migration `profiles_sees_all_apps_drop`: drop the column, which no code
      reads, and its key from `my_staff_profile()`.
