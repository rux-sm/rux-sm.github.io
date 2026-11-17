---
type: how-to
---

# The weekly QuickBooks import

How a week's invoices go from the scheduler into QuickBooks Desktop for Mac,
and how what QuickBooks holds comes back. QuickBooks takes invoices in only as
an IIF file, and an import only adds: it never finds or changes an invoice it
already has, and it cannot be undone. So a file is imported once, after a
backup, and marked as soon as it is in.

## Before the first import

1. On the QuickBooks page, choose the Transaction Detail report (below, under
   Bringing QuickBooks' numbers back), so the trips QuickBooks already
   invoiced are matched and no export makes them twice.
2. Press Save names under QuickBooks names. A customer with no QuickBooks name
   is held back from every export, because a name QuickBooks does not hold
   adds a new customer.

## Each week

1. On the QuickBooks page, under Invoices to import, go to the week with
   Previous week or Next week. A row held back says why: fix it on the trip or
   the customer, then come back to the week.
2. Press Export week. The browser saves `quickbooks-invoices_` and the week's
   first day, `.iif`.
3. In QuickBooks, have everyone else close the company file, sign in as Admin
   and switch to single-user mode. QuickBooks greys out IIF import in a shared
   file.
4. Back up the company file to this Mac.
5. Import the IIF file from QuickBooks' File menu, and look over the new
   invoices. QuickBooks numbers them.
6. Back on the QuickBooks page, press Mark imported. Each trip gets an invoice
   with no number, so no export takes it again.
7. Switch QuickBooks back to multi-user mode.

A customer who wants an invoice before the weekly run gets one from the trip
editor: Billing, the Quote heading's menu, Export to QuickBooks, then steps 3
to 5 and 7, with Mark imported on the toast and Save in place of step 6.

## Bringing QuickBooks' numbers back

In QuickBooks, Reports, Custom Reports, Transaction Detail, every estimate and
invoice, with Trans #, Type, Date, Num, Name, P.O. #, Memo, Item, Account and
Amount; save it as Excel or CSV and choose it on the QuickBooks page. It is
read in the browser and never uploaded. The match fills each imported
invoice's number, and lists what it cannot settle to pick by hand.
