---
type: how-to
---

# The QuickBooks import

How the office's invoices go from the scheduler into QuickBooks Desktop for
Mac, and how what QuickBooks holds comes back. QuickBooks takes invoices in
only as an IIF file, and an import only adds: it never finds or changes an
invoice it already has, and it cannot be undone. So a file is imported once,
after a backup, and marked as soon as it is in.

## Before the first import

1. On the QuickBooks page, choose the Transaction Detail report (below, under
   The report), so the trips QuickBooks already invoiced are matched.
2. Press Save names under QuickBooks names. A customer with no QuickBooks name
   is held back from every export, because a name QuickBooks does not hold
   adds a new customer. One whose invoices no trip matched gets none; type
   it in the QuickBooks name field on its Customers page, exactly as
   QuickBooks spells it.

## Sending trips to the list

On the board, right-click a confirmed trip with no invoice and choose
Invoice, which shows Export beside it. The trip goes on the QuickBooks page's
list, last, and its Invoice shows In list, which opens the page at its row.
The list holds only the trips sent to it, in the order they were sent, which
is the order their invoices are numbered in; Remove on the page takes one off.

## Importing the list

1. Optionally, save QuickBooks' Transaction Detail report today and choose it
   on the QuickBooks page, then save the matches it lists under Invoices to
   pick. A trip on the list that QuickBooks has an invoice for is held back
   until that match is saved; Skip an invoice only when it is none of the
   trips listed, which lets them go.
2. A row held back says why: fix it on the trip or the customer, and it is
   numbered in its place again.
3. Check Next invoice number against QuickBooks' next, Customers, Create
   Invoices. It is kept for every computer and moves past each file marked
   imported; the report raises it to follow its last invoice. Type over it
   if QuickBooks says otherwise.
4. Press Export, which names how many invoices it writes. The browser saves
   `quickbooks-invoices_` and the day, `.iif`, or `quickbooks-invoice_` and
   the trip's number for one, each invoice numbered in turn.
5. In QuickBooks, have everyone else close the company file, sign in as Admin
   and switch to single-user mode. QuickBooks greys out IIF import in a shared
   file.
6. Back up the company file to this Mac.
7. Import the IIF file from QuickBooks' File menu, and look over the new
   invoices. Each names the office's template, Standard Service Invoice 1;
   one that opens on another, choose it in its Template menu before it is
   sent. Its Ship To, which the template titles Contact, is the trip's
   booking contact, and its FOB, titled Bus #, the trip's buses, because an
   import fills neither the template's Contact, Phone and Email, which are
   the customer's, nor its custom fields.
8. Back on the QuickBooks page, press Mark imported. Each trip gets its
   invoice with its number and leaves the list, so no export takes it again.
9. Switch QuickBooks back to multi-user mode.

## The report

In QuickBooks, Reports, Custom Reports, Transaction Detail, every estimate and
invoice, with Trans #, Type, Date, Num, Name, P.O. #, Memo, Item, Account and
Amount; save it as Excel or CSV and choose it on the QuickBooks page. It is
read in the browser and never uploaded. The match lists each invoice it
cannot settle to pick by hand, and fills in Next invoice number.
