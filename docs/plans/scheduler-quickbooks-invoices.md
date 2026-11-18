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
- **QuickBooks names a customer its own way,** University of Texas R.G.V. for UTRGV Edinburg and
  Mercedes Independent School District for Mercedes High School, and an IIF
  name it does not hold adds a new customer. So Export writes each trip under
  the name QuickBooks already has, never a new one, and holds back a trip
  whose customer has none until rux names it.
- **A customer's QuickBooks name is the `qb_name` column on `customers`,**
  because the report is read in the browser and kept
  nowhere. The QuickBooks page fills it from the names on that customer's
  matched invoices, and where they carry more than one, the name with the
  most invoices.
- **Export writes a Bus Rental line from the quoted price where a trip has no
  quote lines,** one per leg on a split trip, as the printed quote does,
  because only 5 of the 312 trips that have run with no invoice have lines.
  Its description is the quote's lines joined into one, which the printed
  invoice wraps, since an IIF field holds no line break, a description-only
  line prints 0.00, and QuickBooks keeps only the first 99 characters of an
  imported line's description.
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
- **Export is on the QuickBooks page alone, and waits for the report chosen
  there,** because only the report knows which trips QuickBooks has invoiced:
  a trip one of its invoices fits, not yet saved on the trip, is held back
  until that match is saved, as trip 100991 was billed twice without it.
  It writes a TRNS line per invoice and an SPL line per quote line, with the
  items the Billing tab already names, Bus Rental, Addt'l Driver, Deductions
  and Hotel. Export week takes every confirmed, not-cancelled trip with no
  invoice whose first day is in the one week chosen there, never more, so a
  forgotten earlier trip cannot slip in, and a row's Export takes that trip
  alone, for a customer who asks before the weekly run. The week starts on
  the board's own first day and opens on the current week.
- **The file numbers the invoices,** from a Next invoice number the report
  fills in as QuickBooks' last plus one and the office checks, because an
  import leaves Num empty. It writes Bill To too, the QuickBooks name over
  the customer's `bill_to`, since an import fills in nothing from the
  customer.
- **The file names the office's template, Standard Service Invoice 1,**
  because QuickBooks for Mac has no default template: Create Invoice and an
  import both open on the plain Standard Service Invoice.
- **The file is in Mac Roman,** the code page QuickBooks for Mac reads an IIF
  in, which turned a Windows-1252 ñ into Ò.
- **A file is imported once.** Mark imported saves each trip's invoice with
  its number, so no export takes it again, and the page says the file was
  marked so a second import is caught before QuickBooks sees it.
- **An IIF line holds no item QuickBooks lacks,** so a trip with an Other
  line is held back like one whose customer has no QuickBooks name.
- **The import is done in single-user mode, signed in as Admin, after a
  backup,** because QuickBooks greys out IIF import in a shared file and an
  import cannot be undone.

## Questions

- Only 7 customers have a `bill_to`, so most invoices' Bill To is the
  QuickBooks name alone. Should the QuickBooks page read the addresses from
  QuickBooks' Customer Contact List, as it reads the Transaction Detail
  report?

## Tasks

- [ ] Pick the matches the scores left with rux on `scheduler/quickbooks.html`;
      the sure ones are saved, marked `QuickBooks match` in their history.
- [ ] Import one trip's file into a copy of the company file restored under
      another name, and settle from what QuickBooks makes of it the number,
      the Bill To, a description's later lines as lines with no item, an ñ,
      the template, and the Bus # field; correct `scheduler/quickbooks-iif.js` to match.
