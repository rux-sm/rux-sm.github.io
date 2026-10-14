---
type: plan
---

# Plan: the driver's page in Spanish

## Goal

A driver whose profile says Spanish opens their schedule link and reads every
word the page writes in Spanish: the greeting, the count of trips waiting,
the dates, Accept and Decline, what changed since they accepted, the contact
and crew labels, the itinerary and envelope buttons, and every error. A
driver whose profile says English sees the page as it is now.

## Decisions

- **The language is the driver's, set on their profile.** A Language field on
  the Drivers page's Details tab, English or Español, English for every
  driver until the office changes it. History records the change as it does
  every other field.
- **It is one column, `drivers.language`,** text, `en` or `es`, not null,
  default `en`, applied as a named migration on rux's yes. The page reads it
  through `get_driver_schedule_share`, the token-checked function it already
  calls first, which then returns it with the driver; nothing else about who
  can read a driver changes.
- **Only what the page writes is translated.** What the office typed stays as
  typed: the destination, the customer, the stops' names, a driver's
  instructions, the itinerary file. A bus number, a phone number and a name
  are the same in both.
- **Dates and times are written the Spanish way,** by the browser's own
  `es-MX` formatting: "sáb 17 de oct", times as the office writes them.
- **The wording lives in one table per language in `share/driver.js`,**
  keyed by what each line says, and a check fails when a key is in one
  language and not the other, so a line added in English cannot ship
  untranslated.
- **The staff preview, `driver-view.html`, shows the page in the driver's
  language,** so the office sees what the driver sees.
- **The page speaks to the driver as *tú*,** as the office talks to its
  drivers: "Tienes 1 viaje por responder".
- **The texts the office sends a Spanish driver are in Spanish too:** the
  Driver week info message and the Contacts window's reminder, both written
  by `driver-text.js`, which takes the driver's language with the leg. The
  board and the Driver week info page read `drivers.language` with the rest of
  the driver.
- **The envelope and every other printed form stay in English,** as
  paperwork an inspector, a customer or the office may read.
- **rux reads the Spanish before any driver is set to it.**
- **A driver can switch the page to the other language,** an English and
  Español switch on the page remembered on their phone alone; their profile
  sets where the page starts, and only the office changes the profile.

## Questions

- None open.

## Tasks

- [ ] Show rux the migration that adds `drivers.language` and returns it from
      `get_driver_schedule_share`, and apply it on rux's yes.
- [ ] Add the Language field to the Drivers page's Details tab, saved and
      recorded in History like the other fields.
- [ ] Gather every line `share/driver.js` and `share/driver.html` write into
      the English table, then write the Spanish table beside it.
- [ ] Write the page's dates and times through `es-MX` for a Spanish driver.
- [ ] Add the check that the two tables hold the same keys to the
      scheduler's rules in `npm run check`.
- [ ] Show the staff preview in the driver's language.
- [ ] Add the English and Español switch to the page, remembered on the phone,
      starting from the profile's language.
- [ ] Write `driver-text.js`'s week info message and reminder in Spanish for a
      Spanish driver, and pass the driver's language in from the board's
      Contacts window and the Driver week info page.
- [ ] Record the column in `scheduler/docs/database-inventory.md` and the
      page's language in `scheduler/docs/screen-inventory.md`.
- [ ] Open a Spanish driver's link at phone width in Chrome on :8641 and read
      every state: a trip to answer, an accepted one, one changed since, none
      waiting, and a link that has run out.
