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
   The report), so the trips QuickBooks already invoiced are matched and no
   export makes them twice.
2. Press Save names under QuickBooks names. A customer with no QuickBooks name
   is held back from every export, because a name QuickBooks does not hold
   adds a new customer. One whose invoices no trip matched gets none; type
   it in the QuickBooks name field on its Customers page, exactly as
   QuickBooks spells it.

## Each week

1. Save QuickBooks' Transaction Detail report today and choose it on the
   QuickBooks page. Export waits for it.
2. Save the matches it lists under Invoices to pick. A trip QuickBooks has an
   invoice for, not saved on the trip, is held back until it is; Skip an
   invoice only when it is none of the trips listed, which lets them go.
3. Under Invoices to import, go to the week with Previous week or Next week.
   A row held back says why: fix it on the trip or the customer, then come
   back to the week.
4. Check Next invoice number against QuickBooks' next, Customers, Create
   Invoices. The report fills it in from its last invoice, which misses any
   made since it was saved.
5. Press Export week. The browser saves `quickbooks-invoices_` and the week's
   first day, `.iif`, each invoice numbered in turn from Next invoice number.
6. In QuickBooks, have everyone else close the company file, sign in as Admin
   and switch to single-user mode. QuickBooks greys out IIF import in a shared
   file.
7. Back up the company file to this Mac.
8. Import the IIF file from QuickBooks' File menu, and look over the new
   invoices. Each names the office's template, Standard Service Invoice 1;
   one that opens on another, choose it in its Template menu before it is
   sent. Its Bill To ends on the trip's booking contact, an
   Attn line and the email, because the template's Contact, Phone and Email
   are the customer's in QuickBooks, the same on every invoice. Its
   Estimate # is the trip's number, from the file's FOB column.
9. Back on the QuickBooks page, press Mark imported. Each trip gets its
   invoice with its number, so no export takes it again.
10. Switch QuickBooks back to multi-user mode.

A customer who wants an invoice before the weekly run gets one from its row's
Export under Invoices to import, then steps 6 to 10. The trip's bar menu on the
board, Export invoice…, opens the page at that row.

## The report

In QuickBooks, Reports, Custom Reports, Transaction Detail, every estimate and
invoice, with Trans #, Type, Date, Num, Name, P.O. #, Memo, Item, Account and
Amount; save it as Excel or CSV and choose it on the QuickBooks page. It is
read in the browser and never uploaded. The match lists each invoice it
cannot settle to pick by hand, and fills in Next invoice number.
