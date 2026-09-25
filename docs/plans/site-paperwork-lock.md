---
type: plan
---

# Plan: Trip paperwork opens only through a short-lived link

## Goal

Close the `trip-documents` bucket, so a trip's paperwork can no longer be read
by anyone who has, or guesses, its file address. Every page that shows a trip
document asks for a link that stops working after a few minutes: the two
document share pages, the driver share pages, and each app's Files tab.

## Decisions

- **Only `trip-documents` closes here.** It holds the 214 files of paperwork.
  `driver-photos` and `profile-photos` stay public until the question below
  is answered.
- **One server function makes the public links,** `trip-document-link`, a
  Supabase Edge Function beside `scheduler-connector`. It takes a document id,
  finds the file the way `get_trip_document` does, and answers with a link
  signed for ten minutes. A public page cannot sign a link itself, because
  signing needs the bucket's read rule, which is the rule being removed. The
  document id stays the link's only secret, as today.
- **The driver share pages use the same function.** `get_driver_share_trips`
  returns each itinerary's file path; it returns the document id beside it,
  and the page asks `trip-document-link` for the link when the driver taps it,
  not when the page loads.
- **Staff pages sign their own links,** with `createSignedUrl` for ten minutes,
  under a new rule that lets staff read the bucket. That is the scheduler's
  Files tab and rux-ui's trip editor.
- **One migration, applied only after every page asks for signed links.**
  `trip_documents_private`: add `trip-documents staff read`, drop `Public read
  access`, and set the bucket's `public` to false. Shown to rux before it runs.
  Until it runs, both kinds of link work, so the pages can change first
  without breaking anything.
- **`docs/database-access.md` loses its exception** for `trip-documents` in the
  same commit as the migration.

## Questions

1. Close `driver-photos` too? Its 18 files are drivers' faces. The staff
   pages and rux-ui's driver page would sign links the same way.
2. Is ten minutes right? A link is used the moment it is made, so shorter is
   safer; a customer who keeps the file open is unaffected, but a copied file
   address stops working after that time.

## Tasks

- [ ] Write `trip-document-link` and test it on PGlite and a stand-in storage
      client, then show it to rux before it is deployed.
- [ ] Migration `driver_share_trips_document_id`: `get_driver_share_trips`
      returns each document's id beside its path. Shown to rux.
- [ ] `scheduler/share/document.js` and rux-ui's `doc.html` ask the function
      for the link instead of building the public address.
- [ ] rux-ui's `driver-share.js` asks the function when a document is tapped.
      The scheduler's driver page, from `site-lock.md`, does the same.
- [ ] The scheduler's Files tab and rux-ui's `trip-db.js` sign staff links.
- [ ] rux opens a document from each page on 8641 and from a real share link.
- [ ] Migration `trip_documents_private`, then check from outside that a
      public file address answers 400 and a signed link opens.
