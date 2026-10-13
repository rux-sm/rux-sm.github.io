---
type: plan
---

# Plan: finish the insurance certificates

## Goal

Whoever asks for proof of insurance gets it from the Documents page: a
certificate that names them or their district, every line on it in force, or
the general one where nobody need be named.

What is built is in `scheduler/docs/screen-inventory.md`, under Documents and
Customer page, and `scheduler/docs/database-inventory.md`.

## Decisions

- **A certificate is filed under the holder printed on it, and its customer
  is linked after.** A holder that is no customer, a lender or the state,
  stays unlinked and is found by search.
- **A district's certificate is linked to the district alone.** Its schools
  show it through Part of, so no certificate sits on a school it does not
  name.
- **A new copy replaces the old one by its holder's name,** so a reissue is
  uploaded under the name its row already has. Six holders share a printed
  name with another and carry a city or a bus after it, and a reissue for one
  of them is renamed to match before it is uploaded.
- **A file that holds many certificates is split one to a holder before it is
  uploaded,** and each holder's name is read from the page as a picture,
  because the form's own text comes out with letters missing.
- **The connector's deploy is `scheduler-documents.md`'s task,** and the
  Claude app finds a district's certificate by a school's name from then.

## Questions

Each is asked without a name, because this repository is public; the
Documents and Customers pages show which record it is.

- 167 of the 170 certificates show workers' compensation ending 09/20/2026,
  a day that has passed, and 103 customers have a trip still to come. Which
  holders need a new copy from the insurer: every customer with a trip to
  come, or only one that asks?
- 35 customers with a trip still to come show no certificate, their own or a
  district's. Should each get one now, or when it asks?
- Two customers are one school, at one address, each with a trip to come.
  Which row stays, so the school's certificate can be linked to it?
- One of the three newest certificates names a company that is no customer.
  Which customer is it, or is it a new one?
- Two links rest on a name alone: a certificate linked to a customer whose
  name is its holder's initials, and a middle school made part of a district
  with no address to confirm it. Is each right?
- Five schools are part of no district, because the name alone does not say
  which. Which district is each one's?
- Should a parish be part of the diocese, as a school is of its district? The
  diocese holds four certificates and several parishes are customers.
- Should a school ask for the driver forms its district asks for? A trip
  reads `customer_required_kinds` for its own customer only.
- Should a district's page list the customers that are part of it?
- Should a document be sent from the page, as a draft email with its file
  attached? It is opened, downloaded and attached by hand.

## Tasks

- [ ] Draft the email to the insurer in Missive, for rux to send, asking
      for a general certificate that names no vehicle, one for the district
      that has schools and no certificate, and the new copies the first two
      questions settle.
- [ ] Upload what the insurer sends, each file under its holder's name as
      its row has it, and the general one with no holder and no customer;
      read back that each made its holder's copy an old one and kept its
      customer.
- [ ] Link the school's certificate to the row that stays, and move the
      other row's trips and contacts to it by SQL shown to rux.
- [ ] Link the newest certificate that has no customer to the one the
      question names.
- [ ] Set Part of on the five schools, and put right either of the two links
      the answer says is wrong.
- [ ] Keep a row's end date and Edit in view on a phone where its holder's
      name is long, since the list scrolls sideways there, and check the
      upload form at 402 by 812 with several files chosen.
