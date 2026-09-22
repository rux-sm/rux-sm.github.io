---
type: plan
---

# Plan: organizations as records of their own

## Goal

An organization is a row, not a typed name. Contacts belong to it, a trip
names it, and its address prints on a quote without being typed again.

## Decisions

- **An organization is a name and an address. Nothing else.** The name is
  spelled as QuickBooks spells it, because that is what an export matches on
  and a second spelling makes a second customer there rather than an error.
- **The address belongs to the organization, not the contact.** Thirty-four
  organizations already have more than one contact and one has nine, so an
  address on the contact is the same address stored nine times, free to drift.
- **Districts and campuses are both organizations, side by side,** with no
  parent between them. A contact may belong to several, and the trip editor
  offers that contact's organizations to choose from.
- **Choosing a contact fills the organization; choosing an organization does
  not fill the contact.** An organization has many contacts and none of them
  is the obvious one. A contact in several organizations fills nothing and
  offers its list instead.
- **The list is built from `contacts.client`, not invented.** That column is
  what an organization is today: 204 of 250 contacts carry one, spelling 140
  distinct names.
- **`trips.customer` stays and keeps being written,** so rux-ui goes on
  working unchanged. It also carries what the organization alone cannot: the
  group inside it, as in "(4th grade)" or "(Formula 1)".
- **The backfill follows the booking contact where there is one.** On the 370
  trips that have both, the typed customer already agrees with that contact's
  organization 347 times, so the link is safe to derive.
- **The 23 that disagree are left for a person.** They are spellings
  ("St Joan of Arc" for "St. Joan of Arc"), short names ("Memorial High
  School" for "McAllen Memorial High School"), a group in brackets, and a few
  that name a different campus or district altogether. No rule separates the
  last kind from the first, so each is settled when its trip is next opened.
- **Both apps edit it.** rux-ui's customers dialog first, because it exists
  and addresses can be entered before anything else is built; the scheduler's
  Customers page when that page arrives.

## Questions

- 457 trips name a customer with no contact linked at all — more than half of
  them. Link each to the organization whose name matches the typed text
  exactly, and leave the rest blank? Or leave all 457 blank until someone
  opens the trip?
- A contact who books for several campuses, as one does for three PSJA
  campuses, has to be linked to each before the choice can be offered. Does
  that linking happen as the trips are opened, or in one pass over the
  customers list first?

## Tasks

- [ ] rux answers the questions above.
