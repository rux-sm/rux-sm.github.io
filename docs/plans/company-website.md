---
type: plan
---

# Plan: the company website and its quote requests

## Goal

escamillatourbuses.com opens over HTTPS on any phone, says what the company
runs and where it goes, and takes a quote request straight into the
scheduler, as a New quote on the board's Tasks, which starts the trip with the
request already filled in.

The site stands as a public preview in its own repository,
`escamillatourbuses`, at rux-sm.github.io/escamillatourbuses/, beside the
current site, and takes the current site's address only once the manager
approves it. Its `README.md` says what the preview is.

The current site has no HTTPS on `www`, and both its forms send from the
visitor's browser through a Mandrill key written in the page's script, from a
sender domain the company does not own, to a staff member's Gmail login. Each
request reached the office only when it was forwarded from there by hand, and
the last one forwarded came in March 2026.

## Decisions

- **The site is its own public repository, `rux-sm/escamillatourbuses`, open
  to everyone without a log-in,** because a custom domain takes a
  repository's whole address and this one holds the other apps. GitHub Pages
  serves it at rux-sm.github.io/escamillatourbuses/ until the domain moves, so
  the manager can open it on any phone while the current site stays at its
  address. This repository's `404.html` forwards the old `/website/`
  addresses to it.
- **Search engines are asked not to list the preview, and every page says it
  is a preview,** with the office's phone and email, so a search finds one
  site and nobody mistakes this one for the site the office answers.
- **Only the domain waits on the manager's yes.** The repository and the
  quote requests are built first, so the switch is one step when the yes
  comes.
- **At the switch, escamillatourbuses.com becomes the repository's custom
  domain, with HTTPS enforced,** and a `CNAME` file comes with it. Its links
  stay inside its folder and its 404 page reads its links from the site's
  root, so nothing else changes.
- **The repository is rux-sm's,** for now, the account that already runs
  these pages; an organization for the company can take it over later.
- **Its look is Design's.** Pages are built from Design's shell, tiles,
  notifications, accordion and form controls, copied into the site's
  `design/` from Design's committed build by its sync tool and held to
  Design's classes by its check, so a Design change reaches the public site
  only when synced. The parts Carbon has no component for, the bands, hero,
  photos, rows of tiles and the footer, are the site's own `website-`
  classes in its `app.css`.
- **The site is in English and Spanish, a page of each for every page,** the
  Spanish under `es/`, each linking to its other language at the same place.
  A request keeps the language it was sent in, so the office answers in it.
- **No price is on the site,** because a quote depends on the trip's miles,
  days and buses, and the office prices each one.
- **The facts come from the Scheduler, the booking terms and the office's
  mail:** the active fleet's types, seats, lifts and sleeper berths, the terms
  in `scheduler/docs/booking.md`, who books and where they go. No customer,
  driver or trip is named.
- **The photos are the current site's of coaches still in the fleet.** Its
  three photos of MCI coaches the fleet no longer runs, and its four of
  people, are left out until rux sends what replaces them.
- **The tourism bureau's commendation is quoted by the bureau's name once the
  bureau says yes,** a line or two beside the current site's testimonial,
  because a letter to the office is not the same as praise on a public page.
  It is the one organization the pages name.
- **Work for us is a part of About us:** call or come by the office, and no
  form, which would collect licence details the site should not hold.
- **The quote form asks what the office quotes from and what first requests
  leave out:** name, phone, email, organization, whether a purchase order
  pays, one way or round trip, pickup, destination, the date and time each
  way, passengers, a wheelchair lift, and stops and details.
- **In the preview the form sends nothing, and says so before it is
  filled.** It checks its fields and opens the thank-you page, which says
  again that no request was sent.
- **Once live, the form posts to an Edge Function, `quote-request`, never to
  a table,** as `docs/database-access.md` requires of a page without a
  log-in. Its source sits in `scheduler/quote-request/`, and it reaches the
  database with the service role, as `scheduler/trip-document-link/` does.
- **Spam is stopped by Turnstile, which the log-in already uses,** with a
  widget of its own for the site's addresses, a hidden field a person never
  fills, and a limit on requests from one address in an hour. The function
  checks each token with Cloudflare itself, since the log-in's check is
  Supabase Auth's own.
