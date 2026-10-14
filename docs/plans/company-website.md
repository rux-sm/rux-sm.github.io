---
type: plan
---

# Plan: the company website and its quote requests

## Goal

escamillatourbuses.com opens over HTTPS on any phone, says what the company
runs and where it goes, and takes a quote request that always reaches the
office: as a New quote on the board's Tasks, which starts the trip with the
request already filled in, and as an email in Missive that one reply answers.

The current site has no HTTPS on `www`, and both its forms send from the
visitor's browser through a Mandrill key written in the page's script, from a
sender domain the company does not own, to a Gmail address. A request is
rejected or lost, and the page can still thank the customer for it.

## Decisions

- **The site is its own public repository on GitHub Pages,** with
  escamillatourbuses.com as its custom domain and HTTPS enforced, because
  `site-lock.md` puts rux-sm.github.io behind a log-in.
- **It is plain pages with no build step,** so the repository is what is
  served: Home, Buses, Services, About, Request a quote, Contact, Work for us,
  a thank-you page and a 404.
- **Its look is Design's.** Pages start from `design/templates/`, and its CSS
  is Design's built sheets copied in by a sync tool and held to the same class
  rule, so a Design change reaches the public site only when synced there. A
  part Design lacks, such as a photo hero or a gallery, is added to Design
  first with invented content. The theme takes its colours from
  `scheduler/brand/logo.svg`.
- **No price is on the site,** because a quote depends on the trip's miles,
  days and buses, and the office prices each one.
- **The content comes from the current site and the office:** the history,
  services, testimonial and photos, and the fleet's types, seats and features
  from the scheduler's vehicle types. Nothing from a trip is shown.
- **Every page has its own title and description, and Home carries the
  business's name, address, phone and hours as structured data,** so a search
  shows the company and not the old placeholder text.
- **The quote form asks what the office quotes from:** name, phone, email,
  organization, one way or round trip, pickup address, destination, the date
  and time each way, passengers, a wheelchair lift, and details. Dates and
  times use the phone's own pickers, every label is tied to its field, an
  error is said beside its field, and nothing typed is cleared until the
  request lands. The phone number stays on the page.
- **The form posts to an Edge Function, `quote-request`, never to a table,**
  as `docs/database-access.md` requires of a page without a log-in. Its source
  sits in `scheduler/quote-request/`, and it reaches the database with the
  service role, as `scheduler/trip-document-link/` does.
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
- **The function emails the office's Missive inbox** with the customer as
  Reply-To, so a reply in Missive reaches them, and sends the customer a copy
  of what they asked and what happens next.
- **A request is never lost to one failing part.** It is stored first and
  emailed either way, and the page says it failed only when both failed, with
  the phone number and what was typed still there.
- **Mail goes out from the company's domain, signed with SPF and DKIM,** so it
  is delivered and not filed as spam.
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

- Who holds the GoDaddy account for the domain, and the Mailchimp account
  behind the Mandrill key? Is the current hosting under a contract, and are
  the site's photos the company's to reuse?
- Which address receives quote requests, and which email does the site list
  for customers in place of the sbcglobal.net one?
- Which GitHub account owns the repository: rux-sm, or an organization for
  the company, so the site outlives one person's account?
- English only, or English and Spanish?
- Which service sends the mail: the company's Microsoft 365, already paid but
  needing an app registered in its admin, or a mail service such as Resend,
  quicker to set up with a few DNS records?
- What does the customer's copy promise, a reply within a working day or
  something else, and are the hours still Monday to Friday, 8 to 5?
- What on the current site is out of date: the history, the services, the
  testimonial or the photos?
- Work for us: keep "call or come by", or a short interest form? A full
  application would collect licence details the site should not hold.
- The database is never tried with a test record. May the switch send one
  real request marked as a test and closed at once, or is the first
  customer's request the proof?

## Tasks

- [ ] Revoke the Mandrill key in the current site's script, in the Mailchimp
      account or through the agency that hosts the site, and have both forms
      replaced with the phone number and the office's email until the switch.
- [ ] Write the migration for `quote_requests`, `to_dos.quote_request_id`,
      `trip_drafts.quote_request_id` and a `website` source in
      `to_dos_stamp`, show it to rux, apply it on a yes, and update
      `scheduler/docs/database-inventory.md`.
- [ ] Write `scheduler/quote-request/`, its rules in a handler the check runs
      against sample requests: the fields, the hidden field, the limit, the
      email's subject and the Tasks row. Pin its imports, as
      `scheduler/tools/check-connector.mjs` holds the connector's.
- [ ] Add the mail service's domain records at GoDaddy and a Turnstile widget
      for the site's domain, and hand rux the deploy command and the secrets.
- [ ] Make the repository: `README.md`, `AGENTS.md`, `CNAME`, the Design sync
      tool, and a check run in CI for the class rule, links, and every page's
      title and description.
- [ ] Add to Design, with invented content, the parts the pages need that it
      lacks: a photo hero, a gallery and a fleet card.
- [ ] Build Home, Buses, Services, About, Contact, Work for us and the 404 from
      the content rux confirms, with photos sized for phones and described in
      their alt text.
- [ ] Build Request a quote and its thank-you page, and check them at phone
      and desktop widths with errors, a failed send and the keyboard alone.
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
