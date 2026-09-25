---
type: how-to
---

# Booking a trip

How a sent quote becomes a confirmed trip, and what to tell the customer at
each step. Most often it answers "what are the next steps to secure the
reservation?"

The customer signs the printed quote's wording, which lives in `../print.js`:
`QUOTE_TERMS` on the quote and `AGREEMENT_POLICIES` on the Terms and Conditions
Agreement Form printed behind it. If this page and that wording ever disagree,
the signed wording wins and this page gets fixed. Prices and rates stay off this
page because the repository is public. `quote-calculator.md` covers pricing.

## 1. Send the quote

Print the customer quote from the trip on `print.html` and save it as a PDF.
The PDF is two sheets, the quote and the Terms and Conditions form. Always send
both.

When the customer asks for something to appear on the quote, type it as a line
under the first line item, so the copy they sign carries it:

- their bid, reference or P.O. request number
- a discount, as a line of its own
- a requirement they need in writing, such as an ADA-accessible bus with a
  driver trained on its wheelchair lift and securement

The email that goes with the quote says:

- The quote is held on the calendar for one week, and we extend the hold when
  asked.
- The trip is confirmed once we receive the **signed quote** and the **signed
  Terms and Conditions form**, plus a **20% down payment**. A school district can
  send a **purchase order** in place of the down payment.
- Full payment is due at least one week before departure. A school district
  with a P.O. is billed against the P.O.
- A credit card payment carries a 4% processing fee.
- Payments go to the office by mail or hand delivery, and P.O.s and signed forms
  can also be emailed. Nothing is ever handed to a driver.
- We need a detailed itinerary: departure and arrival times, every place
  visited, and a primary and an alternate contact, each with full name, cell
  phone and email.
- A school sends the final itinerary before the P.O., because the price can
  change with the itinerary.

## 2. Follow up

If the customer has not answered after the office's follow-up wait, the trip
shows under Needs follow-up on `trips.html`. Send a short check-in. It can say
that we price-match and can work with their budget.

## 3. When the customer says yes

Reply the same day with the next steps, in this order:

1. **Read the trip back.** Name the dates, the destination and the number of
   buses, and say they are still held. If the acceptance names a different city
   or date than the quote, ask which one is right. Requote if the change moves
   the miles.
2. **What we still need.** The signed quote and the signed Terms and Conditions
   form. If they never received the form, attach it again.
3. **The final itinerary,** with its two contacts. A school sends it before the
   P.O.
4. **The P.O. or the 20% down payment,** then full payment one week before
   departure.
5. **Driver hotel,** on an overnight trip. The customer provides the drivers' hotel room,
   separate from the passengers. Two drivers need at least one room with two
   separate beds, and a sofa bed does not count.
6. **Where to send it:** 2801 Zinnia Ave., McAllen, TX 78504, or email for the
   P.O. and forms, and (956) 994-1169 for questions.

When a customer asks for particular drivers, say we will do our best. Do not
promise anyone until dispatch has assigned them.

## 4. Record it on the trip

Record each piece as it arrives, on the trip editor's Billing tab: the contract
signed, the P.O. with its number and amount, or the deposit as a payment. The
tab shows when the trip counts as confirmed, which follows the office's billing
workflow in `../billing.js`.

On the trip itself:

- Mark the ADA lift need when the customer asked for an accessible bus, and
  assign a unit that has a lift.
- Turn on the hotel need only when the office books the drivers' room itself.
  It does not mean the trip is overnight. The bar menu's Mark hotel booked
  closes it.
- Attach the final itinerary when it comes in, and fill in the trip contacts
  from it.
