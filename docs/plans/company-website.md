---
type: plan
---

# Plan: the company website and its quote requests

## Goal

escamillatourbuses.com opens over HTTPS on any phone, says what the company
runs and where it goes, and takes a quote request that always reaches the
office: as a New quote on the board's Tasks, which starts the trip with the
request already filled in, and as an email in Missive that one reply answers.

It is built first as a public preview in this repository, beside the
current site, and takes the current site's address only once the manager
approves it.

The current site has no HTTPS on `www`, and both its forms send from the
visitor's browser through a Mandrill key written in the page's script, from a
sender domain the company does not own, to a Gmail address. A request is
rejected or lost, and the page can still thank the customer for it.

## Decisions

- **The preview is an app in this repository, `website/`, open to everyone
  without a log-in,** as `/login/` and `/scheduler/share/` are, so the manager
  can open it on any phone while the current site stays at its address. It
  is in `switcher.json` and the Names table, its header is the company logo
  alone, and its prefix is `website-`.
- **Search engines are asked not to list the preview,** so a search for the
  company finds one site, and the request comes off when it takes the
  address.
- **Every preview page says it is a preview,** with the phone number, so
  nobody mistakes it for the site the office answers from.
- **Everything after the preview waits on the manager's yes.** The preview is
  pages alone; the database, the function and the scheduler's part are built
  once the site is approved.
- **Once approved, the site moves to its own public repository on GitHub
  Pages,** with escamillatourbuses.com as its custom domain and HTTPS
  enforced, because a custom domain takes a repository's whole address and
  this one holds the other apps. The lock's scripts come off its pages there.
- **It is plain pages with no build step,** so the folder is what is served:
  Home, Buses, Services, About, Request a quote, Contact, Work for us, a
  thank-you page and a 404. Its links stay inside its folder, so it moves
  whole.
- **Its look is Design's.** Pages start from `design/templates/` and link
  Design's sheets as every app here does. Once moved, Design's built sheets
  are copied in by a sync tool and held to the same class rule, so a Design
  change reaches the public site only when synced there. A part Design lacks,
  such as a photo hero or a gallery, is added to Design first with invented
  content. The theme takes its colours from `scheduler/brand/logo.svg`.
- **The site is in English and Spanish, a page of each for every page,** the
  Spanish under `es/`, each linking to its other language at the same place,
  so a search finds either and nothing is translated by a script. A request
  keeps the language it was sent in, so the office answers in it.
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
- **In the preview the form sends nothing, and says so before it is
  filled:** a notice above it gives the phone number and the office's email
  for a real request. It checks its fields and opens the thank-you page, which
  says again that no request was sent.
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

- What on the current site is out of date: the history, the services, the
  testimonial or the photos? Are the hours still Monday to Friday, 8 to 5?
- Work for us: keep "call or come by", or a short interest form? A full
  application would collect licence details the site should not hold.
- Which email does the site list for customers in place of the sbcglobal.net
  one, and which address receives quote requests?
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
- [ ] Start `website/`: its `index.html` from a Design template, its
      `README.md`, its entry in `switcher.json`, its icon by
      `docs/app-icons.md`, and its row in the Names table of `AGENTS.md`.
      Open it without a log-in in `funnel.js`, and say so in the goal of
      `site-lock.md`.
- [ ] Add to Design, with invented content, the parts the pages need that it
      lacks: a photo hero, a gallery and a fleet card.
- [ ] Build Home, Buses, Services, About, Contact, Work for us and the 404 in
      English and Spanish from the content rux confirms, with photos sized for
      phones and described in their alt text, and check them in Chrome on
      :8641 at phone and desktop widths.
- [ ] Build Request a quote and its preview thank-you page in both languages,
      and check them in Chrome on :8641 with errors and the keyboard alone.
- [ ] Once approved, move `website/` to its own repository with `README.md`,
      `AGENTS.md`, `CNAME`, the Design sync tool and a check run in CI for the
      class rule, links, and every page's title and description, and take
      `website/` out of this repository.
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
