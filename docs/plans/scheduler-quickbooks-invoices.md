---
type: plan
---

# Plan: QuickBooks invoices from the scheduler

## Goal

Every trip says truly whether QuickBooks already has its estimate and its
invoice. The trips that have run and have no invoice go to QuickBooks in one
file the office imports, so no invoice is typed by hand and none is made twice.

## Decisions

- **QuickBooks Desktop for Mac has no way in but a file.** It has no API and
  no Web Connector, and every QuickBooks connector is for QuickBooks Online,
  so the scheduler reads QuickBooks' own report export and writes an IIF file.
- **An invoice posts to Accounts Receivable; a Bus Rental, Addt'l Driver or
  Hotel line to Gross Trucking Income; a Deductions line to Escamilla Tour
  Buses, LLC; and a Sales Tax line at zero,** as the office's own invoices
  do: 85 of its 87 discount lines in 2025 post to that account. An estimate
  posts to Estimates.
- **QuickBooks names a customer its own way,** UTRGV for UTRGV Edinburg and
  Mercedes Independent School District for Mercedes High School, and an IIF
  name it does not hold adds a new customer. So Export writes each trip under
  the name QuickBooks has, learned from that customer's matched invoices, and
  holds back a trip whose customer has none until rux names it.
- **Export writes a Bus Rental line from the quoted price where a trip has no
  quote lines,** one per leg on a split trip, as the printed quote does,
  because only 5 of the 312 trips that have run with no invoice have lines.
  Its description is the quote's, on one line, since an IIF field holds no
  line break.
- **What QuickBooks holds is matched first, before anything is exported.**
  Most trips that have run have no invoice recorded, so an export before matching would make duplicates of invoices
  QuickBooks already has: an IIF import only adds, and never finds or changes
  a transaction QuickBooks holds.
- **QuickBooks' list comes in as one report,** the Transaction Detail report
  of every estimate and invoice, saved as Excel or CSV, with Trans #, Type,
  Date, Num, Name, P.O. #, Memo, Item, Account and Amount. It is read in the
  browser and never committed, because the repository is public.
- **One scheduler page does both jobs,** `scheduler/quickbooks.html`: Match
  reads the report, and Export writes the IIF. Both are staff only, through the
  same sign-in as the board.
- **An estimate matches by its facts, as an invoice does.** QuickBooks
  numbers its estimates itself, five digits, never the trip's `trip_ref`, so
  a matched estimate marks the trip's `trip_prep.qb_estimate` and nothing more.
- **An invoice matches by its facts, scored.** A P.O. # equal to the trip's
  `po_ref` is near certain; then the trip's day written in a line, "on July
  4, 2026" or "12/25-26"; then the customer's name, folded so "P. S. J. A."
  is PSJA and a word a letter off is the same word; then the amount against
  `quoted_price` and `quote_sent_price`; then the invoice date, which is often
  weeks before the trip, because the office bills ahead. A trip can have a
  second invoice, a 2026 trip can be billed in late 2025, and one invoice can
  cover several trips of one customer, as a run of days for one group does.
- **The rule is proved on the invoices the office already recorded:** it finds
  73 of the 76, and the ones it places elsewhere are numbers typed onto the
  wrong trip, which the match lists for rux to correct.
- **A match the scores do not settle is rux's to pick,** never guessed: two
  trips of one customer close in date and price, or an invoice no trip fits.
  The page lists each with its candidates side by side, and with that
  customer's past invoices already matched, their usual amount and the gap
  between a trip and its invoice, so the pick goes by what was done before.
- **A match is saved on a yes,** as a `trip_invoices` row with the number,
  amount and date, and a `trip_history` line, the way the Billing tab's
  Invoices step saves one, so the bar menu and the Billing tab show it.
- **Export takes the trips that have run, are not cancelled and have no
  invoice,** each ticked or not by rux, and writes one IIF file: a TRNS line
  per invoice and an SPL line per quote line, with the items the Billing tab
  already names, Bus Rental, Addt'l Driver, Deductions and Hotel.
- **A file is imported once.** Mark imported records each invoice's number
  on its trip, so the next export cannot repeat it, and the page says the
  file was marked so a second import is caught before QuickBooks sees it.
- **The import is done in single-user mode, signed in as Admin, after a
  backup,** because QuickBooks greys out IIF import in a shared file and an
  import cannot be undone.

## Questions

- Should the export number the invoices from the next number QuickBooks will
  use, or leave Num empty for QuickBooks to fill? The office's numbers run one
  after another, 15729 the latest recorded.
- Where does a customer's QuickBooks name live: a `qb_name` column on
  `customers`, a migration rux applies, filled from the matched invoices?

## Tasks

- [ ] Pick the matches the scores left with rux on `scheduler/quickbooks.html`;
      the sure ones are saved, marked `QuickBooks match` in their history.
- [ ] Import the one-invoice IIF of trip 100991, numbered TEST1, into a backup
      company file, and settle from what QuickBooks makes of it the item and
      account of each line, the customer, the P.O. #, the description and its
      ñ, and the Bus # and REQ # fields.
- [ ] Record each customer's QuickBooks name from its matched invoices, once
      its home is settled.
- [ ] Build Export and Mark imported on the same page, with the page in
      `switcher.json`'s scheduler links if it needs one, and the inventories.
- [ ] Write `scheduler/docs/quickbooks.md`, the how-to for the weekly import:
      single-user, Admin, backup, import, Mark imported, share again.
