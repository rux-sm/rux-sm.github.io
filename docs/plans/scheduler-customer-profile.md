---
type: plan
---

# Plan: a customer's page as a profile

## Goal

A customer's page is the one place to see everything about that customer: who
books for it, its trips, what it has paid and owes, what it usually needs, and
the office's standing notes about it. Every trip still to come is linked to
its customer, so it shows there and asks for the customer's driver forms.

## Decisions

- **A trip is its customer's when `trips.customer_id` links it.** A trip
  saved before customers were linked has only the customer's name; those
  whose name was exactly a customer's are linked, and any other links when it
  is saved with a customer picked.
- **An unlinked trip is off its customer's Trips tab and money, and asks for
  no driver form,** so the trips still to come are linked first.
- **A group inside a customer is not part of its name,** as
  `scheduler-customers-and-locations.md` decided, so a name with a team or a
  grade after it links to the campus and does not become a customer.
- **rux-ui does not change.** A trip entered there does not start with the
  customer's usual needs.

## Questions

- 188 names on 395 trips match no customer, 35 of them on 55 trips still to
  come: the same place spelled several ways, or a group after its name. Which
  customer does each coming name belong to?

## Tasks

- [ ] Link the trips still to come whose name matches no customer, by SQL
      shown to rux, once each name has its customer.
