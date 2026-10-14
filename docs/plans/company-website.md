---
type: plan
---

# Plan: the company website and its quote requests

## Goal

escamillatourbuses.com opens over HTTPS on any phone, says what the company
runs and where it goes, and takes a quote request that always reaches the
office: as a New quote on the board's Tasks, which starts the trip with the
request already filled in, and as an email in Missive that one reply answers.

The site stands as a public preview in this repository, `website/`, beside
the current site, and takes the current site's address only once the manager
approves it. `website/README.md` says what the preview is.

The current site has no HTTPS on `www`, and both its forms send from the
visitor's browser through a Mandrill key written in the page's script, from a
sender domain the company does not own, to a staff member's Gmail login. Each
request reached the office only when it was forwarded from there by hand, and
the last one forwarded came in March 2026.

## Decisions

- **The preview is an app in this repository, `website/`, open to everyone
  without a log-in,** so the manager can open it on any phone while the
  current site stays at its address. Its pages load no lock, and
  `tools/check.mjs` leaves the folder out of the lock rule.
- **Search engines are asked not to list the preview, and every page says it
  is a preview,** with the office's phone and email, so a search finds one
  site and nobody mistakes this one for the site the office answers.
- **Everything after the preview waits on the manager's yes.** The preview is
  pages alone; the database, the function and the scheduler's part are built
  once the site is approved.
- **Once approved, the site moves to its own public repository on GitHub
  Pages,** with escamillatourbuses.com as its custom domain and HTTPS
  enforced, because a custom domain takes a repository's whole address and
  this one holds the other apps. Its links stay inside its folder, so it moves
  whole, and a 404 page comes with the move, since GitHub Pages serves one
  404 for a whole site.
- **Its look is Design's.** Pages are built from Design's shell, tiles,
  notifications, accordion and form controls, linked from `/design/`. The
  parts Carbon has no component for, the hero, photos, rows of tiles and the
  footer, are the site's own `website-` classes in its `app.css`. Once moved,
  Design's built sheets are copied in by a sync tool and held to the same
  class rule, so a Design change reaches the public site only when synced.
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
  widget of its own for the site's domain, a hidden field a person never
  fills, and a limit on requests from one address in an hour.
- **A request is stored in `quote_requests` with a number of its own,** shown
  to the customer and in the email's subject. Staff read and update it under
  `staff_all`, and only the function adds one.
- **Each request adds a New quote row to Tasks:** `kind` `quote`, `source`
  `website`, due the day it came in, its organization or name as who, its trip
  in a line as words and its facts as detail. `to_dos` gains
  `quote_request_id`, and `to_dos_stamp` takes a website row with no one
  signed in, which names Website where a person or Ruxbot would be.
- **The function emails e-escamilla@sbcglobal.net, the one inbox the team
  reads in Missive,** with the customer as Reply-To, so a reply in Missive
  reaches them, and sends the customer a copy of what they asked.
- **A request is never lost to one failing part.** It is stored first and
  emailed either way, and the page says it failed only when both failed, with
  the phone number and what was typed still there.
- **Mail goes out from the company's domain, signed with SPF and DKIM,**
  because the office's inbox already files some customers' requests as spam.
- **Start trip turns a request into a draft,** a `trip_drafts` row for
  whoever pressed it with the fields `draft_trip` writes, and opens the editor
  on `?draft=`, so Save stays a person's. The draft fills Customer where the
  organization is a customer's exact name, and the booking contact where the
  email or phone is a contact's; Update your lists offers the rest after the
  save. `trip_drafts` gains `quote_request_id`, and the save links the request
  and its Tasks row to the trip.
- **Inbox review joins a request's email to its row** by the request number
  in the subject, adding the thread's link and no second New quote.
- **A session cannot deploy a function.** It hands rux the deploy command for
  `quote-request`, as for the connector, and rux sets the function's secrets,
  the Turnstile secret and the mail key, in the dashboard.
- **The domain moves only once the site serves at its GitHub address and a
  request has landed.** Every Microsoft 365 record stays as it is, the domain
  is verified with GitHub so no one else can claim it, and the old hosting is
  cancelled after.

## Questions

- Is anything else on the pages out of date or wrong, and are there newer
  photos of the fleet, or of the family and the team, to put on them?
- A tourism bureau wrote the office a strong commendation. May the site quote
  it, by name, beside the current site's testimonial?
- Who holds the GoDaddy account for the domain, and the Mailchimp account
  behind the Mandrill key? Is the current hosting under a contract, and are
  the site's photos the company's to reuse?
- Which GitHub account owns the moved site: rux-sm, or an organization for
  the company, so the site outlives one person's account?
- Which service sends the mail: the company's Microsoft 365, already paid but
  needing an app registered in its admin, or a mail service such as Resend,
  quicker to set up with a few DNS records?
- What does the customer's copy promise: a reply within a working day, or
  something else?
- The database is never tried with a test record. May the switch send one
  real request marked as a test and closed at once, or is the first
  customer's request the proof?

## Tasks

- [ ] Revoke the Mandrill key in the current site's script, in the Mailchimp
      account or through the agency that hosts the site, and have both forms
      replaced with the phone number and the office's email until the switch.
- [ ] Put rux's answers on the pages in both languages: anything out of
      date, new photos and the commendation.
- [ ] Once approved, move `website/` to its own repository with `README.md`,
      `AGENTS.md`, `CNAME`, a 404 page, the Design sync tool and a check run
      in CI for the class rule, links, and every page's title and
      description, and take `website/` out of this repository.
- [ ] Write the migration for `quote_requests`, `to_dos.quote_request_id`,
      `trip_drafts.quote_request_id` and a `website` source in
      `to_dos_stamp`, show it to rux, apply it on a yes, and update
      `scheduler/docs/database-inventory.md`.
- [ ] Write `scheduler/quote-request/`, its rules in a handler the check runs
      against sample requests: the fields, the hidden field, the limit, the
      email's subject and the Tasks row. Pin its imports, as
      `scheduler/tools/check-connector.mjs` holds the connector's.
- [ ] Add the mail service's domain records at GoDaddy and a Turnstile widget
      for the site's domain, hand rux the deploy command and the secrets, and
      point the form at the function with a failed send checked.
- [ ] Show a website request on Tasks, with Website where its maker goes, its
      facts in its detail and Start trip among its buttons, and update
      `scheduler/docs/screen-inventory.md`.
- [ ] Build Start trip: the draft from the request, its fields run against
      sample requests in the check, and the links Save writes.
- [ ] Teach `.claude/skills/inbox-review/` to join a request's email to its
      row by the number in its subject.
- [ ] Add how a website request is answered to `scheduler/docs/booking.md`,
      ahead of sending the quote.
- [ ] Point `www` and the bare domain at GitHub Pages at GoDaddy, keeping
      every Microsoft 365 record, verify the domain with GitHub, turn on
      Enforce HTTPS, and check that http and https, with and without `www`,
      all land on the new site.
- [ ] Point the Google Business Profile, Facebook and Instagram at the new
      site, then cancel the old hosting.
