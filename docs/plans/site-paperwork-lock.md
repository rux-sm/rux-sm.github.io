---
type: plan
---

# Plan: Trip paperwork and driver photos open only through a short-lived link

## Goal

Close the `trip-documents` and `driver-photos` buckets, so a trip's paperwork
and a driver's face can no longer be read by anyone who has, or guesses, the
file's address. Every page that shows one asks for a link that stops working
after ten minutes: the two document share pages, the driver share pages, each
app's Files tab, and the pages that show a driver's photo.

## Decisions

- **`trip-documents` and `driver-photos` close; `profile-photos` stays
  public.** The first holds the 214 files of paperwork and the second 18
  drivers' faces; staff's own faces in the header are not in scope.
- **A link lasts ten minutes,** because a page asks for one the moment it shows
  the file; an open file is unaffected, and a copied address stops working.
- **One server function makes the public links,** `trip-document-link`, a
  Supabase Edge Function beside `scheduler-connector`. It takes a document id,
  finds the file the way `get_trip_document` does, and answers with a link
  signed for ten minutes. A public page cannot sign a link itself, because
  signing needs the bucket's read rule, which is the rule being removed. The
  document id stays the link's only secret, as today.
- **The driver share pages use the same function.** `get_driver_share_trips`
  already returns each document's id beside its path, so the page asks
  `trip-document-link` for the link when the driver taps it, not when the page
  loads.
- **Staff pages sign their own links,** with `createSignedUrl` for ten minutes,
  under a new rule that lets staff read each bucket. That is the scheduler's
  Files tab and rux-ui's trip editor for paperwork, and the scheduler's Drivers
  page and rux-ui's driver panel and roster for photos. No link page shows a
  driver's photo, so photos need no server function.
- **A photo is drawn once its link arrives.** rux-ui's `getDriverPhotoUrl`
  returns an address at once today; signing takes a request, so the panel and
  the roster show the initials until the photo's link comes back.
- **One migration, applied only after every page asks for signed links.**
  `trip_documents_and_driver_photos_private`: for each bucket, add a staff
  read rule, drop its public read rule, and set its `public` to false. Shown
  to rux before it runs.
  Until it runs, both kinds of link work, so the pages can change first
  without breaking anything.
- **`docs/database-access.md` loses its exception** for both buckets in the
  same commit as the migration.

## Questions

None open.

## Tasks

- [ ] Migration `trip_documents_and_driver_photos_private`, then check from
      outside that a public file address answers 400 in each bucket and a
      signed link opens.
