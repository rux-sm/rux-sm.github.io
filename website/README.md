# Website

The company's public website, Escamilla Tour Buses, in English and Spanish,
served at **rux-sm.github.io/website/** as a preview beside the company's
current site. `docs/plans/company-website.md` is how it takes the company's
address once the manager approves it.

## What it is

Seven pages in each language, plain HTML with no build step:

| Page | English | Spanish |
| :--- | :--- | :--- |
| Home | `index.html` | `es/index.html` |
| Our buses | `buses.html` | `es/buses.html` |
| Trips | `services.html` | `es/services.html` |
| About us, with Drive with us | `about.html` | `es/about.html` |
| Contact, with common questions | `contact.html` | `es/contact.html` |
| Request a quote | `quote.html` | `es/quote.html` |
| Thank you | `thanks.html` | `es/thanks.html` |

Every page links its other language at the same place, in the header and the
footer, and names it in an `hreflang` link. A change to one language is made
to the other in the same commit.

## A preview, until it takes the address

- Every page asks search engines not to list it, with `robots` `noindex`.
- Every page opens with a notice that it is a preview, with the office's
  phone and email.
- The quote form checks what is typed and sends nothing: `app.js` opens the
  thank-you page, which says no request was sent.

## Public, with no log-in

The pages load no `/funnel.js` and no `account.js`, because a customer opens
them with no account; `tools/check.mjs` leaves `website/` out of the lock
rule. They link Design's sheets from `/design/` and the two scripts the
header's menu needs, and the FAQ loads Design's accordion.

## Its parts

- Every page is on Carbon's `g10` theme, a light grey page with its tiles
  and fields white on it. `theme.css` sets the company's blue, the deep end
  of the logo, as the action colour there and as the primary button's on the
  dark bands.
- `app.css` holds the parts Carbon has no component for, under `website-`:
  the bands, the hero, rows of tiles, features, photos, the calls to action,
  the form's pairs and headings, and the footer. Every page opens on a dark
  band, a `g100` zone from edge to edge, holding the preview notice and the
  heading; four close on a photo band holding the call to action; the footer
  is `g100` too.
- `overrides.css` narrows the page's inset on a phone, widens the quote
  form's text area, keeps a row's big numbers level, and lets a call to action
  fill a phone's width.
- `app.js` is the quote form: its checks and their words in both languages,
  the return that a one-way trip hides, and the draft kept in the tab's
  session storage until a request lands.
- `brand/` holds the logo, `icon.svg`, the app's tile, a browser window,
  `favicon.svg`, the company's bus, for a customer's tab, and `share.jpg`,
  the picture a shared link shows.
- `photos/` holds each photo as WebP at two widths, the larger and a
  `-small` copy at half its width, without their metadata. A photo shows
  whole, except a tall one beside words, cut to 4:3 from its foot.

## The facts on the pages

The fleet is the Scheduler's: the vehicle types, seats, lifts and sleeper
berths of the active units. The booking terms are `scheduler/docs/booking.md`'s.
The rest is the company's current site and how the office answers customers.
No customer, driver or trip is named, and no price is shown.

## Check it

    npm run check

runs Design's shared check over it with every other app, and the names
sweep. Open it on the cloud preview at http://localhost:8641/website/, at a
phone's width and a wide screen's, in both languages.
