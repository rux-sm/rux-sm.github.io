/* ==========================================================================
   Rux Scheduler — WHAT A FILE IS CALLED
   --------------------------------------------------------------------------
   One pattern for every file a trip has, uploaded or printed, loaded by the
   board and the forms page:

     <date>_<code>_<customer>_<trip number>[_<copy>].pdf
     2026-09-29_qte_utrgv-edinburg_100878.pdf
     2026-09-29_env_utrgv-edinburg_100878_raul.pdf

   The date is the trip's first day, so a folder sorts by trip, and the code
   is three letters saying what the document is. A form printed once per
   driver or per leg names that copy last. A file with no trip, the week
   schedule, is its date and code alone. rux-ui's `buildDocumentFileName`
   names its uploads the same way.

   Parts are lowercased, stripped of accents and joined inside with hyphens,
   as rux-ui's `documentFileSlug` does, so a name works in any folder and any
   mail program.
   ========================================================================== */
(() => {
  'use strict';

  // Every kind of file and its code. `doc` takes the typed name after it.
  const CODES = {
    quote: 'qte',
    itinerary: 'itn',
    'driver-itinerary': 'dit',
    envelope: 'env',
    'hours-of-service': 'hos',
    'week-schedule': 'wks',
    contract: 'ctr',
    'purchase-order': 'pur',
    invoice: 'inv',
    'hotel-confirmation': 'htl',
  };

  // An upload's stored label, as the Files tab and rux-ui write it, to its code.
  const LABEL_CODES = {
    itinerary: CODES.itinerary,
    contract: CODES.contract,
    po: CODES['purchase-order'],
    'purchase order': CODES['purchase-order'],
    invoice: CODES.invoice,
    'hotel confirmation': CODES['hotel-confirmation'],
  };

  const slug = (value, fallback) => String(value ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;

  // A label the list does not know is `doc` with the label after it.
  const codeForLabel = label => {
    const typed = String(label ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    return LABEL_CODES[typed] ?? `doc-${slug(label, 'file')}`;
  };

  const dated = value => (/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : 'unknown-date');

  /* A trip's file. `trip` needs `start_date`, `trip_ref` and `customer`, with
     the contact names behind the customer as rux-ui falls back to them; the id
     stands in for a trip with no number. `copy` is the driver or leg a form
     was printed for, or left out. */
  function forTrip(trip, code, copy) {
    const who = trip?.customer || trip?.booking_contact_name
      || trip?.trip_contact_1_name || trip?.trip_contact_2_name;
    const ref = trip?.trip_ref || String(trip?.id ?? '').slice(0, 8);
    const parts = [dated(trip?.start_date), code, slug(who, 'unnamed'), slug(ref, 'trip')];
    if (copy) parts.push(slug(copy, 'copy'));
    return `${parts.join('_')}.pdf`;
  }

  // An uploaded file of a trip, by the label it is stored under.
  const forUpload = (trip, label) => forTrip(trip, codeForLabel(label));

  // A file that belongs to a day rather than a trip.
  const forDay = (date, code) => `${dated(date)}_${code}.pdf`;

  // The name without `.pdf`, which is what a page's title holds for Save as PDF.
  const bare = name => name.replace(/\.pdf$/, '');

  window.SchedulerFileNames = { CODES, forTrip, forUpload, forDay, bare };
})();