- **A request is stored in `quote_requests` with a number of its own,** shown
  to the customer on the thank-you page, to give when they call. Staff read
  and update it, and only the function adds one: no policy or grant lets a
  signed-in person insert.
- **Each request adds a New quote row to Tasks:** `kind` `quote`, `source`
  `website`, due the day it came in, its organization or name as who, its trip
  in a line as words and its facts as detail. `to_dos` gains
  `quote_request_id`, its `source` rule takes `website`, and `to_dos_stamp`
  takes a website row only with no one signed in, naming Website where a
  person or Ruxbot would be.
- **A request goes to the scheduler alone, and no email is sent,** because
  the office's quote work is already a New quote on Tasks, and a mail service
  would add domain records, a key and a spam filter between the form and the
  office. Tasks' count shows it the day it lands, and the office answers by
  writing to the customer from Missive. A free mail service, such as Resend's
  free tier, can be added later if a request ever waits unseen.
- **A request that fails to store is never lost in silence.** The page says
  it was not sent, gives the phone number and keeps what was typed.
- **The thank-you page promises no reply time.** It gives the request's
  number, says the office answers Monday to Friday, 8 to 5, and asks for a
  call about a trip in the next few days, because a promise the office misses
  costs more than none.
- **Start trip turns a request into a draft,** a `trip_drafts` row for
  whoever pressed it with the fields `draft_trip` writes, and opens the editor
  on `?draft=`, so Save stays a person's. The draft fills Customer where the
  organization is a customer's exact name, and the booking contact where the
  email or phone is a contact's; Update your lists offers the rest after the
  save. `trip_drafts` gains `quote_request_id`, and the save links the request
  and its Tasks row to the trip.
- **A session cannot deploy a function.** It hands rux the deploy command for
  `quote-request`, as for the connector, and rux sets the function's secret,
  the Turnstile secret, in the dashboard.
- **The switch is proven with one real request,** marked as a test in its
  details and closed at once, since the database is never tried otherwise.
- **The domain moves only once the site serves at its GitHub address and the
  test request has landed.** Every Microsoft 365 record stays as it is, the
  domain is verified with GitHub so no one else can claim it, and the old
  hosting is cancelled after.

## Questions

- Who holds the GoDaddy account for the domain, and the Mailchimp account
  behind the Mandrill key? Is the current hosting under a contract, and are
  the site's photos the company's to reuse?

## Tasks

- [ ] Revoke the Mandrill key in the current site's script, in the Mailchimp
      account or through the agency that hosts the site, and have both forms
      replaced with the phone number and the office's email until the switch.
- [ ] Ask the tourism bureau whether the site may quote its letter by name,
      and on a yes put a line or two of it on the pages in both languages.
- [ ] Put new photos of the fleet or the team on the pages once rux has them.
- [ ] Write the migration for `quote_requests`, `to_dos.quote_request_id`,
      `trip_drafts.quote_request_id` and a `website` source in
      `to_dos_stamp`, show it to rux, apply it on a yes, and update
      `scheduler/docs/database-inventory.md`.
- [ ] Write `scheduler/quote-request/`, its rules in a handler the check runs
      against sample requests: the fields, the hidden field, the limit and
      the Tasks row. Pin its imports, as
      `scheduler/tools/check-connector.mjs` holds the connector's.
- [ ] Add a Turnstile widget for the site's domain, hand rux the deploy
      command and the secret, point the form at the function with a failed
      send checked, give the thank-you page the request's number, and send
      the test request and close it.
- [ ] Show a website request on Tasks, with Website where its maker goes, its
      facts in its detail and Start trip among its buttons, and update
      `scheduler/docs/screen-inventory.md`.
- [ ] Build Start trip: the draft from the request, its fields run against
      sample requests in the check, and the links Save writes.
- [ ] Add how a website request is answered to `scheduler/docs/booking.md`,
      ahead of sending the quote.
- [ ] Add `CNAME` to the site's repository, point `www` and the bare domain
      at GitHub Pages at GoDaddy, keeping every Microsoft 365 record, verify
      the domain with GitHub, turn on Enforce HTTPS, and check that http and
      https, with and without `www`, all land on the new site.
- [ ] Point the Google Business Profile, Facebook and Instagram at the new
      site, then cancel the old hosting.
